// Stores the team's OWN renders, drawings and walkthrough in this browser (IndexedDB).
// Nothing is bundled or pre-loaded: the gallery is empty until you add files exported from your Revit model.
const DB = 'sih26116-media', STORE = 'items'

const open = () => new Promise((res, rej) => {
  const q = indexedDB.open(DB, 1)
  q.onupgradeneeded = () => q.result.createObjectStore(STORE, { keyPath: 'id' })
  q.onsuccess = () => res(q.result)
  q.onerror = () => rej(q.error)
})
const run = async (mode, fn) => {
  const db = await open()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, mode)
    const r = fn(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); res(r && r.result) }
    tx.onerror = () => { db.close(); rej(tx.error) }
  })
}

export const listMedia = () => run('readonly', (s) => s.getAll()).then((a) => (a || []).sort((x, y) => x.added - y.added))
export const addMedia = (section, file) => run('readwrite', (s) => s.put({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, section, name: file.name, type: file.type, blob: file, caption: '', added: Date.now(),
}))
export const setCaption = (item, caption) => run('readwrite', (s) => s.put({ ...item, caption }))
export const removeMedia = (id) => run('readwrite', (s) => s.delete(id))
