import { useEffect, useMemo, useState } from 'react'
import { activeModel, activeFileUrl } from '../lib/bimApi'
import { inventoryIfc } from '../lib/ifcInventory'
import { runChecks, STATUS } from '../lib/briefCheck'

const STYLE = {
  pass: 'border-green-700 bg-green-50 text-green-900', warn: 'border-amber-600 bg-amber-50 text-amber-900',
  fail: 'border-red-700 bg-red-50 text-red-900', manual: 'border-line bg-vellum text-steel',
}
const MARK = { pass: '✓', warn: '!', fail: '✕', manual: '•' }

export default function BriefCheck() {
  const [state, setState] = useState({ s: 'Checking for the published model…' })

  useEffect(() => {
    let dead = false
    ;(async () => {
      const m = await activeModel()
      if (dead) return
      if (!m) return setState({ s: 'empty' })
      if (m.ext !== '.ifc') return setState({ s: 'glb' })
      setState({ s: 'Reading IFC…' })
      const inv = await inventoryIfc(await (await fetch(activeFileUrl(m.id))).arrayBuffer())
      if (!dead) setState({ s: 'ready', m, inv })
    })().catch((e) => setState({ s: 'error: ' + e.message }))
    return () => { dead = true }
  }, [])

  const results = useMemo(() => (state.inv ? runChecks(state.inv) : []), [state])
  const groups = useMemo(() => [...new Set(results.map((r) => r.group))], [results])
  const count = (k) => results.filter((r) => r.status === k).length

  if (state.s === 'empty') return <div className="p-8"><h1 className="text-xl font-bold">No model to check</h1><p className="mt-1 text-steel">Upload the IFC exported from your Revit model at /admin/bim first.</p></div>
  if (state.s === 'glb') return <div className="p-8"><h1 className="text-xl font-bold">IFC needed</h1><p className="mt-1 text-steel">The published file is a GLB, which has no BIM data to check. Upload an IFC export.</p></div>
  if (state.s !== 'ready') return <p className={`p-8 ${state.s.startsWith('error') ? 'text-red-700' : 'text-steel'}`}>{state.s}</p>

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-8">
      <h1 className="text-2xl font-bold">Brief check</h1>
      <p className="mt-1 text-sm text-steel">
        Compares <b>{state.m.originalName}</b> (version {state.m.version}) with the competition brief, using only level names, room names and element counts in the IFC.
        It cannot judge design quality, and "Found" does not mean the requirement is met.
      </p>
      <p className="mt-3 text-sm font-semibold" role="status">
        {count('pass')} found · {count('warn')} to check · {count('fail')} not found · {count('manual')} manual review
      </p>
      <p className="mt-1 text-xs text-steel">Uses are matched from Revit room names (for example Retail, Café, Living, Bedroom, Courtyard). Name your rooms clearly and re-export.</p>

      {groups.map((g) => (
        <section key={g} className="mt-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel">{g}</h2>
          <ul className="space-y-2">
            {results.filter((r) => r.group === g).map((r) => (
              <li key={r.label} className={`border-l-4 p-3 text-sm ${STYLE[r.status]}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{r.label}</span>
                  <span className="shrink-0 font-semibold"><span aria-hidden="true">{MARK[r.status]} </span>{STATUS[r.status]}</span>
                </div>
                <p className="mt-1">{r.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
