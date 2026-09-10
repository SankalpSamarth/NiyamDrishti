import type { Inspection } from '../types'

// IndexedDB keeps the original photos alongside the report, beyond localStorage's quota.
function openRepository(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('niyamdrishti-evidence', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('inspections', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readRepository(): Promise<Inspection[]> {
  const db = await openRepository()
  try {
    return await new Promise<Inspection[]>((resolve, reject) => {
      const request = db.transaction('inspections').objectStore('inspections').getAll()
      request.onsuccess = () => resolve(request.result as Inspection[])
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}

export async function persistInspection(inspection: Inspection): Promise<void> {
  const db = await openRepository()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('inspections', 'readwrite')
      transaction.objectStore('inspections').put(inspection)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error ?? new Error('Storage transaction aborted'))
    })
  } finally { db.close() }
}
