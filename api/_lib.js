/* Shared helpers for the Pseudo CEO API. Files starting with "_" are not exposed as routes. */
const crypto = require('crypto');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

/* Run a batch of Redis commands through the Upstash REST pipeline. */
async function redis(cmds) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new HttpError(503, 'Storage is not connected yet');
  const r = await fetch(REDIS_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new HttpError(502, 'Storage error ' + r.status);
  const j = await r.json();
  return j.map((x) => {
    if (x && x.error) throw new HttpError(502, 'Storage error: ' + x.error);
    return x.result;
  });
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Stats-Key');
}

/* The client sends JSON as text/plain so no preflight is needed; accept both. */
function readBody(req) {
  let b = req.body;
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { throw new HttpError(400, 'Bad JSON'); } }
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Empty body');
  return b;
}

const day = (offset) => new Date(Date.now() - (offset || 0) * 864e5).toISOString().slice(0, 10);

/* A scrambled, short-lived stand-in for the caller's address, used only for rate limits.
   The raw address is never stored, and the counter expires. */
function who(req) {
  const ip = String((req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')).split(',')[0].trim();
  const salt = process.env.IP_SALT || 'pseudo-ceo';
  return crypto.createHash('sha256').update(salt + '|' + day() + '|' + ip).digest('hex').slice(0, 16);
}

async function limit(req, bucket, max, ttl) {
  const k = 'rl:' + bucket + ':' + who(req);
  const out = await redis([['INCR', k], ['EXPIRE', k, ttl, 'NX']]);
  if (out[0] > max) throw new HttpError(429, 'Slow down a little and try again soon');
}

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function requireKey(req) {
  const key = process.env.STATS_KEY;
  if (!key) throw new HttpError(503, 'STATS_KEY is not set in Vercel yet');
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const given = auth || req.headers['x-stats-key'] || (req.query && req.query.key) || '';
  if (!given || !safeEqual(given, key)) throw new HttpError(401, 'Wrong key');
}

/* Wrap a handler with CORS, method checks and uniform errors. */
function route(methods, fn) {
  return async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (!methods.includes(req.method)) return res.status(405).json({ error: methods.join('/') + ' only' });
    try {
      await fn(req, res);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(e);
      res.status(status).json({ error: e.status ? e.message : 'Something went wrong' });
    }
  };
}

const pairs = (flat) => {
  const o = {};
  for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]);
  return o;
};

module.exports = { redis, HttpError, cors, readBody, day, who, limit, requireKey, route, pairs };
