// Reads an uploaded IFC and counts what is actually in it (no geometry, so it is fast).
// Nothing is guessed: if the file has no data for something, the count is 0 or the field is null.
import * as WebIFC from 'web-ifc'

const CLASSES = {
  columns: ['IFCCOLUMN'], beams: ['IFCBEAM'], slabs: ['IFCSLAB'], stairs: ['IFCSTAIR', 'IFCSTAIRFLIGHT'],
  ramps: ['IFCRAMP', 'IFCRAMPFLIGHT'], railings: ['IFCRAILING'], coverings: ['IFCCOVERING'],
  walls: ['IFCWALL', 'IFCWALLSTANDARDCASE'], curtain: ['IFCCURTAINWALL'], members: ['IFCMEMBER'], plates: ['IFCPLATE'],
  footings: ['IFCFOOTING', 'IFCPILE'], rebar: ['IFCREINFORCINGBAR', 'IFCREINFORCINGMESH'], spaces: ['IFCSPACE'],
}
const tx = (v) => (v && v.value !== undefined && v.value !== null && v.value !== '' ? String(v.value) : '')

export async function inventoryIfc(buffer) {
  const api = new WebIFC.IfcAPI()
  api.SetWasmPath('/', true)
  await api.Init()
  const id = api.OpenModel(new Uint8Array(buffer))
  try {
    const idsOf = (names) => names.flatMap((n) => {
      const code = WebIFC[n]
      if (code === undefined) return []
      const v = api.GetLineIDsWithType(id, code)
      return Array.from({ length: v.size() }, (_, i) => v.get(i))
    })
    const byClass = Object.fromEntries(Object.entries(CLASSES).map(([k, names]) => [k, idsOf(names)]))
    const totals = Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, v.length]))

    // level membership from the IFC spatial structure
    const levels = []
    const levelOf = new Map()
    try {
      const tree = await api.properties.getSpatialStructure(id, false)
      const walk = (n, fn) => { fn(n); (n.children || []).forEach((c) => walk(c, fn)) }
      walk(tree, (n) => {
        if (n.type !== 'IFCBUILDINGSTOREY') return
        const line = api.GetLine(id, n.expressID)
        const lv = { name: tx(line.Name) || 'Unnamed level', elevation: line.Elevation && line.Elevation.value !== undefined ? line.Elevation.value : null, counts: {}, spaces: [] }
        levels.push(lv)
        walk(n, (c) => levelOf.set(c.expressID, lv))
      })
      levels.sort((a, b) => (a.elevation ?? 0) - (b.elevation ?? 0))
    } catch (_) { /* no spatial structure */ }

    for (const [k, ids] of Object.entries(byClass)) {
      if (k === 'spaces') continue
      ids.forEach((e) => { const lv = levelOf.get(e); if (lv) lv.counts[k] = (lv.counts[k] || 0) + 1 })
    }
    const spaces = byClass.spaces.map((e) => {
      const line = api.GetLine(id, e)
      const lv = levelOf.get(e) || null
      const s = { name: tx(line.Name), longName: tx(line.LongName), level: lv ? lv.name : null }
      if (lv) lv.spaces.push(s)
      return s
    })
    return { levels, totals, spaces }
  } finally {
    try { api.CloseModel(id) } catch (_) { /* ignore */ }
  }
}
