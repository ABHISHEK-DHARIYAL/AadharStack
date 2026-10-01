import { useCallback, useEffect, useRef, useState } from 'react'
import { SECTIONS } from '../lib/showcase'
import { listMedia, addMedia, setCaption, removeMedia } from '../lib/mediaStore'

function Tile({ item, onRemove, onCaption }) {
  const [url, setUrl] = useState(null)
  const [dur, setDur] = useState(null)
  useEffect(() => { const u = URL.createObjectURL(item.blob); setUrl(u); return () => URL.revokeObjectURL(u) }, [item])
  const isVideo = item.type.startsWith('video/')
  return (
    <li className="border border-line bg-paper">
      {url && (isVideo
        ? <video src={url} controls className="w-full bg-black" onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} aria-label={item.caption || item.name} />
        : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={item.caption || item.name} className="w-full object-cover" /></a>)}
      <div className="p-2 text-sm">
        {dur != null && (
          <p className="mb-1 font-semibold">
            Length {dur.toFixed(1)} s{Math.abs(dur - 30) > 5 ? <span className="font-normal text-amber-800"> · the brief asks for about 30 s</span> : ' ✓'}
          </p>
        )}
        <textarea defaultValue={item.caption} onBlur={(e) => e.target.value !== item.caption && onCaption(item, e.target.value)} rows={2}
          aria-label={`Caption for ${item.name}`} placeholder="Caption, in your own words…" className="w-full border border-line bg-white p-1.5" />
        <div className="mt-1 flex items-center justify-between text-xs text-steel">
          <span className="truncate pr-2">{item.name}</span>
          <button onClick={() => onRemove(item)} aria-label={`Remove ${item.name}`} className="shrink-0 underline">Remove</button>
        </div>
      </div>
    </li>
  )
}

export default function Showcase() {
  const [link, setLink] = useState(() => { try { return localStorage.getItem('sih26116-video-link') || '' } catch { return '' } })
  const saveLink = (v) => { setLink(v); try { localStorage.setItem('sih26116-video-link', v) } catch { /* storage unavailable */ } }
  const [items, setItems] = useState([])
  const [err, setErr] = useState(null)
  const inputs = useRef({})

  const refresh = useCallback(() => listMedia().then(setItems).catch((e) => setErr(e.message || 'Browser storage unavailable')), [])
  useEffect(() => { refresh() }, [refresh])

  const onFiles = async (section, files) => {
    try { for (const f of files) await addMedia(section.id, f); await refresh() } catch (e) { setErr(e.message || 'Could not save file') }
  }
  const remove = async (it) => { if (confirm(`Remove ${it.name}?`)) { await removeMedia(it.id); refresh() } }
  const caption = async (it, v) => { await setCaption(it, v); refresh() }

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      <h1 className="text-2xl font-bold">Showcase</h1>
      <p className="mt-1 text-sm text-steel">
        A gallery for your <b>own</b> renders, drawings and walkthrough exported from Revit (or Forma). It starts empty and nothing is pre-loaded.
        AI-generated images are not allowed by the competition, so only add real output from your model. Files stay in this browser only; keep your originals.
      </p>
      <div className="mt-4">
        <label htmlFor="vlink" className="text-sm font-semibold">Walkthrough video link (for example YouTube, if the submission form asks)</label>
        <input id="vlink" value={link} onChange={(e) => saveLink(e.target.value)} placeholder="https://…" className="mt-1 w-full border border-line bg-white p-2 text-sm" />
      </div>
      {err && <p role="alert" className="mt-3 text-red-700">{err}</p>}

      {SECTIONS.map((sec) => {
        const mine = items.filter((i) => i.section === sec.id)
        return (
          <section key={sec.id} className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{sec.title} <span className="text-sm font-normal text-steel">({mine.length})</span></h2>
              <button onClick={() => inputs.current[sec.id]?.click()} className="rounded-sm border border-ink px-3 py-1.5 text-sm">Add {sec.kind === 'video' ? 'video' : 'images'}</button>
              <input ref={(el) => { inputs.current[sec.id] = el }} type="file" accept={sec.kind === 'video' ? 'video/*' : 'image/*'} multiple={sec.kind !== 'video'}
                className="hidden" aria-label={`Add files to ${sec.title}`} onChange={(e) => { onFiles(sec, Array.from(e.target.files || [])); e.target.value = '' }} />
            </div>
            {mine.length === 0
              ? <p className="mt-2 border border-dashed border-line p-4 text-sm text-steel">Nothing added yet.</p>
              : <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mine.map((it) => <Tile key={it.id} item={it} onRemove={remove} onCaption={caption} />)}</ul>}
          </section>
        )
      })}
    </div>
  )
}
