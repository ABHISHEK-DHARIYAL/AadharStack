# SIH26116 · Revit companion viewer (B+G+9 mixed-use)

A **companion tool** for the Autodesk Revit challenge *Urban Mixed-Use Design Challenge* (B+G+9). It helps you view, check and document a building that **you design and model yourself in Autodesk Revit**.

## What this repository is and is not

- The competition deliverable is the **Autodesk Revit model** (.rvt), made by the team in Revit, plus drawings, renders, the 30-second walkthrough and the PPT.
- This repository is **not** the design and **not** a Revit model. It contains no building design, no generated geometry and no sample building.
- Everything the app shows comes from files **you** upload (an IFC exported from your own Revit model) or notes **you** type.
- The workflow and slide prompts are questions and checklists only. They contain no design content.

## Tabs

1. **Revit workflow:** checklist built from the problem statement (basement, ground, first floor, residential 2 to 9, courtyard, facade options, structure, structural documentation, finishes, visuals, optional Forma, submission compliance), with notes and export/import of progress. Facade items are options to consider, not a chosen design.
2. **Uploaded Revit model (IFC):** 3D viewer for the IFC or GLB published at `/admin/bim`.
3. **Brief check:** compares the uploaded IFC with the brief using only storey names, room names and element counts (columns, beams, slabs, stairs, ramps, railings, coverings, curtain walls, rebar). Results are Found / Check / Not found, plus a manual-review list for what no file check can judge. "Found" never means a requirement is met. Name your Revit rooms clearly (Retail, Café, Living, Bedroom, Courtyard, Balcony) before exporting.
4. **PPT outline:** seven slide sections with prompt questions, a notes box for your own words and image slots for file or view names. Export as Markdown or save a JSON backup.

5. **Showcase:** an empty gallery for your own renders, drawings, Forma studies and the walkthrough video, in sections taken from the brief. You add the files exported from Revit and write the captions. The walkthrough tile shows the video length against the 30-second target. Files are stored in this browser (IndexedDB) only, so keep your originals. AI-generated images are not allowed by the competition.

Ticks, notes and gallery files are stored in the browser only (localStorage), so export a backup.

## Project layout

```
backend/    Express API: login, IFC/GLB upload, versioning
  routes/bim.js, lib/auth.js, lib/models.js
  revit/export_to_json.py   optional pyRevit data export from your real model (not loaded by the app)
frontend/   React + Vite + React Three Fiber + Tailwind
  src/components/  Workflow, ModelViewer, BriefCheck, SlideOutline, Showcase, AdminBim
  src/lib/         workflow.js, slides.js, showcase.js, mediaStore.js, briefCheck.js, ifcInventory.js, ifcLoader.js, bimApi.js
```

## Run

```bash
cd backend && cp .env.example .env && npm install && npm run dev      # http://localhost:5000
cd frontend && cp .env.example .env && npm install && npm run dev     # http://localhost:5173
```

Set `VITE_API_URL` in `frontend/.env`. Open `/admin/bim`, sign in with `ADMIN_PASSWORD`, and upload your IFC.

## Using your Revit model

1. Design and model the building in Revit.
2. File > Export > IFC (IFC4 or IFC2x3, with property sets, base quantities and rooms/spaces enabled).
3. Upload the `.ifc` (or `.glb`) at `/admin/bim`. The newest valid upload becomes the active model.
4. Open **Uploaded Revit model** to view it and **Brief check** to compare it with the brief.
5. Optional: run `backend/revit/export_to_json.py` in pyRevit for a JSON data export (levels, rooms, element boxes, grids, counts including rebar). It has not been run inside Revit yet, so test it on your model.

## Environment

Backend: `ADMIN_PASSWORD`, `AUTH_SECRET`, optional `CORS_ORIGIN`, `STORAGE_DIR`, `MAX_UPLOAD_MB`.
Frontend: `VITE_API_URL` (required).

Storage is local disk (`backend/storage`) plus `models.json` for development. For production use a host with a persistent disk, or move files to S3/R2 and metadata to Postgres.

## Deploy

`cd frontend && npm run build`, then deploy `frontend/` to Vercel (framework: Vite). The model tabs need the backend running.

## Status

All planned phases are complete. The remaining work is yours: model the building in Revit, produce the reinforcement drawing, renders and the 30-second walkthrough, write the PPT, then upload your IFC and run the Brief check.
