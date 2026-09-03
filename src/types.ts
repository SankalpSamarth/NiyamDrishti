export type FindingStatus = 'pass' | 'violation' | 'review'
export type InspectionStatus = 'Compliant' | 'Potential violation' | 'Needs review'
export type Severity = 'critical' | 'major' | 'minor' | 'info'

export interface BoundingBox {
  /** Percentage coordinates relative to the source image (0–100). */
  x: number
  y: number
  width: number
  height: number
}

export interface OCRBlock {
  text: string
  confidence: number
  surface: string
  box?: BoundingBox
}

export interface EvidenceImage {
  id: string
  surface: string
  name: string
  dataUrl: string
  source: 'upload' | 'demo'
}

export interface Finding {
  id: string
  ruleId: string
  title: string
  field: string
  status: FindingStatus
  severity: Severity
  observed: string
  requirement: string
  explanation: string
  confidence: number
  surface?: string
  box?: BoundingBox
  citation: string
  officerDecision?: FindingStatus
  officerNote?: string
}

export interface ProductDetails {
  name: string
  brand: string
  barcode: string
  category: string
  packageType: 'Retail' | 'Wholesale' | 'Group / combination'
  origin: 'Domestic' | 'Imported'
  channel: 'Physical retail' | 'E-commerce' | 'Both'
  inspectionDate: string
  location: string
  calibrationDetected: boolean
  estimatedFontMm?: number
  principalDisplayAreaCm2?: number
  moldedDeclaration?: boolean
}

export interface Inspection {
  id: string
  details: ProductDetails
  inspector: string
  createdAt: string
  status: InspectionStatus
  score: number
  findings: Finding[]
  images: EvidenceImage[]
  ocrText: string
  ocrBlocks: OCRBlock[]
  source: 'seed' | 'created'
}

export type ViewName = 'dashboard' | 'new' | 'inspections' | 'products' | 'rules' | 'result'
