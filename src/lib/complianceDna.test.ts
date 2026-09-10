import { describe, expect, it } from 'vitest'
import { productSightings } from '../data/dna'
import { demoDetails, demoText } from '../data/seed'
import { runCompliance } from './compliance'
import { analyzeComplianceDna, buildDnaRepository, extractDeclarations } from './complianceDna'
import type { Inspection } from '../types'

const inspection: Inspection = {
  id: 'test-inspection',
  details: demoDetails,
  inspector: 'Test inspector',
  createdAt: '2026-09-04T00:00:00.000Z',
  status: 'Potential violation',
  score: 70,
  findings: runCompliance(demoDetails, demoText),
  images: [],
  ocrText: demoText,
  ocrBlocks: [],
  source: 'seed',
}

describe('Compliance DNA', () => {
  it('links a new saved inspection and excludes itself', () => {
    const previous = { ...inspection, id: 'previous', source: 'created' as const, ocrText: demoText.replace('₹299', '₹349') }
    const repo = buildDnaRepository([inspection, previous], [], inspection.id)
    expect(repo).toHaveLength(1)
    expect(repo[0].provenance).toBe('local')
    expect(analyzeComplianceDna(inspection, repo).drifts.some((item) => item.field === 'mrp')).toBe(true)
  })

  it('does not merge two known conflicting barcodes even when product names match', () => {
    const other = { ...productSightings[0], barcode: '9999999999999', productName: demoDetails.name, brand: demoDetails.brand }
    expect(analyzeComplianceDna(inspection, [other]).sightings).toHaveLength(0)
  })

  it('does not flag equivalent currency formatting or quantity units as drift', () => {
    const equivalent = { ...productSightings[0], declarations: { ...extractDeclarations(demoText), mrp: 'Rs. 299.00', net_quantity: '0.5 l', unit_sale_price: 'Rs. 0.70/ml' } }
    expect(analyzeComplianceDna(inspection, [equivalent]).drifts).toHaveLength(0)
  })

  it('uses officer decisions when counting repeat flags in saved records', () => {
    const verified = { ...inspection, id: 'verified', source: 'created' as const, findings: inspection.findings.map((finding) => ({ ...finding, officerDecision: 'pass' as const })) }
    const repo = buildDnaRepository([verified], [], inspection.id)
    expect(repo[0].violationFields).toHaveLength(0)
    expect(analyzeComplianceDna(inspection, repo).repeatedViolations).toHaveLength(0)
  })
  it('extracts comparable declarations from OCR text', () => {
    expect(extractDeclarations(demoText)).toMatchObject({
      mrp: '₹299',
      net_quantity: '500 ml',
      unit_sale_price: '₹0.70/ml',
    })
  })

  it('links sightings with the same barcode and detects cross-channel MRP drift', () => {
    const dna = analyzeComplianceDna(inspection, productSightings)
    expect(dna.sightings).toHaveLength(3)
    expect(dna.confidence).toBe(0.98)
    expect(dna.drifts.some((drift) => drift.field === 'mrp' && drift.observedValue === '₹349')).toBe(true)
    expect(dna.risk).toBe('High')
  })

  it('identifies violations repeated across independent sightings', () => {
    const dna = analyzeComplianceDna(inspection, productSightings)
    expect(dna.repeatedViolations.find((item) => item.field === 'consumer_email')?.occurrences).toBe(3)
    expect(dna.repeatedViolations.find((item) => item.field === 'unit_sale_price')?.occurrences).toBe(3)
  })

  it('does not link an unrelated product', () => {
    const unrelated = {
      ...inspection,
      details: { ...inspection.details, name: 'Floor Cleaner', brand: 'Prakriti', barcode: '9999999999999' },
    }
    expect(analyzeComplianceDna(unrelated, productSightings).sightings).toHaveLength(0)
  })
})
