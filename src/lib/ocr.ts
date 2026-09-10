import type { OCRBlock } from '../types'

export interface OCRResult {
  text: string
  confidence: number
  blocks: OCRBlock[]
}

export async function recognizeImage(dataUrl: string, surface: string, onProgress?: (progress: number) => void): Promise<OCRResult> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    workerPath: `${window.location.origin}/ocr-runtime/worker.min.js`,
    corePath: `${window.location.origin}/ocr-runtime`,
    langPath: `${window.location.origin}/tessdata`,
    logger: (message) => {
      if (message.status === 'recognizing text' && typeof message.progress === 'number') onProgress?.(message.progress)
    },
  })

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = reject
      image.src = dataUrl
    })
    const result = await worker.recognize(dataUrl, {}, { blocks: true, text: true })
    const blocks: OCRBlock[] = []
    const page = result.data as typeof result.data & {
      blocks?: Array<{ paragraphs?: Array<{ lines?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> }> }>
    }
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const line of paragraph.lines ?? []) {
          blocks.push({
            text: line.text,
            confidence: line.confidence,
            surface,
            box: {
              x: (line.bbox.x0 / dimensions.width) * 100,
              y: (line.bbox.y0 / dimensions.height) * 100,
              width: ((line.bbox.x1 - line.bbox.x0) / dimensions.width) * 100,
              height: ((line.bbox.y1 - line.bbox.y0) / dimensions.height) * 100,
            },
          })
        }
      }
    }
    return { text: result.data.text, confidence: result.data.confidence, blocks }
  } finally {
    await worker.terminate()
  }
}
