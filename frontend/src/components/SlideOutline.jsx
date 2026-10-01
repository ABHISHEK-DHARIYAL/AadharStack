import { useEffect, useState } from 'react'
import { SLIDES, SLIDE_KEY } from '../lib/slides'

const load = () => {
  try { const s = JSON.parse(localStorage.getItem(SLIDE_KEY) || '{}'); return { notes: s.notes || {}, imgs: s.imgs || {} } } catch { return { notes: {}, imgs: {} } }
}

export default function SlideOutline() {
  const [st, setSt] = useState(load)
  useEffect(() => { try { localStorage.setItem(SLIDE_KEY, JSON.stringify(st)) } catch { /* storage unavailable */ } }, [st])

  const setNote = (id, v) => setSt((s) => ({ ...s, notes: { ...s.notes, [id]: v } }))
  const setImg = (key, patch) => setSt((s) => ({ ...s, imgs: { ...s.imgs, [key]: { ...s.imgs[key], ...patch } } }))
  const filled = SLIDES.filter((s) => (st.notes[s.id] || '').trim()).length

  const download = (name, text, type) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href)
  }
  const exportMd = () => {
    const md = SLIDES.map((s, i) => {
      const imgs = s.images.map((label, k) => { const v = st.imgs[`${s.id}-${k}`] || {}; return `- [${v.ready ? 'x' : ' '}] ${label}${v.ref ? `: ${v.ref}` : ''}` }).join('\n')
      return `## Slide ${i + 1}: ${s.title}\n\n${(st.notes[s.id] || '').trim() || '_(no notes yet)_'}\n\n**Images**\n${imgs}\n`
    }).join('\n')
    download('sih26116-slide-outline.md', `# SIH26116 presentation outline\n\n${md}`, 'text/markdown')
  }
  const exportJson = () => download('sih26116-slides.json', JSON.stringify(st, null, 2), 'application/json')
  const importJson = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    f.text().then((t) => { const j = JSON.parse(t); setSt({ notes: j.notes || {}, imgs: j.imgs || {} }) }).catch(() => alert('Not a valid outline file'))
    e.target.value = ''
  }
  const reset = () => { if (confirm('Clear all slide notes?')) setSt({ notes: {}, imgs: {} }) }

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-8">
      <h1 className="text-2xl font-bold">Presentation outline (5–7 slides)</h1>
      <p className="mt-1 text-sm text-steel">
        A planning sheet for your PowerPoint. The questions are prompts only: write the answers in your own words from your own Revit design.
        Images are tracked by name; attach the real renders and drawings in PowerPoint.
      </p>
      <div className="mt-4 border border-line bg-paper p-3" role="status">
        <p className="text-sm font-semibold">{SLIDES.length} slides · notes started on {filled} of {SLIDES.length}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button onClick={exportMd} className="rounded-sm border border-ink px-3 py-1.5">Export outline (.md)</button>
          <button onClick={exportJson} className="rounded-sm border border-line px-3 py-1.5">Save backup</button>
          <label className="cursor-pointer rounded-sm border border-line px-3 py-1.5">Restore backup<input type="file" accept="application/json" onChange={importJson} className="hidden" /></label>
          <button onClick={reset} className="rounded-sm border border-line px-3 py-1.5 text-steel">Reset</button>
        </div>
      </div>

      <ol className="mt-4 space-y-3">
        {SLIDES.map((s, i) => (
          <li key={s.id}>
            <details className="border border-line bg-paper" open={i === 0}>
              <summary className="cursor-pointer px-3 py-2.5 font-semibold">Slide {i + 1} · {s.title}
                {(st.notes[s.id] || '').trim() && <span className="ml-2 text-sm font-normal text-steel">(notes started)</span>}</summary>
              <div className="border-t border-line p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-steel">Questions to answer</p>
                <ul className="mt-1 list-disc pl-5 text-sm">{s.prompts.map((p) => <li key={p}>{p}</li>)}</ul>
                <label htmlFor={`n-${s.id}`} className="mt-3 block text-sm font-semibold">Your key points</label>
                <textarea id={`n-${s.id}`} rows={4} value={st.notes[s.id] || ''} onChange={(e) => setNote(s.id, e.target.value)}
                  className="mt-1 w-full border border-line bg-white p-2 text-sm" placeholder="Short points in your own words…" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-steel">Images for this slide</p>
                <ul className="mt-1 space-y-2">
                  {s.images.map((label, k) => {
                    const key = `${s.id}-${k}`, v = st.imgs[key] || {}
                    return (
                      <li key={key} className="flex items-start gap-3">
                        <input id={key} type="checkbox" checked={!!v.ready} onChange={() => setImg(key, { ready: !v.ready })} className="mt-1 h-5 w-5 accent-[#F26B21]" />
                        <div className="flex-1">
                          <label htmlFor={key} className="text-sm">{label}</label>
                          <input value={v.ref || ''} onChange={(e) => setImg(key, { ref: e.target.value })} aria-label={`File or Revit view for ${label}`}
                            placeholder="File name or Revit view / sheet" className="mt-1 w-full border border-line bg-white p-1.5 text-sm" />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </div>
  )
}
