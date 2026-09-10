import { describe, expect, it } from 'vitest'
import { calculateScore, calculateStatus, runCompliance } from './compliance'
import type { ProductDetails } from '../types'

const details: ProductDetails = {
  name: 'Demo Shampoo', brand: 'Demo', barcode: '8900000000000', category: 'Personal care',
  packageType: 'Retail', origin: 'Imported', channel: 'Physical retail', inspectionDate: '2026-09-02',
  location: 'Test store', calibrationDetected: true, estimatedFontMm: 2.2,
  principalDisplayAreaCm2: 80, moldedDeclaration: false,
}

const compliantText = `Botanical Shampoo
Manufactured by: Demo Labs, New Delhi 110001
Imported by: Demo Imports Pvt Ltd, Mumbai 400001
Country of Origin: France
Net Quantity: 500 ml
MFD: 08/2026
MRP: ₹299 inclusive of all taxes
Unit Sale Price: ₹0.60/ml
Consumer Care: +91 9876543210
care@example.com`

describe('versioned compliance checks', () => {
  it('passes a complete imported retail package profile', () => {
    const findings = runCompliance(details, compliantText)
    expect(findings).toHaveLength(12)
    expect(findings.every((finding) => finding.status === 'pass')).toBe(true)
    expect(calculateStatus(findings)).toBe('Compliant')
    expect(calculateScore(findings)).toBe(100)
  })

  it('accepts OCR that places manufacturer and importer details on the next line', () => {
    const multilineText = compliantText
      .replace('Manufactured by: Demo Labs, New Delhi 110001', 'Manufactured by:\nDemo Labs, New Delhi 110001')
      .replace('Imported by: Demo Imports Pvt Ltd, Mumbai 400001', 'Imported by:\nDemo Imports Pvt Ltd, Mumbai 400001')
    const findings = runCompliance(details, multilineText)

    expect(findings.find((finding) => finding.field === 'manufacturer')?.status).toBe('pass')
    expect(findings.find((finding) => finding.field === 'importer')?.status).toBe('pass')
  })

  it('flags missing importer, country of origin, email and low character height', () => {
    const findings = runCompliance({ ...details, estimatedFontMm: 1.4 }, compliantText
      .replace(/Imported by:.+\n/, '')
      .replace(/Country of Origin:.+\n/, '')
      .replace(/care@example.com/, ''))
    expect(findings.filter((finding) => finding.status === 'violation').map((finding) => finding.field))
      .toEqual(expect.arrayContaining(['importer', 'country_of_origin', 'consumer_email', 'font_size']))
    expect(calculateStatus(findings)).toBe('Potential violation')
    expect(calculateScore(findings)).toBeLessThan(80)
  })

  it('does not apply imported-product checks to domestic products', () => {
    const findings = runCompliance({ ...details, origin: 'Domestic' }, compliantText)
    expect(findings.some((finding) => finding.field === 'importer')).toBe(false)
    expect(findings.some((finding) => finding.field === 'country_of_origin')).toBe(false)
  })

  it('routes uncalibrated font measurement to officer review', () => {
    const findings = runCompliance({ ...details, calibrationDetected: false, estimatedFontMm: undefined }, compliantText)
    expect(findings.find((finding) => finding.field === 'font_size')?.status).toBe('review')
  })

  it('uses the actual Rule 7 Table I threshold for the supplied panel area', () => {
    const normal = runCompliance({ ...details, estimatedFontMm: 1.4 }, compliantText)
    const molded = runCompliance({ ...details, moldedDeclaration: true, estimatedFontMm: 2.9 }, compliantText)
    expect(normal.find((finding) => finding.field === 'font_size')?.status).toBe('violation')
    expect(molded.find((finding) => finding.field === 'font_size')?.status).toBe('violation')
  })

  it('tolerates a common OCR currency-symbol substitution in unit price', () => {
    const findings = runCompliance(details, compliantText.replace('₹0.60/ml', '¥0.60/ml'))
    expect(findings.find((finding) => finding.field === 'unit_sale_price')?.status).toBe('pass')
  })

  it('calculates and flags an incorrect unit sale price instead of matching a hardcoded product', () => {
    const findings = runCompliance(details, compliantText.replace('₹0.60/ml', '₹0.70/ml'))
    const unitPrice = findings.find((finding) => finding.field === 'unit_sale_price')
    expect(unitPrice?.status).toBe('violation')
    expect(unitPrice?.observed).toContain('calculated ₹0.60/ml')
  })
})
