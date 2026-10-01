import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { activeModel, activeFileUrl } from '../lib/bimApi'
import { loadIfc, loadGlb, CATEGORIES } from '../lib/ifcLoader'

const HIGHLIGHT = new THREE.MeshStandardMaterial({ color: '#F26B21', emissive: '#F26B21', emissiveIntensity: 0.5, side: THREE.DoubleSide })
const NA = 'Not available in model'

function Scene({ model, onPick }) {
  const { camera } = useThree()
  const controls = useRef()
  useEffect(() => {
    model.group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model.group)
    const c = box.getCenter(new THREE.Vector3())
    const r = Math.max(...box.getSize(new THREE.Vector3()).toArray()) || 10
    camera.position.set(c.x + r, c.y + r * 0.7, c.z + r)
    camera.near = r / 1000
    camera.far = r * 30
    camera.updateProjectionMatrix()
    controls.current.target.copy(c)
    controls.current.update()
  }, [model, camera])
  return (
    <>
      <OrbitControls ref={controls} makeDefault />
      <primitive object={model.group} onClick={(e) => {
        e.stopPropagation()
        const hit = e.intersections.find((i) => i.object.visible)
        if (hit) onPick(hit.object.userData.expressID)
      }} />
    </>
  )
}

const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3 border-b border-line py-1.5 text-sm">
    <dt className="text-steel">{k}</dt>
    <dd className={`text-right ${v === null || v === undefined ? 'text-steel/70 italic' : 'font-medium'}`}>{v === null || v === undefined ? NA : String(v)}</dd>
  </div>
)

export default function ModelViewer() {
  const [meta, setMeta] = useState(null)
  const [status, setStatus] = useState('Checking for the published model…')
  const [model, setModel] = useState(null)
  const [cats, setCats] = useState({})
  const [level, setLevel] = useState(null)
  const [selId, setSelId] = useState(null)
  const [info, setInfo] = useState(null)
  const [floorInfo, setFloorInfo] = useState(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      const m = await activeModel()
      if (dead) return
      if (!m) return setStatus('empty')
      setMeta(m)
      setStatus('Downloading model…')
      const buf = await (await fetch(activeFileUrl(m.id))).arrayBuffer()
      if (dead) return
      setStatus('Reading BIM data…')
      const res = m.ext === '.ifc' ? await loadIfc(buf) : await loadGlb(buf)
      if (dead) return
      setModel(res)
      setCats(Object.fromEntries(CATEGORIES.map((c) => [c, c !== 'Rooms'])))
      setStatus('ready')
    })().catch((e) => setStatus('error: ' + e.message))
    return () => { dead = true }
  }, [])

  const present = useMemo(() => {
    if (!model) return []
    const s = new Set()
    model.group.traverse((o) => o.isMesh && s.add(o.userData.category))
    return CATEGORIES.filter((c) => s.has(c))
  }, [model])

  // category + floor visibility
  useEffect(() => {
    if (!model) return
    model.group.traverse((o) => {
      if (!o.isMesh) return
      const { category, expressID } = o.userData
      o.visible = !!cats[category] && (!level || level.ids.has(expressID))
    })
  }, [model, cats, level])

  // selection highlight + properties
  useEffect(() => {
    if (!model) return
    model.byId.forEach((ms) => ms.forEach((m) => { m.material = m.userData.mat }))
    if (selId === null) return setInfo(null)
    model.byId.get(selId)?.forEach((m) => { m.material = HIGHLIGHT })
    model.getProps(selId).then(setInfo).catch(() => setInfo({ title: 'Element', basic: [], groups: [] }))
  }, [model, selId])

  const pickLevel = async (lv) => {
    setLevel(lv)
    setSelId(null)
    setFloorInfo(lv ? await model.getFloorInfo(lv) : null)
  }

  if (status === 'empty') return <div className="p-8"><h1 className="text-xl font-bold">No BIM model published yet</h1><p className="mt-1 text-steel">An administrator needs to upload an IFC exported from Revit at /admin/bim.</p></div>
  if (status !== 'ready') return <p className={`p-8 ${status.startsWith('error') ? 'text-red-700' : 'text-steel'}`}>{status}</p>

  return (
    <div className="grid h-full lg:grid-cols-[220px_minmax(0,1fr)_340px]">
      <aside className="overflow-y-auto border-b border-line bg-paper p-3 lg:border-b-0 lg:border-r">
        <p className="text-sm font-bold">Version {meta.version}</p>
        <p className="mb-4 break-all text-xs text-steel">{meta.originalName}<br />{new Date(meta.uploadedAt).toLocaleDateString()} · {meta.schema}</p>
        <h2 className="mb-2 text-sm font-bold">Floors</h2>
        {model.levels.length === 0 ? <p className="text-xs italic text-steel">Levels are {NA.toLowerCase()}</p> : (
          <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-1">
            {[null, ...model.levels].map((l) => (
              <button key={l ? l.id : 'all'} onClick={() => pickLevel(l)} className={`rounded-sm border px-3 py-1.5 text-left text-sm ${level === l ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-steel'}`}>{l ? l.name : 'All floors'}</button>
            ))}
          </div>
        )}
        <h2 className="mb-2 mt-5 text-sm font-bold">Categories</h2>
        {present.map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
            <input type="checkbox" checked={!!cats[c]} onChange={() => setCats({ ...cats, [c]: !cats[c] })} className="accent-[#F26B21]" />{c}
          </label>
        ))}
      </aside>

      <section className="relative h-[55vh] min-h-[380px] lg:h-full">
        <Canvas camera={{ fov: 40 }} style={{ background: '#DDE2DC' }} onPointerMissed={() => setSelId(null)}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[50, 80, 40]} intensity={1.1} />
          <directionalLight position={[-40, 30, -50]} intensity={0.4} />
          <Scene model={model} onPick={setSelId} />
        </Canvas>
        <p className="pointer-events-none absolute bottom-2 left-3 text-xs text-steel">Drag to rotate · scroll to zoom · right-drag to pan · click an element</p>
      </section>

      <aside className="overflow-y-auto border-t border-line bg-paper p-4 lg:border-l lg:border-t-0">
        {info ? (
          <div>
            <h2 className="text-lg font-bold">{info.title}</h2>
            <dl className="mt-2">{info.basic.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl>
            {info.groups.map((g) => (
              <div key={g.name} className="mt-4">
                <h3 className="text-sm font-bold">{g.name}</h3>
                <dl>{g.rows.map(([k, v], i) => <Row key={k + i} k={k} v={v} />)}</dl>
              </div>
            ))}
            {info.groups.length === 0 && <p className="mt-3 text-sm italic text-steel">Property sets: {NA.toLowerCase()}</p>}
          </div>
        ) : floorInfo ? (
          <div>
            <h2 className="text-lg font-bold">{floorInfo.name}</h2>
            <dl className="mt-2">{floorInfo.rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl>
            <p className="mt-3 text-xs text-steel">Values are shown exactly as stored in the IFC; units follow the model's unit settings.</p>
          </div>
        ) : (
          <p className="text-sm text-steel">Select a floor for its details, or click any element in the model to see its BIM properties.</p>
        )}
      </aside>
    </div>
  )
}
