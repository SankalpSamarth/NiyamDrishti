import { describe, expect, it } from 'vitest'
import { demoDetails, demoText } from '../data/seed'
import { calculateScore, runCompliance } from './compliance'
import { escapeReportText } from './report'

describe('round two screening safeguards', () => {
  it('routes a poorly read declaration to review with its actual OCR confidence', () => {
    const finding = runCompliance(demoDetails, 'MRP: Rs. 299', [{ text: 'MRP: Rs. 299', surface: 'Back', confidence: 42 }]).find((item) => item.field === 'mrp')!
    expect(finding.status).toBe('review')
    expect(finding.confidence).toBe(.42)
  })

  it('does not invent OCR confidence for pasted text or absent declarations', () => {
    const findings = runCompliance(demoDetails, 'MRP: Rs. 299')
    expect(findings.find((item) => item.field === 'mrp')?.confidence).toBeUndefined()
    expect(findings.find((item) => item.field === 'consumer_email')?.confidence).toBeUndefined()
  })

  it('can simulate a correction without mutating original findings', () => {
    const original = runCompliance(demoDetails, demoText)
    const corrected = runCompliance(demoDetails, `${demoText.replace('0.70/ml', '0.60/ml')}\nConsumer email: care@example.com`)
    expect(original.find((item) => item.field === 'consumer_email')?.status).toBe('violation')
    expect(corrected.find((item) => item.field === 'consumer_email')?.status).toBe('pass')
    expect(corrected.find((item) => item.field === 'unit_sale_price')?.status).toBe('pass')
    expect(calculateScore(corrected)).toBeGreaterThan(calculateScore(original))
  })

  it('treats OCR and product names as text when exporting reports', () => {
    expect(escapeReportText('<script>alert("x")</script> &')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp;')
  })
})
