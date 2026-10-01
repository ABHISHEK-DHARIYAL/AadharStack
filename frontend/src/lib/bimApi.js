const BASE = import.meta.env.VITE_API_URL || ''
const tk = () => sessionStorage.getItem('bim_token')
const auth = () => ({ Authorization: 'Bearer ' + tk() })

async function j(r) {
  const d = await r.json().catch(() => ({}))
  if (r.status === 401) sessionStorage.removeItem('bim_token')
  if (!r.ok) throw new Error(d.error || r.statusText)
  return d
}

export const isAuthed = () => !!tk()
export const logout = () => sessionStorage.removeItem('bim_token')
export async function login(password) {
  const d = await j(await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }))
  sessionStorage.setItem('bim_token', d.token)
}
export const listModels = async () => j(await fetch(BASE + '/api/bim/models', { headers: auth() }))
export const activate = async (id) => j(await fetch(`${BASE}/api/bim/models/${id}/activate`, { method: 'POST', headers: auth() }))
export const archive = async (id) => j(await fetch(`${BASE}/api/bim/models/${id}/archive`, { method: 'POST', headers: auth() }))
export const activeModel = async () => j(await fetch(BASE + '/api/bim/active'))
export const activeFileUrl = (id) => `${BASE}/api/bim/active/file?v=${id}`

export function uploadModel(file, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('POST', BASE + '/api/bim/models')
    x.setRequestHeader('Authorization', 'Bearer ' + tk())
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    x.onload = () => {
      let d = {}
      try { d = JSON.parse(x.responseText) } catch (_) { /* ignore */ }
      if (x.status === 401) sessionStorage.removeItem('bim_token')
      x.status < 300 ? resolve(d) : reject(new Error(d.error || 'Upload failed'))
    }
    x.onerror = () => reject(new Error('Network error'))
    const f = new FormData()
    f.append('file', file)
    x.send(f)
  })
}
