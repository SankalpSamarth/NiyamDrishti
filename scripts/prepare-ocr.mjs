import { mkdir, copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const destination = join(root, 'public', 'ocr-runtime')
const tesseract = dirname(require.resolve('tesseract.js/package.json'))
const core = dirname(require.resolve('tesseract.js-core/package.json'))
await mkdir(destination, { recursive: true })
await copyFile(join(tesseract, 'dist', 'worker.min.js'), join(destination, 'worker.min.js'))
await copyFile(join(tesseract, 'dist', 'worker.min.js.LICENSE.txt'), join(destination, 'worker.LICENSE.txt'))
await copyFile(join(core, 'LICENSE'), join(destination, 'core.LICENSE.txt'))
for (const name of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']) {
  await copyFile(join(core, name), join(destination, name))
}
console.log('Local OCR worker and recognition cores prepared.')
