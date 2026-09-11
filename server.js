/* ============================================
   فواتيري — الخادم السحابي (Node.js + Express + PostgreSQL)
   يخدّم ملفات التطبيق ويكشف API متوافقاً:
     GET  /api/store  -> { version, data }
     POST /api/op     -> { ops: [{key,value} | {key,remove:true} | {clear:true}] }
     POST /api/store  -> { data: {key:value,...} }
   البيانات الثابتة في PostgreSQL (تُحقن DATABASE_URL تلقائياً عند ربط
   قاعدة Render بالخدمة). إن لم تتوفر يعمل بذاكرة مؤقتة للتجربة.
   ============================================ */

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const PORT = process.env.PORT || 10000; // Render يحقن PORT تلقائياً
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

const app = express();
app.use(express.json({ limit: '20mb' }));

// CORS مفتوح (يعمل حتى لو حُمّل التطبيق من نطاق آخر)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------- مخزن البيانات ----------
const memory = { version: 0, data: {} }; // وضع الطوارئ بلا قاعدة
let pool = null;                          // وضع PostgreSQL

// قفل تسلسلي لتجنب تزاحم عمليات الكتابة (مثل lock في نسخة C#)
let mutex = Promise.resolve();
let currentPromise = null;
function enqueue(fn) {
  const run = mutex.then(() => fn());
  mutex = run.catch(() => {});
  return run;
}

function getEntry(k) {
  if (pool) return memory.data && memory.data[k];
  return memory.data[k];
}

async function storeRead() {
  if (!pool) return { version: memory.version, data: memory.data };
  return null;
}

async function initDb() {
  if (!DATABASE_URL) return false;
  try {
    pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await pool.query(
      `CREATE TABLE IF NOT EXISTS fawateeri_kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)`
    );
    await pool.query(
      `CREATE TABLE IF NOT EXISTS fawateeri_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`
    );
    await loadFromDb();
    return true;
  } catch (e) {
    console.error('DB init failed, falling back to in-memory:', e.message);
    pool = null;
    return false;
  }
}

async function loadFromDb() {
  const { rows } = await pool.query(`SELECT k,v FROM fawateeri_kv`);
  memory.data = {};
  for (const r of rows) memory.data[r.k] = r.v;
  const meta = await pool.query(`SELECT v FROM fawateeri_meta WHERE k='version'`);
  memory.version = meta.rows.length ? parseInt(meta.rows[0].v, 10) || 0 : 0;
}

// يُطبق الأوب في ذاكرة ثم مزامنة مع القاعدة
async function applyAndSync(ops) {
  memory.version++;
  for (const op of ops) {
    if (!op || typeof op !== 'object') continue;
    if (op.clear) {
      memory.data = {};
    } else if (op.remove && op.key) {
      delete memory.data[op.key];
    } else if (op.key) {
      memory.data[op.key] = op.value == null ? '' : String(op.value);
    }
  }
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const op of ops) {
        if (!op || typeof op !== 'object') continue;
        if (op.clear) {
          await client.query(`DELETE FROM fawateeri_kv`);
        } else if (op.remove && op.key) {
          await client.query(`DELETE FROM fawateeri_kv WHERE k=$1`, [op.key]);
        } else if (op.key) {
          const v = op.value == null ? '' : String(op.value);
          await client.query(
            `INSERT INTO fawateeri_kv(k,v) VALUES($1,$2)
             ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v`,
            [op.key, v]
          );
        }
      }
      await client.query(
        `INSERT INTO fawateeri_meta(k,v) VALUES('version',$1)
         ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v`,
        [String(memory.version)]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

// استبدال كامل (POST /api/store)
async function replaceFull(data) {
  memory.version++;
  memory.data = {};
  for (const [k, v] of Object.entries(data || {})) {
    memory.data[k] = v == null ? '' : String(v);
  }
  if (!pool) return memory.version;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM fawateeri_kv`);
    for (const [k, v] of Object.entries(memory.data)) {
      await client.query(`INSERT INTO fawateeri_kv(k,v) VALUES($1,$2)`, [k, v]);
    }
    await client.query(
      `INSERT INTO fawateeri_meta(k,v) VALUES('version',$1)
       ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v`,
      [String(memory.version)]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return memory.version;
}

function readJson(obj) {
  return { version: memory.version, data: memory.data };
}

// ---------- API ----------
app.get('/api/store', async (req, res) => {
  try {
    if (pool) await loadFromDb();
    res.json({ version: memory.version, data: memory.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/api/op', (req, res) => {
  const ops = Array.isArray(req.body && req.body.ops) ? req.body.ops : [];
  enqueue(() => applyAndSync(ops))
    .then(() => res.json({ ok: true, version: memory.version }))
    .catch((e) => res.status(500).json({ ok: false, error: String(e.message || e) }));
});

app.post('/api/store', (req, res) => {
  const data = (req.body && req.body.data) || {};
  enqueue(() => replaceFull(data))
    .then((v) => res.json({ ok: true, version: v }))
    .catch((e) => res.status(500).json({ ok: false, error: String(e.message || e) }));
});

// ---------- الملفات الثابتة ----------
app.use(express.static('public'));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ---------- إقلاع ----------
(async () => {
  const haveDb = await initDb();
  app.listen(PORT, () => {
    console.log('Fawateeri online server started on port ' + PORT + (haveDb ? ' (PostgreSQL)' : ' (in-memory)'));
  });
})();