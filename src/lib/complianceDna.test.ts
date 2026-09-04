import { describe, expect, it } from 'vitest'
import { productSightings } from '../data/dna'
import { demoDetails, demoText } from '../data/seed'
import { runCompliance } from './compliance'
import { analyzeComplianceDna, extractDeclarations } from './complianceDna'
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
