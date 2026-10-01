import { useEffect, useRef, useState } from 'react'
import { isAuthed, login, logout, listModels, uploadModel, activate, archive } from '../lib/bimApi'

const mb = (b) => (b / 1048576).toFixed(1) + ' MB'

function Login({ onDone }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const go = async (e) => {
    e.preventDefault()
    try { await login(pw); onDone() } catch (x) { setErr(x.message) }
  }
  return (
    <form onSubmit={go} className="mx-auto mt-24 max-w-sm space-y-3 border border-line bg-paper p-6">
      <h1 className="text-xl font-bold">Admin sign in</h1>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password" className="w-full border border-line px-3 py-2" autoFocus />
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button className="rounded-sm bg-ink px-4 py-2 font-medium text-paper">Sign in</button>
    </form>
  )
}

export default function AdminBim() {
  const [authed, setAuthed] = useState(isAuthed())
  const [models, setModels] = useState([])
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [state, setState] = useState('')
  const [err, setErr] = useState('')
  const input = useRef()

  const refresh = () => listModels().then(setModels).catch((e) => { setErr(e.message); if (!isAuthed()) setAuthed(false) })
  useEffect(() => { if (authed) refresh() }, [authed])

  if (!authed) return <Login onDone={() => setAuthed(true)} />

  const active = models.find((m) => m.active)
  const send = async () => {
    setErr(''); setProgress(0); setState('Uploading…')
    try {
      const r = await uploadModel(file, (p) => { setProgress(p); if (p === 100) setState('Processing…') })
      setState(r.status === 'ready' ? `Ready — version ${r.version} is now active` : `Failed: ${r.error}`)
      setFile(null); if (input.current) input.current.value = ''
      refresh()
    } catch (e) { setState(''); setErr(e.message); if (!isAuthed()) setAuthed(false) }
  }
  const act = (fn, id) => fn(id).then(refresh).catch((e) => setErr(e.message))

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">BIM Model Management</h1>
        <div className="flex gap-3 text-sm"><a href="/" className="underline">Public site</a><button onClick={() => { logout(); setAuthed(false) }} className="underline">Sign out</button></div>
      </div>

      <p className="mt-3 text-sm">{active ? <>Current active model: <b>Version {active.version}</b> · Uploaded {active.uploadedAt.slice(0, 10)}</> : 'No active model yet.'}</p>

      <section className="mt-5 border border-line bg-paper p-4">
        <p className="mb-2 text-sm text-steel">Accepted formats: IFC (recommended, exported from Revit), GLB/GLTF. Uploading a valid file makes it the active model.</p>
        <input ref={input} type="file" accept=".ifc,.glb,.gltf" onChange={(e) => { setFile(e.target.files[0] || null); setState(''); setErr('') }} className="text-sm" />
        {file && (
          <div className="mt-3 text-sm">
            <p><b>{file.name}</b> · {mb(file.size)}</p>
            <button onClick={send} disabled={state === 'Uploading…' || state === 'Processing…'} className="mt-2 rounded-sm bg-safety px-4 py-2 font-semibold text-white disabled:opacity-50">Upload BIM model</button>
          </div>
        )}
        {(state || progress > 0) && (
          <div className="mt-3">
            {progress > 0 && <div className="h-2 bg-line"><div className="h-2 bg-safety" style={{ width: progress + '%' }} /></div>}
            {state && <p className="mt-1 text-sm">{state}</p>}
          </div>
        )}
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </section>

      <h2 className="mb-2 mt-8 text-lg font-bold">Versions</h2>
      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-ink text-paper"><tr>{['Version', 'File', 'Size', 'Uploaded', 'By', 'Schema', 'Status', ''].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className={`border-t border-line ${m.archived ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 font-medium">v{m.version}{m.active && <span className="ml-2 rounded-sm bg-safety px-1.5 py-0.5 text-xs text-white">Active</span>}</td>
                <td className="px-3 py-2 break-all">{m.originalName}</td>
                <td className="px-3 py-2">{mb(m.size)}</td>
                <td className="px-3 py-2">{m.uploadedAt.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-3 py-2">{m.uploadedBy}</td>
                <td className="px-3 py-2">{m.schema || '—'}</td>
                <td className="px-3 py-2">{m.archived ? 'Archived' : m.status === 'ready' ? 'Ready' : m.status === 'failed' ? `Failed: ${m.error}` : 'Processing…'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {m.status === 'ready' && !m.active && !m.archived && <button onClick={() => act(activate, m.id)} className="mr-3 underline">Activate</button>}
                  {m.status === 'ready' && m.active && <a href="/" className="mr-3 underline">View model</a>}
                  {!m.active && !m.archived && <button onClick={() => act(archive, m.id)} className="underline">Archive</button>}
                </td>
              </tr>
            ))}
            {models.length === 0 && <tr><td className="px-3 py-4 text-steel" colSpan={8}>No models uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
