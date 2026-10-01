// Revit workflow checklist for SIH26116. Items come from the problem statement.
// This is a tracking list only: it does not choose or generate any design.
// kind: 'req' counts toward progress, 'opt' is optional / a design option the team may or may not use.
const r = (id, t) => ({ id, t, kind: 'req' })
const o = (id, t) => ({ id, t, kind: 'opt' })

export const GROUPS = [
  { id: 'basement', title: 'Basement (B1) · modelled in Revit', items: [
    r('b-park', 'Car parking bays laid out'), r('b-ev', 'EV charging spaces'), r('b-circ', 'Vehicle circulation'),
    r('b-ramp', 'Ramp'), r('b-serv', 'Services rooms'), r('b-grid', 'Structural grid'), r('b-core', 'Building core (stairs, lifts, shafts)'),
  ] },
  { id: 'ground', title: 'Ground floor · commercial', items: [
    r('g-retail', 'Retail shops'), r('g-cafe', 'Café'), r('g-comm', 'Community / public space'), r('g-entry', 'Main entrance'),
    r('g-lobby', 'Reception / lobby where appropriate'), r('g-court', 'Central landscaped courtyard at ground'), r('g-ped', 'Pedestrian circulation'),
  ] },
  { id: 'first', title: 'First floor · commercial / community', items: [
    r('f-use', 'Commercial or community spaces (café, retail, office, community)'), r('f-vis', 'Visual connection to the courtyard'),
    r('f-bal', 'Balcony / terrace interfaces'), r('f-land', 'Landscape elements around the courtyard'),
  ] },
  { id: 'resi', title: '2nd–9th floors · residential', items: [
    r('r-apt', 'Apartment layouts'), r('r-circ', 'Efficient circulation'), r('r-rooms', 'Bedrooms, living, kitchen, toilets'),
    r('r-bal', 'Balconies'), r('r-day', 'Natural daylight'), r('r-vent', 'Natural ventilation'), r('r-priv', 'Privacy'), r('r-view', 'Views to exterior / courtyard'),
  ] },
  { id: 'court', title: 'Central courtyard · defining feature', items: [
    r('c-day', 'Daylight penetration'), r('c-vent', 'Cross ventilation'), r('c-plant', 'Trees / planting'), r('c-seat', 'Seating'),
    r('c-vis', 'Visual connection between floors'), r('c-terr', 'Green terraces / balconies onto the courtyard'), r('c-well', 'Occupant wellbeing considered'),
  ] },
  { id: 'facade', title: 'Facade · options to consider (you choose and model manually)', note: 'Tick what your own design uses. Nothing here is a recommendation.', items: [
    o('x-fins', 'Vertical fins'), o('x-sun', 'Horizontal sunshades'), o('x-rec', 'Recessed glazing'), o('x-bal', 'Balconies'),
    o('x-plant', 'Green planter boxes'), o('x-terr', 'Green terraces'), o('x-perf', 'Perforated screens'), o('x-shade', 'Other shading devices'),
    o('x-split', 'Different treatment for commercial and residential floors'),
    r('x-daylight', 'Facade strategy addresses daylight'), r('x-heat', 'Facade strategy addresses heat'), r('x-vent', 'Facade strategy addresses ventilation'),
    r('x-urban', 'Facade and massing blend with the surrounding urban context'),
    r('x-model', 'Final facade modelled in Revit'),
  ] },
  { id: 'struct', title: 'Structure · in the Revit model', items: [
    r('s-col', 'Structural columns'), r('s-beam', 'Beams'), r('s-slab', 'Slabs'), r('s-core', 'Structural walls / core where appropriate'),
    r('s-stair', 'Stairs'), r('s-found', 'Foundations where appropriate'),
  ] },
  { id: 'sdoc', title: 'Structural documentation', items: [
    r('d-plan', 'Structural plans'), r('d-beam', 'Beam layout'), r('d-col', 'Column layout'), r('d-slab', 'Slab layout'), r('d-dim', 'Dimensions'),
    r('d-sec', 'Sections'), r('d-rebar', 'Reinforcement drawings'), r('d-detail', 'Rebar details'), r('d-sched', 'Schedules'),
    r('d-floor', 'One complete reinforced floor with detailing'),
  ] },
  { id: 'finish', title: 'Floor finishes', items: [
    r('fi-tile', 'Tile flooring'), r('fi-int', 'Interior floor finishes'), r('fi-pave', 'Exterior paving'), r('fi-court', 'Courtyard landscape surfaces'),
  ] },
  { id: 'visual', title: 'Visuals and animation', items: [
    r('v-ext', 'Exterior render'), r('v-court', 'Courtyard render'), r('v-fac', 'Facade render'), r('v-com', 'Commercial-floor render'),
    r('v-res', 'Residential render'), r('v-diag', 'Architectural diagrams'), r('v-fstud', 'Facade studies'), r('v-sdiag', 'Structural diagrams'),
    r('v-walk', '30-second walkthrough'),
    r('v-story', 'Render quality and visual storytelling reviewed (key evaluation criteria)'),
  ] },
  { id: 'forma', title: 'Optional · Autodesk Forma studies', items: [
    o('m-sun', 'Sun study'), o('m-wind', 'Wind study'), o('m-orient', 'Site orientation'), o('m-mass', 'Massing strategies'),
  ] },
  { id: 'comply', title: 'Submission and compliance', items: [
    r('z-rvt', 'Final deliverable is an Autodesk Revit model (B+G+9)'), r('z-own', 'Model created by the team inside Revit'),
    r('z-nocopy', 'Nothing copied or downloaded from another model'), r('z-noai', 'No AI-generated design content submitted'),
    r('z-nopre', 'No pre-designed files used'), r('z-plot', 'Plot size and dimensions assumed and stated (mm)'),
    r('z-ppt', 'PPT explaining the final project prepared'), r('z-link', 'Walkthrough video link added where the submission form asks'),
    r('z-marks', 'Official marking criteria table obtained and checked against the deliverables'), r('z-form', 'Faculty (SIH SPOC) form requested'),
  ] },
]

export const STORE_KEY = 'sih26116-workflow-v1'
export const allItems = () => GROUPS.flatMap((g) => g.items)
