const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireAdmin } = require('../lib/auth');
const store = require('../lib/models');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: store.FILES,
    filename: (_q, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname).toLowerCase()),
  }),
  limits: { fileSize: (+process.env.MAX_UPLOAD_MB || 500) * 1024 * 1024 },
  fileFilter: (_q, f, cb) => (/\.(ifc|glb|gltf)$/i.test(f.originalname) ? cb(null, true) : cb(new Error('Only .ifc, .glb and .gltf files are accepted'))),
});

const pub = ({ storedName, ...m }) => m;

// "Processing": verify the file really is IFC/GLB/glTF and read the IFC schema from its header.
function inspect(file, ext) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(8192);
  const n = fs.readSync(fd, buf, 0, 8192, 0);
  fs.closeSync(fd);
  const head = buf.toString('latin1', 0, n);
  if (ext === '.ifc') {
    if (!head.includes('ISO-10303-21')) throw new Error('Not a valid IFC (STEP) file');
    const s = head.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
    if (!s) throw new Error('IFC header has no FILE_SCHEMA');
    return { schema: s[1] };
  }
  if (ext === '.glb') {
    if (!head.startsWith('glTF')) throw new Error('Not a valid GLB file');
    return { schema: 'glTF 2.0 (binary)' };
  }
  if (!head.includes('"asset"')) throw new Error('Not a valid glTF file');
  return { schema: 'glTF 2.0' };
}

// ---- Public
router.get('/active', (_q, r) => { const m = store.active(); r.json(m ? pub(m) : null); });
router.get('/active/file', (_q, res) => {
  const m = store.active();
  if (!m) return res.status(404).json({ error: 'No active model' });
  res.type('application/octet-stream').sendFile(path.join(store.FILES, m.storedName));
});

// ---- Admin only
router.get('/models', requireAdmin, (_q, r) => r.json(store.list().map(pub).reverse()));

router.post('/models', requireAdmin, (q, res, next) => upload.single('file')(q, res, (e) => (e ? res.status(400).json({ error: e.message }) : next())), (q, res) => {
  if (!q.file) return res.status(400).json({ error: 'No file received' });
  const ext = path.extname(q.file.originalname).toLowerCase();
  const rec = store.add({
    id: path.basename(q.file.filename, ext), originalName: q.file.originalname, storedName: q.file.filename, ext,
    size: q.file.size, uploadedAt: new Date().toISOString(), uploadedBy: q.user, status: 'processing', active: false, archived: false,
  });
  try {
    const info = inspect(path.join(store.FILES, rec.storedName), ext);
    store.update(rec.id, { status: 'ready', ...info });
    store.activate(rec.id); // newest valid version becomes active
  } catch (e) {
    store.update(rec.id, { status: 'failed', error: e.message });
  }
  res.status(201).json(pub(store.get(rec.id)));
});

router.post('/models/:id/activate', requireAdmin, (q, res) => {
  const m = store.activate(q.params.id);
  m ? res.json(pub(m)) : res.status(400).json({ error: 'Only ready, non-archived versions can be activated' });
});

router.post('/models/:id/archive', requireAdmin, (q, res) => {
  const m = store.get(q.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (m.active) return res.status(400).json({ error: 'Activate another version before archiving the active one' });
  res.json(pub(store.update(m.id, { archived: true })));
});

module.exports = router;
