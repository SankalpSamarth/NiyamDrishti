import { calculateScore, calculateStatus, runCompliance } from '../lib/compliance'
import type { Inspection, OCRBlock, ProductDetails } from '../types'

export const demoDetails: ProductDetails = {
  name: 'HydraGlow Botanical Shampoo',
  brand: 'Aurelia',
  barcode: '8901234567890',
  category: 'Personal care',
  packageType: 'Retail',
  origin: 'Imported',
  channel: 'Both',
  inspectionDate: '2026-09-02',
  location: 'Sector 17 Retail Market, Chandigarh',
  calibrationDetected: true,
  estimatedFontMm: 1.4,
  principalDisplayAreaCm2: 80,
  moldedDeclaration: false,
}

export const demoText = `AURELIA
HydraGlow Botanical Shampoo
Net Quantity: 500 ml
Manufactured by: Aurelia Laboratoires, 18 Rue des Fleurs, Lyon, France
Imported by: Meridian Consumer Products Pvt. Ltd., Plot 21, Industrial Area, Chandigarh 160002
Country of Origin: France
MFD: 08/2026
MRP: ₹299 inclusive of all taxes
Unit Sale Price: ₹0.70/ml
Consumer Care: +91 98765 43210`

export const demoBlocks: OCRBlock[] = [
  { text: 'HydraGlow Botanical Shampoo', confidence: 97, surface: 'Front', box: { x: 17, y: 25, width: 66, height: 6 } },
  { text: 'Net Quantity: 500 ml', confidence: 98, surface: 'Front', box: { x: 28, y: 74, width: 44, height: 4 } },
  { text: 'Manufactured by: Aurelia Laboratoires, 18 Rue des Fleurs, Lyon, France', confidence: 91, surface: 'Back', box: { x: 15, y: 23, width: 70, height: 7 } },
  { text: 'Imported by: Meridian Consumer Products Pvt. Ltd., Plot 21, Industrial Area, Chandigarh 160002', confidence: 94, surface: 'Back', box: { x: 15, y: 33, width: 70, height: 8 } },
  { text: 'Country of Origin: France', confidence: 98, surface: 'Back', box: { x: 15, y: 44, width: 43, height: 4 } },
  { text: 'MFD: 08/2026', confidence: 96, surface: 'Back', box: { x: 15, y: 51, width: 29, height: 4 } },
  { text: 'MRP: ₹299 inclusive of all taxes', confidence: 97, surface: 'Back', box: { x: 15, y: 58, width: 58, height: 4 } },
  { text: 'Unit Sale Price: ₹0.70/ml', confidence: 95, surface: 'Back', box: { x: 15, y: 65, width: 48, height: 4 } },
  { text: 'Consumer Care: +91 98765 43210', confidence: 93, surface: 'Back', box: { x: 15, y: 74, width: 58, height: 4 } },
]

function createDemoInspection(): Inspection {
  const findings = runCompliance(demoDetails, demoText, demoBlocks)
  return {
    id: 'ND-CH-24092',
    details: demoDetails,
    inspector: 'Aarav Mehta · Inspector',
    createdAt: '2026-09-02T09:42:00.000Z',
    status: calculateStatus(findings),
    score: calculateScore(findings),
    findings,
    images: [
      { id: 'demo-front', surface: 'Front', name: 'aurelia-front.svg', dataUrl: '/demo-aurelia-front.svg', source: 'demo' },
      { id: 'demo-back', surface: 'Back', name: 'aurelia-back.svg', dataUrl: '/demo-aurelia-back.svg', source: 'demo' },
    ],
    ocrText: demoText,
    ocrBlocks: demoBlocks,
    source: 'seed',
  }
}

const baseDetails = (name: string, brand: string, category: string, origin: ProductDetails['origin'], date: string): ProductDetails => ({
  name, brand, barcode: '', category, packageType: 'Retail', origin, channel: 'Physical retail', inspectionDate: date,
  location: 'Chandigarh', calibrationDetected: false,
})

export const seedInspections: Inspection[] = [
  createDemoInspection(),
  {
    id: 'ND-CH-24081', details: baseDetails('Wholegrain Oat Biscuits', 'GrainGood', 'Packaged food', 'Domestic', '2026-08-29'),
    inspector: 'Meera Singh · Inspector', createdAt: '2026-08-29T11:12:00.000Z', status: 'Compliant', score: 96,
    findings: [], images: [], ocrText: '', ocrBlocks: [], source: 'seed',
  },
  {
    id: 'ND-CH-24073', details: baseDetails('65W GaN Travel Adapter', 'VoltEdge', 'Electronics', 'Imported', '2026-08-27'),
    inspector: 'Aarav Mehta · Inspector', createdAt: '2026-08-27T15:31:00.000Z', status: 'Needs review', score: 84,
    findings: [], images: [], ocrText: '', ocrBlocks: [], source: 'seed',
  },
  {
    id: 'ND-CH-24055', details: baseDetails('Floor Cleaner — Citrus', 'Prakriti Home', 'Household', 'Domestic', '2026-08-22'),
    inspector: 'Kabir Joshi · Inspector', createdAt: '2026-08-22T10:08:00.000Z', status: 'Potential violation', score: 68,
    findings: [], images: [], ocrText: '', ocrBlocks: [], source: 'seed',
  },
  {
    id: 'ND-CH-24041', details: baseDetails('Assorted Chocolate Gift Pack', 'Maison Cacao', 'Packaged food', 'Imported', '2026-08-18'),
    inspector: 'Meera Singh · Inspector', createdAt: '2026-08-18T13:45:00.000Z', status: 'Potential violation', score: 74,
    findings: [], images: [], ocrText: '', ocrBlocks: [], source: 'seed',
  },
]
