const express = require('express');
const cors = require('cors');
const { login } = require('./lib/auth');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));

app.post('/api/auth/login', login);
app.use('/api/bim', require('./routes/bim'));
app.get('/api/health', (_q, r) => r.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`BIM API on http://localhost:${PORT}`));
