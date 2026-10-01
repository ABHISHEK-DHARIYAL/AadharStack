// Loads an uploaded IFC/GLB into three.js and exposes ONLY properties that exist in the file.
import * as THREE from 'three'
import * as WebIFC from 'web-ifc'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export const CATEGORIES = ['Architecture', 'Structure', 'Plumbing', 'Electrical', 'Other MEP', 'Rooms', 'Other']
const RULES = [
  ['Rooms', /^IFCSPACE$/],
  ['Structure', /^IFC(COLUMN|BEAM|MEMBER|FOOTING|PILE|REINFORCING)/],
  ['Plumbing', /^IFC(PIPE|SANITARYTERMINAL|WASTETERMINAL|TANK|VALVE|PUMP|FIRESUPPRESSION|STACKTERMINAL)/],
  ['Electrical', /^IFC(CABLE|ELECTRIC|LIGHTFIXTURE|OUTLET|SWITCHINGDEVICE|LAMP|SENSOR|ALARM|COMMUNICATIONSAPPLIANCE|PROTECTIVEDEVICE|JUNCTIONBOX)/],
  ['Other MEP', /^IFC(DUCT|AIRTERMINAL|FAN|FLOW|DISTRIBUTION|UNITARYEQUIPMENT|BOILER|CHILLER|COIL|DAMPER|HEATEXCHANGER)/],
  ['Architecture', /^IFC(WALL|DOOR|WINDOW|SLAB|ROOF|STAIR|RAILING|COVERING|CURTAINWALL|RAMP|PLATE|FURNISHING|BUILDINGELEMENTPROXY)/],
]
export const categoryOf = (t) => (RULES.find(([, re]) => re.test(t)) || ['Other'])[0]

const VALUE_KEYS = ['NominalValue', 'LengthValue', 'AreaValue', 'VolumeValue', 'CountValue', 'WeightValue']
const val = (i) => {
  for (const k of VALUE_KEYS) if (i[k] && i[k].value !== undefined && i[k].value !== null) return String(i[k].value)
  return null
}
const tx = (v) => (v && v.value !== undefined && v.value !== null && v.value !== '' ? String(v.value) : null)

export async function loadIfc(buffer) {
  const api = new WebIFC.IfcAPI()
  api.SetWasmPath('/', true)
  await api.Init()
  const modelID = api.OpenModel(new Uint8Array(buffer), { COORDINATE_TO_ORIGIN: true })

  const group = new THREE.Group()
  const byId = new Map()
  const mats = new Map()
  const spaceMat = new THREE.MeshStandardMaterial({ color: '#4c9be8', transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide })
  const matFor = (c) => {
    const k = `${c.x},${c.y},${c.z},${c.w}`
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: new THREE.Color(c.x, c.y, c.z), opacity: c.w, transparent: c.w < 1, side: THREE.DoubleSide }))
    return mats.get(k)
  }

  api.StreamAllMeshes(modelID, (fm) => {
    const id = fm.expressID
    let type = 'UNKNOWN'
    try { type = api.GetNameFromTypeCode(api.GetLineType(modelID, id)) } catch (_) { /* keep UNKNOWN */ }
    if (type === 'IFCOPENINGELEMENT') return
    const pgs = fm.geometries
    for (let i = 0; i < pgs.size(); i++) {
      const pg = pgs.get(i)
      const g = api.GetGeometry(modelID, pg.geometryExpressID)
      const verts = api.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize()).slice()
      const idx = api.GetIndexArray(g.GetIndexData(), g.GetIndexDataSize()).slice()
      g.delete()
      const bg = new THREE.BufferGeometry()
      const buf = new THREE.InterleavedBuffer(verts, 6)
      bg.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 3, 0))
      bg.setAttribute('normal', new THREE.InterleavedBufferAttribute(buf, 3, 3))
      bg.setIndex(new THREE.BufferAttribute(idx, 1))
      const mat = type === 'IFCSPACE' ? spaceMat : matFor(pg.color)
      const mesh = new THREE.Mesh(bg, mat)
      mesh.matrix.fromArray(pg.flatTransformation)
      mesh.matrixAutoUpdate = false
      mesh.userData = { expressID: id, type, category: categoryOf(type), mat }
      group.add(mesh)
      if (!byId.has(id)) byId.set(id, [])
      byId.get(id).push(mesh)
    }
  })
  group.rotation.x = -Math.PI / 2 // IFC is Z-up, three.js is Y-up

  // Building levels from the IFC spatial structure
  const levels = []
  try {
    const tree = await api.properties.getSpatialStructure(modelID, false)
    const walk = (n, fn) => { fn(n); (n.children || []).forEach((c) => walk(c, fn)) }
    walk(tree, (n) => {
      if (n.type !== 'IFCBUILDINGSTOREY') return
      const ids = new Set()
      walk(n, (c) => ids.add(c.expressID))
      const line = api.GetLine(modelID, n.expressID)
      levels.push({ id: n.expressID, name: tx(line.Name) || 'Unnamed level', elevation: line.Elevation && line.Elevation.value !== undefined ? line.Elevation.value : null, ids })
    })
    levels.sort((a, b) => (a.elevation ?? 0) - (b.elevation ?? 0))
  } catch (_) { /* levels stay empty -> "not available" */ }
  const levelOf = (id) => levels.find((l) => l.ids.has(id))

  const getProps = async (id) => {
    const line = api.GetLine(modelID, id)
    const lv = levelOf(id)
    const out = {
      title: tx(line.Name) || api.GetNameFromTypeCode(line.type),
      basic: [['IFC class', api.GetNameFromTypeCode(line.type)], ['Name', tx(line.Name)], ['Level', lv ? lv.name : null], ['GlobalId', tx(line.GlobalId)], ['Object type', tx(line.ObjectType)], ['Tag', tx(line.Tag)], ['Description', tx(line.Description)]],
      groups: [],
    }
    try {
      const ps = await api.properties.getPropertySets(modelID, id, true)
      ps.forEach((p) => {
        const items = p.HasProperties || p.Quantities || []
        const rows = items.map((i) => [tx(i.Name) || '—', val(i)])
        if (rows.length) out.groups.push({ name: tx(p.Name) || 'Property set', rows })
      })
    } catch (_) { /* no property sets */ }
    try {
      const ms = await api.properties.getMaterialsProperties(modelID, id, true)
      const names = ms.map((m) => tx(m.Name) || (m.ForLayerSet && tx(m.ForLayerSet.LayerSetName))).filter(Boolean)
      if (names.length) out.basic.push(['Material', names.join(', ')])
    } catch (_) { /* no materials */ }
    return out
  }

  const getFloorInfo = async (lv) => {
    const spaces = [...lv.ids].filter((id) => byId.get(id)?.[0]?.userData.type === 'IFCSPACE')
    let area = 0, found = 0
    for (const id of spaces) {
      try {
        const ps = await api.properties.getPropertySets(modelID, id, true)
        for (const p of ps) for (const q of p.Quantities || []) {
          if (/^(net|gross)?floorarea$/i.test(tx(q.Name) || '') && q.AreaValue) { area += q.AreaValue.value; found++; break }
        }
      } catch (_) { /* skip */ }
    }
    const i = levels.indexOf(lv)
    const next = levels[i + 1]
    return {
      name: lv.name,
      rows: [
        ['Elevation (model units)', lv.elevation],
        ['Height to next level (model units)', next && lv.elevation !== null && next.elevation !== null ? next.elevation - lv.elevation : null],
        ['Rooms (IfcSpace)', spaces.length ? spaces.length : null],
        ['Area (sum of room floor areas)', found ? area.toFixed(2) : null],
      ],
    }
  }

  return { kind: 'ifc', group, byId, levels, getProps, getFloorInfo }
}

export function loadGlb(buffer) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(buffer, '', (gltf) => {
      const group = gltf.scene
      const byId = new Map()
      group.traverse((o) => {
        if (!o.isMesh) return
        o.userData = { expressID: o.id, type: 'GLB mesh', category: 'Other', mat: o.material }
        byId.set(o.id, [o])
      })
      const getProps = async (id) => {
        const o = byId.get(id)[0]
        return { title: o.name || 'Mesh', basic: [['Name', o.name || null], ['Format', 'GLB — IFC/BIM properties are not embedded, upload the IFC for full data']], groups: [] }
      }
      resolve({ kind: 'glb', group, byId, levels: [], getProps, getFloorInfo: async () => null })
    }, reject)
  })
}
