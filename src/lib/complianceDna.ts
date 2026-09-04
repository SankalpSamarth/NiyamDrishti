import { effectiveStatus } from './compliance'
import type {
  ComplianceDnaResult, DeclarationDrift, DeclarationKey, Inspection, ProductSighting, RepeatedViolation,
} from '../types'

const labels: Record<DeclarationKey, string> = {
  mrp: 'Maximum retail price',
  net_quantity: 'Net quantity',
  unit_sale_price: 'Unit sale price',
  consumer_email: 'Consumer email',
  importer: 'Importer identity',
}

const fieldRules: Record<string, { label: string; ruleId: string }> = {
  consumer_email: { label: 'Consumer email missing', ruleId: 'LMPC-6(2)-EMAIL' },
  unit_sale_price: { label: 'Incorrect unit sale price', ruleId: 'LMPC-6(11)' },
  importer: { label: 'Importer identity missing', ruleId: 'LMPC-6(1)(a)-IMP' },
  mrp: { label: 'MRP declaration issue', ruleId: 'LMPC-6(1)(e)' },
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function tokenSimilarity(left: string, right: string) {
  const a = new Set(normalize(left).split(' ').filter(Boolean))
  const b = new Set(normalize(right).split(' ').filter(Boolean))
  if (!a.size || !b.size) return 0
  const intersection = [...a].filter((token) => b.has(token)).length
  return intersection / new Set([...a, ...b]).size
}

function firstMatch(text: string, expression: RegExp) {
  return text.match(expression)?.[1]?.trim()
}

export function extractDeclarations(text: string): Partial<Record<DeclarationKey, string>> {
  return {
    mrp: firstMatch(text, /(?:mrp|maximum\s+retail\s+price|retail\s+sale\s+price)[^\n\d₹]{0,18}((?:₹|rs\.?\s*)?\d+(?:\.\d{1,2})?)/i),
    net_quantity: firstMatch(text, /(?:net\s*(?:quantity|qty)[:\s]*)?(\d+(?:\.\d+)?\s*(?:kg|g|mg|l|ml|m|cm|pieces?|pcs|n))\b/i),
    unit_sale_price: firstMatch(text, /unit\s+(?:sale\s+)?price[^\n\d₹]{0,8}((?:₹|rs\.?\s*)?\d+(?:\.\d{1,2})?\s*\/(?:g|kg|ml|l|m|cm|piece|pc))/i),
    consumer_email: firstMatch(text, /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i),
    importer: firstMatch(text, /imported\s+by[:\s]+([^\n]{4,})/i),
  }
}

function matchesInspection(inspection: Inspection, sighting: ProductSighting) {
  const currentBarcode = inspection.details.barcode.trim()
  if (currentBarcode && currentBarcode === sighting.barcode) return { matches: true, score: 0.98, basis: 'Exact barcode + brand identity' }

  const nameScore = tokenSimilarity(inspection.details.name, sighting.productName)
  const brandMatch = normalize(inspection.details.brand) === normalize(sighting.brand)
  const score = nameScore * 0.72 + (brandMatch ? 0.22 : 0)
  return { matches: score >= 0.62, score, basis: 'Brand + product-name similarity' }
}

function normalizeDeclaration(value?: string) {
  return normalize(value ?? '').replace(/rs/g, '').replace(/inr/g, '')
}

function buildDrifts(current: Partial<Record<DeclarationKey, string>>, sightings: ProductSighting[]) {
  const drifts: DeclarationDrift[] = []

  for (const sighting of sightings) {
    for (const key of Object.keys(labels) as DeclarationKey[]) {
      const currentValue = current[key]
      const observedValue = sighting.declarations[key]
      if (!currentValue && !observedValue) continue
      if (normalizeDeclaration(currentValue) === normalizeDeclaration(observedValue)) continue

      const missing = !currentValue || !observedValue
      const severity = key === 'mrp' ? 'critical' : key === 'consumer_email' || key === 'unit_sale_price' ? 'major' : 'info'
      const explanation = key === 'mrp'
        ? 'The same barcode carries a different price declaration across channels or label versions.'
        : missing
          ? 'This declaration is present in only one of the matched product records.'
          : 'The declaration changed between matched records and should be verified.'

      drifts.push({
        field: key,
        label: labels[key],
        currentValue: currentValue ?? 'Not detected',
        observedValue: observedValue ?? 'Not detected',
        sightingId: sighting.id,
        source: sighting.source,
        severity,
        explanation,
      })
    }
  }

  return drifts
}

function buildRepeatedViolations(inspection: Inspection, sightings: ProductSighting[]): RepeatedViolation[] {
  const counts = new Map<string, number>()
  inspection.findings
    .filter((finding) => effectiveStatus(finding) === 'violation')
    .forEach((finding) => counts.set(finding.field, (counts.get(finding.field) ?? 0) + 1))
  sightings.forEach((sighting) => sighting.violationFields.forEach((field) => counts.set(field, (counts.get(field) ?? 0) + 1)))

  return [...counts.entries()]
    .filter(([, occurrences]) => occurrences >= 2)
    .map(([field, occurrences]) => ({
      field,
      label: fieldRules[field]?.label ?? `${field.replace(/_/g, ' ')} repeated`,
      ruleId: fieldRules[field]?.ruleId ?? 'Officer review',
      occurrences,
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
}

function fingerprintFor(inspection: Inspection) {
  const source = inspection.details.barcode || `${inspection.details.brand}-${inspection.details.name}`
  let hash = 0
  for (const character of source) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  const code = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
  return `ND-${code.slice(0, 4)}-${code.slice(4, 8)}`
}

export function analyzeComplianceDna(inspection: Inspection, repository: ProductSighting[]): ComplianceDnaResult {
  const matches = repository
    .map((sighting) => ({ sighting, match: matchesInspection(inspection, sighting) }))
    .filter(({ match }) => match.matches)
    .sort((a, b) => b.match.score - a.match.score)

  const sightings = matches.map(({ sighting }) => sighting)
  const current = extractDeclarations(inspection.ocrText)
  const drifts = buildDrifts(current, sightings)
  const repeatedViolations = buildRepeatedViolations(inspection, sightings)
  const affectedLocations = new Set([inspection.details.location, ...sightings.map((sighting) => sighting.location)]).size
  const risk = repeatedViolations.length >= 2 || drifts.some((drift) => drift.severity === 'critical') ? 'High'
    : repeatedViolations.length || drifts.length ? 'Medium' : 'Low'

  return {
    fingerprint: fingerprintFor(inspection),
    confidence: matches.length ? Math.max(...matches.map(({ match }) => match.score)) : 0,
    matchBasis: matches[0]?.match.basis ?? 'No reliable identity match',
    sightings,
    drifts,
    repeatedViolations,
    affectedLocations,
    risk,
    recommendation: risk === 'High'
      ? 'Prioritize a cross-channel verification. Preserve the listing and package evidence, then inspect the repeated seller or distributor trail.'
      : risk === 'Medium'
        ? 'Review the matched records before closing this inspection.'
        : 'No linked compliance pattern detected. Continue routine monitoring.',
  }
}
