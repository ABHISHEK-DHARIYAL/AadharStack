// Model version registry. JSON file for development; swap for Postgres in production
// (same fields: id, version, originalName, storedName, ext, size, uploadedAt, uploadedBy, status, error, schema, active, archived).
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage'));
const FILES = path.join(DIR, 'models');
const DB = path.join(DIR, 'models.json');
fs.mkdirSync(FILES, { recursive: true });

const read = () => (fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : { models: [] });
const write = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));

module.exports = {
  FILES,
  list: () => read().models,
  active: () => read().models.find((m) => m.active && m.status === 'ready' && !m.archived) || null,
  get: (id) => read().models.find((m) => m.id === id) || null,
  add(m) {
    const d = read();
    m.version = Math.max(0, ...d.models.map((x) => x.version)) + 1;
    d.models.push(m);
    write(d);
    return m;
  },
  update(id, patch) {
    const d = read();
    const m = d.models.find((x) => x.id === id);
    if (!m) return null;
    Object.assign(m, patch);
    write(d);
    return m;
  },
  activate(id) {
    const d = read();
    const m = d.models.find((x) => x.id === id);
    if (!m || m.status !== 'ready' || m.archived) return null;
    d.models.forEach((x) => { x.active = x.id === id; });
    write(d);
    return m;
  },
};
