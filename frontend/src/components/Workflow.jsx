import { useEffect, useMemo, useRef, useState } from 'react'
import { GROUPS, STORE_KEY, allItems } from '../lib/workflow'

const load = () => {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); return { done: s.done || {}, notes: s.notes || {} } } catch { return { done: {}, notes: {} } }
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

export default function Workflow() {
  const [st, setSt] = useState(load)
  const [open, setOpen] = useState({})
  const file = useRef(null)

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(st)) } catch { /* storage unavailable */ } }, [st])

  const toggle = (id) => setSt((s) => ({ ...s, done: { ...s.done, [id]: !s.done[id] } }))
  const setNote = (id, v) => setSt((s) => ({ ...s, notes: { ...s.notes, [id]: v } }))

  const stats = useMemo(() => {
    const req = allItems().filter((i) => i.kind === 'req')
    return { total: req.length, done: req.filter((i) => st.done[i.id]).length }
  }, [st])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), ...st }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'sih26116-workflow.json'; a.click(); URL.revokeObjectURL(a.href)
  }
  const importJson = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    f.text().then((t) => { const j = JSON.parse(t); setSt({ done: j.done || {}, notes: j.notes || {} }) }).catch(() => alert('Not a valid progress file'))
    e.target.value = ''
  }
  const reset = () => { if (confirm('Clear all ticks and notes?')) setSt({ done: {}, notes: {} }) }

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-8">
      <h1 className="text-2xl font-bold">Revit workflow tracker</h1>
      <p className="mt-1 text-sm text-steel">
        Tick items only once they exist in <b>your own Revit model</b>. This page tracks progress; it does not design anything.
        Progress is saved in this browser only, so export it to keep a copy.
      </p>

      <div className="mt-4 border border-line bg-paper p-3" role="status">
        <div className="flex justify-between text-sm font-semibold"><span>Required items</span><span>{stats.done} / {stats.total} · {pct(stats.done, stats.total)}%</span></div>
        <div className="mt-2 h-2 bg-vellum" aria-hidden="true"><div className="h-2 bg-safety" style={{ width: pct(stats.done, stats.total) + '%' }} /></div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button onClick={exportJson} className="rounded-sm border border-ink px-3 py-1.5">Export progress</button>
          <button onClick={() => file.current?.click()} className="rounded-sm border border-ink px-3 py-1.5">Import progress</button>
          <button onClick={reset} className="rounded-sm border border-line px-3 py-1.5 text-steel">Reset</button>
          <input ref={file} type="file" accept="application/json" onChange={importJson} className="hidden" />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {GROUPS.map((g) => {
          const req = g.items.filter((i) => i.kind === 'req')
          const d = req.filter((i) => st.done[i.id]).length
          return (
            <details key={g.id} className="border border-line bg-paper" open={g.id !== 'forma'}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 font-semibold">
                <span>{g.title}</span>
                <span className="shrink-0 text-sm font-normal text-steel">{req.length ? `${d}/${req.length}` : 'optional'}</span>
              </summary>
              {g.note && <p className="px-3 pb-1 text-sm text-steel">{g.note}</p>}
              <ul className="divide-y divide-line border-t border-line">
                {g.items.map((i) => (
                  <li key={i.id} className="px-3 py-2">
                    <div className="flex items-start gap-3">
                      <input id={i.id} type="checkbox" checked={!!st.done[i.id]} onChange={() => toggle(i.id)} className="mt-1 h-5 w-5 accent-[#F26B21]" />
                      <label htmlFor={i.id} className="flex-1 text-sm">
                        {i.t}{i.kind === 'opt' && <span className="ml-2 rounded-sm bg-vellum px-1.5 py-0.5 text-xs text-steel">optional</span>}
                      </label>
                      <button onClick={() => setOpen((o) => ({ ...o, [i.id]: !o[i.id] }))} aria-expanded={!!open[i.id]}
                        className="shrink-0 text-xs text-steel underline">{st.notes[i.id] ? 'note •' : 'note'}</button>
                    </div>
                    {open[i.id] && (
                      <textarea value={st.notes[i.id] || ''} onChange={(e) => setNote(i.id, e.target.value)} rows={2} aria-label={`Note for ${i.t}`}
                        placeholder="Your own note: where it is in the model, sheet or view name…" className="mt-2 w-full border border-line bg-white p-2 text-sm" />
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )
        })}
      </div>
    </div>
  )
}
