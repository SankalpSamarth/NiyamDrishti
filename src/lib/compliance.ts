import type { Finding, FindingStatus, InspectionStatus, OCRBlock, ProductDetails, Severity } from '../types'

interface RuleInput {
  details: ProductDetails
  text: string
  blocks: OCRBlock[]
}

interface RuleDefinition {
  id: string
  title: string
  field: string
  severity: Severity
  requirement: string
  citation: string
  applicable?: (input: RuleInput) => boolean
  evaluate: (input: RuleInput) => Omit<Finding, 'id' | 'ruleId' | 'title' | 'field' | 'severity' | 'requirement' | 'citation'>
}

const present = (input: RuleInput, expression: RegExp, observed: string): Omit<Finding, 'id' | 'ruleId' | 'title' | 'field' | 'severity' | 'requirement' | 'citation'> => {
  const match = input.text.match(expression)
  const block = input.blocks.find((item) => expression.test(item.text))
  expression.lastIndex = 0
  return {
    status: match ? (block && block.confidence < 65 ? 'review' : 'pass') : 'violation',
    observed: match?.[0]?.trim() || observed,
    explanation: match ? (block && block.confidence < 65 ? 'OCR confidence is low for this declaration. Verify the source photograph before deciding.' : 'A declaration text pattern was detected. Confirm its correctness and completeness against the photograph.') : 'The declaration was not detected in the supplied text. Inspect all package surfaces and check for OCR omissions before confirming a violation.',
    confidence: block ? Math.max(0, Math.min(1, block.confidence / 100)) : undefined,
    surface: block?.surface,
    box: block?.box,
  }
}

const rules: RuleDefinition[] = [
  {
    id: 'LMPC-6(1)(a)', title: 'Manufacturer / packer identity', field: 'manufacturer', severity: 'critical',
    requirement: 'Name and address of the manufacturer or packer must be declared.', citation: 'Rule 6(1)(a)',
    evaluate: (input) => present(input, /(manufactured|packed|marketed)\s+by\s*:?\s*[^\n]{4,}/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(1)(a)-IMP', title: 'Importer identity', field: 'importer', severity: 'critical',
    requirement: 'Imported retail packages must declare the importer name and address.', citation: 'Rule 6(1)(a)',
    applicable: ({ details }) => details.origin === 'Imported',
    evaluate: (input) => present(input, /imported\s+by\s*:?\s*[^\n]{4,}/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(1)(aa)', title: 'Country of origin', field: 'country_of_origin', severity: 'major',
    requirement: 'The country of origin or manufacture must be declared for imported products.', citation: 'Rule 6(1)(aa)',
    applicable: ({ details }) => details.origin === 'Imported',
    evaluate: (input) => present(input, /(country\s+of\s+origin|made\s+in|product\s+of)[:\s]+[a-z ]{3,}/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(1)(b)', title: 'Common or generic name', field: 'commodity_name', severity: 'major',
    requirement: 'The common or generic name of the commodity must be stated.', citation: 'Rule 6(1)(b)',
    evaluate: (input) => present(input, /(shampoo|cleaner|biscuits?|chocolate|soap|detergent|cable|charger|oil|cream|lotion|beverage)/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(1)(c)', title: 'Net quantity', field: 'net_quantity', severity: 'critical',
    requirement: 'Net quantity must be declared using an appropriate unit.', citation: 'Rule 6(1)(c)',
    evaluate: (input) => present(input, /(net\s*(quantity|qty)[:\s]*)?\b\d+(?:\.\d+)?\s*(kg|g|mg|l|ml|m|cm|pieces?|pcs|n)\b/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(1)(d)', title: 'Month and year declaration', field: 'month_year', severity: 'major',
    requirement: 'Month and year of manufacture, packing or import must be declared where applicable.', citation: 'Rule 6(1)(d)',
    evaluate: (input) => present(input, /(mfd|mfg|manufactured|packed|imported)\s*(on|in|date)?[:\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})[a-z]*[\s\/-]+(20)?\d{2}/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(1)(e)', title: 'Maximum retail price', field: 'mrp', severity: 'critical',
    requirement: 'Retail sale price must be declared on the package.', citation: 'Rule 6(1)(e)',
    evaluate: (input) => present(input, /(mrp|maximum\s+retail\s+price|retail\s+sale\s+price)[^\n\d₹]{0,18}(₹|rs\.?\s*)?\d+(?:\.\d{1,2})?/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(1)(e)-TAX', title: 'MRP tax wording', field: 'mrp_tax', severity: 'major',
    requirement: 'The retail sale price declaration must communicate inclusion of applicable taxes.', citation: 'Rule 6(1)(e)',
    evaluate: (input) => present(input, /(inclusive\s+of\s+(all\s+)?tax(es)?|incl\.?\s*(of\s+)?(all\s+)?tax(es)?)/i, 'Tax-inclusive wording not detected'),
  },
  {
    id: 'LMPC-6(2)', title: 'Consumer telephone', field: 'consumer_phone', severity: 'major',
    requirement: 'Consumer complaint contact information must be provided.', citation: 'Rule 6(2)',
    evaluate: (input) => present(input, /(consumer|customer|complaint)[^\n]{0,45}(\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}|1800[\s-]?\d{3}[\s-]?\d{3,4}/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(2)-EMAIL', title: 'Consumer email', field: 'consumer_email', severity: 'major',
    requirement: 'An electronic mail address must be available for consumer complaints.', citation: 'Rule 6(2)',
    evaluate: (input) => present(input, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, 'Not detected'),
  },
  {
    id: 'LMPC-6(11)', title: 'Unit sale price', field: 'unit_sale_price', severity: 'major',
    requirement: 'Unit sale price must be declared when applicable.', citation: 'Rule 6(11)',
    applicable: ({ details }) => details.packageType !== 'Group / combination',
    evaluate: (input) => {
      const expression = /unit\s+(sale\s+)?price[^\n\d]{0,8}(\d+(?:\.\d{1,2})?)\s*\/(g|kg|ml|l|m|cm|piece|pc)/i
      const result = present(input, expression, 'Not detected')
      if (result.status !== 'pass') return result

      const declared = input.text.match(expression)
      const mrp = input.text.match(/(?:mrp|maximum\s+retail\s+price|retail\s+sale\s+price)[^\n\d]{0,18}(\d+(?:\.\d{1,2})?)/i)
      const quantity = input.text.match(/(?:net\s*(?:quantity|qty)[:\s]*)?(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/i)
      if (!declared || !mrp || !quantity) return result

      const declaredPrice = Number(declared[2])
      const denominator = declared[3].toLowerCase()
      const netAmount = Number(quantity[1])
      const netUnit = quantity[2].toLowerCase()
      const conversions: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000 }
      const sameFamily = (['g', 'kg'].includes(netUnit) && ['g', 'kg'].includes(denominator)) || (['ml', 'l'].includes(netUnit) && ['ml', 'l'].includes(denominator))
      if (!sameFamily) return result

      const quantityInBaseUnits = netAmount * conversions[netUnit]
      const denominatorInBaseUnits = conversions[denominator]
      const expected = Number((Number(mrp[1]) / (quantityInBaseUnits / denominatorInBaseUnits)).toFixed(2))
      if (Math.abs(declaredPrice - expected) <= 0.01) return result

      return {
        ...result,
        status: 'violation',
        observed: `Declared ₹${declaredPrice.toFixed(2)}/${denominator}; calculated ₹${expected.toFixed(2)}/${denominator}`,
        explanation: 'The declared unit sale price does not agree with MRP divided by the declared net quantity. Officer verification is required.',
      }
    },
  },
  {
    id: 'LMPC-R7-TABLE-I', title: 'Minimum character height', field: 'font_size', severity: 'major',
    requirement: 'Character height is selected from Table I using principal display panel area and whether the declaration is printed or moulded.', citation: 'Rule 7 and Table I',
    evaluate: ({ details }) => {
      if (!details.calibrationDetected || !details.estimatedFontMm || !details.principalDisplayAreaCm2) {
        return {
          status: 'review', observed: 'Panel area or calibrated character measurement not supplied',
          explanation: 'Rule 7 cannot be checked from pixels alone. Supply principal display panel area and a scale-assisted character height, otherwise an officer must measure it.',
        }
      }
      const area = details.principalDisplayAreaCm2
      const printedThreshold = area <= 50 ? 1 : area <= 100 ? 1.5 : area <= 500 ? 2.5 : area <= 2500 ? 4 : 6
      const moldedThreshold = area <= 50 ? 1.5 : area <= 100 ? 3 : area <= 500 ? 4 : 6
      const threshold = details.moldedDeclaration ? moldedThreshold : printedThreshold
      const pass = details.estimatedFontMm >= threshold
      return {
        status: pass ? 'pass' : 'violation', observed: `${details.estimatedFontMm.toFixed(1)} ± 0.2 mm`,
        explanation: pass
          ? `The estimate meets the ${threshold.toFixed(1)} mm Table I threshold for a ${area} cm² panel (${details.moldedDeclaration ? 'moulded' : 'printed'} declaration).`
          : `The estimate is below the ${threshold.toFixed(1)} mm Table I threshold for a ${area} cm² panel (${details.moldedDeclaration ? 'moulded' : 'printed'} declaration). Officer measurement is still required.`,
      }
    },
  },
]

export function runCompliance(details: ProductDetails, text: string, blocks: OCRBlock[] = []): Finding[] {
  const input = { details, text: text.replace(/\r/g, ''), blocks }
  return rules
    .filter((rule) => rule.applicable?.(input) ?? true)
    .map((rule, index) => ({
      id: `finding-${Date.now()}-${index}`,
      ruleId: rule.id,
      title: rule.title,
      field: rule.field,
      severity: rule.severity,
      requirement: rule.requirement,
      citation: rule.citation,
      ...rule.evaluate(input),
    }))
}

export function effectiveStatus(finding: Finding): FindingStatus {
  return finding.officerDecision ?? finding.status
}

export function calculateScore(findings: Finding[]): number {
  if (!findings.length) return 0
  const weights: Record<Severity, number> = { critical: 12, major: 8, minor: 4, info: 1 }
  const possible = findings.reduce((total, finding) => total + weights[finding.severity], 0)
  const lost = findings.reduce((total, finding) => {
    const status = effectiveStatus(finding)
    return total + (status === 'violation' ? weights[finding.severity] : status === 'review' ? weights[finding.severity] * 0.35 : 0)
  }, 0)
  return Math.max(0, Math.round(100 - (lost / possible) * 100))
}

export function calculateStatus(findings: Finding[]): InspectionStatus {
  if (findings.some((finding) => effectiveStatus(finding) === 'violation')) return 'Potential violation'
  if (findings.some((finding) => effectiveStatus(finding) === 'review')) return 'Needs review'
  return 'Compliant'
}

export function getRuleCatalog() {
  return rules.map(({ evaluate: _evaluate, applicable: _applicable, ...rule }) => rule)
}
