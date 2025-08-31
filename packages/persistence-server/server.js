import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PERSIST_PORT || 4000;
const HOST = process.env.PERSIST_HOST || '0.0.0.0';
const DATA_DIR = process.env.PERSIST_DATA_DIR || path.resolve(process.cwd(), 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));

function userFile(_userId) {
  // Global mode: single state shared by all clients
  return path.join(DATA_DIR, `global.json`);
}

function readState(userId) {
  const f = userFile(userId);
  if (!fs.existsSync(f)) return null;
  try {
    const raw = fs.readFileSync(f, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read state', e);
    return null;
  }
}

function writeState(userId, state) {
  const f = userFile(userId);
  fs.writeFileSync(f, JSON.stringify(state), 'utf-8');
}

// GET full state
app.get('/api/state', (req, res) => {
  const userId = req.query.userId || 'default';
  const state = readState(userId);
  if (!state) return res.status(200).json({});
  return res.json(state);
});

// POST full state replace
app.post('/api/state', (req, res) => {
  const userId = (req.query.userId || 'default');
  const state = req.body || {};
  writeState(userId, state);
  return res.status(204).end();
});

// PATCH partial state merge
app.patch('/api/state', (req, res) => {
  const userId = (req.query.userId || 'default');
  const prev = readState(userId) || {};
  const next = { ...prev, ...req.body };
  writeState(userId, next);
  return res.status(204).end();
});

// Specific slices helpers
const slices = ['dataset', 'filters', 'appearance', 'layout', 'file', 'preferences', 'session', 'user'];
for (const slice of slices) {
  app.get(`/api/${slice}`, (req, res) => {
    const userId = req.query.userId || 'default';
    const state = readState(userId) || {};
    return res.json(state[slice] ?? null);
  });
  app.post(`/api/${slice}`, (req, res) => {
    const userId = req.query.userId || 'default';
    const prev = readState(userId) || {};
    prev[slice] = req.body ?? null;
    writeState(userId, prev);
    return res.status(204).end();
  });
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, HOST, () => {
  console.log(`Persistence server listening on http://${HOST}:${PORT}`);
});
