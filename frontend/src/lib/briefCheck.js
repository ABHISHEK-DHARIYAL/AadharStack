// Compares what an uploaded IFC contains with the competition brief.
// It checks names and counts only. It cannot judge design quality, daylight, ventilation or the facade,
// and a pass never means the brief is satisfied. Those remain manual reviews.
const RX = {
  commercial: /retail|shop|store|caf[eé]|restaurant|commercial|community|office|lobby|reception|showroom|kiosk/i,
  resi: /bed|living|kitchen|toilet|bath|wc|apartment|flat|unit|dwelling|residen|lounge|dining|master/i,
  parking: /park|garage|vehicle|car\b/i,
  ev: /\bev\b|charg/i,
  ramp: /ramp/i,
  service: /service|plant|pump|electrical|mep|store room|utility|shaft|generator/i,
  court: /courtyard|court\b|landscape|garden|atrium|planter/i,
  balcony: /balcon|terrace|deck|sit[- ]?out|verandah/i,
  roof: /roof|parapet|terrace level|mumty|headroom/i,
}
const text = (s) => `${s.name} ${s.longName}`
const has = (lv, re) => lv.spaces.filter((s) => re.test(text(s)))

export const STATUS = { pass: 'Found', warn: 'Check', fail: 'Not found', manual: 'Manual review' }

export function runChecks(inv) {
  const out = []
  const add = (group, label, status, detail) => out.push({ group, label, status, detail })
  const all = inv.levels
  const storeys = all.filter((l) => !RX.roof.test(l.name))
  const t = inv.totals

  // ---- levels
  const gi = storeys.findIndex((l) => (l.elevation ?? -1) >= 0)
  const basements = gi > 0 ? storeys.slice(0, gi) : []
  add('Levels', 'B+G+9 = 11 storeys', storeys.length >= 11 ? 'pass' : 'fail',
    `${storeys.length} storeys found (${storeys.map((l) => l.name).join(', ') || 'none'}). The brief needs basement, ground and 9 upper floors.`)
  add('Levels', 'One basement level below ground', basements.length >= 1 ? 'pass' : 'fail',
    basements.length ? `Below ground: ${basements.map((l) => l.name).join(', ')}` : 'No storey with a negative elevation was found.')

  const ground = gi >= 0 ? storeys[gi] : null
  const first = gi >= 0 ? storeys[gi + 1] : null
  const resi = gi >= 0 ? storeys.slice(gi + 2, gi + 10) : []
  if (!inv.spaces.length) add('Rooms', 'Rooms (IfcSpace) exist', 'fail', 'No IfcSpace found. Place Revit Rooms and export with "Export rooms" enabled so uses can be checked.')
  else add('Rooms', 'Rooms (IfcSpace) exist', 'pass', `${inv.spaces.length} rooms found, ${inv.spaces.filter((s) => !s.level).length} not assigned to a level.`)

  // ---- basement
  const bs = basements.flatMap((l) => l.spaces)
  const bsHas = (re) => bs.filter((s) => re.test(text(s))).length
  add('Basement', 'Parking', bsHas(RX.parking) ? 'pass' : 'fail', `${bsHas(RX.parking)} rooms named like parking in the basement`)
  add('Basement', 'EV charging', bsHas(RX.ev) ? 'pass' : 'fail', `${bsHas(RX.ev)} rooms named like EV / charging in the basement`)
  add('Basement', 'Ramp', bsHas(RX.ramp) || t.ramps ? 'pass' : 'fail', `${t.ramps} ramp elements, ${bsHas(RX.ramp)} rooms named ramp`)
  add('Basement', 'Services', bsHas(RX.service) ? 'pass' : 'warn', `${bsHas(RX.service)} rooms named like services / plant`)

  // ---- podium
  for (const [lv, label] of [[ground, 'Ground floor'], [first, 'First floor']]) {
    if (!lv) { add('Podium', `${label} commercial / community use`, 'fail', 'Level not identified'); continue }
    const c = has(lv, RX.commercial)
    add('Podium', `${label} commercial / community use`, c.length ? 'pass' : 'fail',
      c.length ? `${c.length} rooms, e.g. ${c.slice(0, 3).map(text).join('; ')}` : `No room on ${lv.name} is named retail, café, community, office or similar.`)
  }
  if (ground) {
    const c = has(ground, RX.court)
    add('Courtyard', 'Courtyard room at ground', c.length ? 'pass' : 'fail', c.length ? c.map(text).slice(0, 3).join('; ') : 'No room named courtyard / landscape / garden on the ground level.')
  }
  add('Courtyard', 'Courtyard on upper levels', storeys.some((l) => has(l, RX.court).length) && storeys.filter((l) => has(l, RX.court).length).length > 1 ? 'pass' : 'warn',
    `Rooms named like courtyard / landscape appear on ${storeys.filter((l) => has(l, RX.court).length).length} levels`)

  // ---- residential
  if (resi.length < 8) add('Residential', '8 residential levels (2nd to 9th)', 'fail', `${resi.length} levels found above the first floor`)
  const missing = resi.filter((l) => !has(l, RX.resi).length).map((l) => l.name)
  add('Residential', 'Residential rooms on every level 2–9', resi.length && !missing.length ? 'pass' : 'fail',
    missing.length ? `No residential-named rooms on: ${missing.join(', ')}` : resi.length ? `Found on all ${resi.length} levels` : 'Nothing to check')
  const offend = resi.filter((l) => has(l, RX.commercial).some((s) => !RX.resi.test(text(s)))).map((l) => l.name)
  add('Residential', 'No commercial rooms on residential floors', offend.length ? 'warn' : 'pass', offend.length ? `Commercial-looking names on: ${offend.join(', ')} (lobbies and cores may be fine)` : 'None found')
  const noBal = resi.filter((l) => !has(l, RX.balcony).length).map((l) => l.name)
  add('Residential', 'Balconies / terraces on levels 2–9', resi.length && !noBal.length ? 'pass' : 'warn',
    noBal.length ? `No balcony-named rooms on: ${noBal.join(', ')}. Balconies modelled only as slabs are not detected.` : 'Found on all residential levels')

  // ---- structure
  add('Structure', 'Columns', t.columns ? 'pass' : 'fail', `${t.columns} IfcColumn`)
  add('Structure', 'Beams', t.beams ? 'pass' : 'fail', `${t.beams} IfcBeam`)
  add('Structure', 'Slabs', t.slabs ? 'pass' : 'fail', `${t.slabs} IfcSlab`)
  const noSlab = storeys.filter((l) => !l.counts.slabs).map((l) => l.name)
  add('Structure', 'A slab on every storey', storeys.length && !noSlab.length ? 'pass' : 'warn', noSlab.length ? `No slab assigned to: ${noSlab.join(', ')}` : 'Every storey has a slab')
  add('Structure', 'Stairs', t.stairs ? 'pass' : 'fail', `${t.stairs} stair elements`)
  add('Structure', 'Walls / core', t.walls ? 'pass' : 'warn', `${t.walls} walls`)
  add('Structure', 'Foundations', t.footings ? 'pass' : 'warn', `${t.footings} footings / piles (only needed where appropriate)`)
  add('Structure', 'Reinforcement (rebar)', t.rebar ? 'pass' : 'warn',
    t.rebar ? `${t.rebar} rebar items` : 'None in the IFC. Revit exports rebar only when enabled, so check your Revit sheets instead.')

  // ---- finishes and facade
  add('Finishes', 'Floor finishes (IfcCovering)', t.coverings ? 'pass' : 'warn', `${t.coverings} coverings. Tiles modelled as floor layers are not detected here.`)
  add('Facade', 'Facade elements present', t.curtain + t.members + t.plates ? 'pass' : 'warn',
    `${t.curtain} curtain walls, ${t.members} members (fins / mullions), ${t.plates} plates, ${t.railings} railings. This only shows elements exist.`)

  // ---- things no IFC check can decide
  for (const m of ['Facade responds to light, heat and ventilation', 'Courtyard quality: daylight, cross ventilation, planting, seating', 'Facade and massing blend with the urban context', 'Render quality and visual storytelling',
    'Apartment daylight, privacy and views', 'Structural reinforcement detailing on one floor', 'Renders, 30-second walkthrough, PPT'])
    add('Manual', m, 'manual', 'Cannot be checked from an IFC. Review it yourself, then tick it in the Revit workflow tab.')
  return out
}
