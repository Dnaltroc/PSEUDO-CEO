/* Local dev server: serves public/ and runs the api/ handlers against an in-memory
   stand-in for Upstash Redis. Run:  node build.js && node dev/server.js  */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

/* ---- tiny in-memory Redis speaking the Upstash REST pipeline ---- */
const db = { kv: new Map(), hash: new Map(), zset: new Map(), hll: new Map() };
const H = (k) => db.hash.get(k) || (db.hash.set(k, new Map()), db.hash.get(k));
const Z = (k) => db.zset.get(k) || (db.zset.set(k, new Map()), db.zset.get(k));
const sorted = (k) => [...Z(k).entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
function run([cmd, ...a]) {
  switch (String(cmd).toUpperCase()) {
    case 'INCR': { const v = (db.kv.get(a[0]) || 0) + 1; db.kv.set(a[0], v); return v; }
    case 'EXPIRE': return 1;
    case 'HINCRBY': { const h = H(a[0]); const v = (Number(h.get(a[1])) || 0) + Number(a[2]); h.set(a[1], v); return v; }
    case 'HGETALL': { const o = []; for (const [k, v] of H(a[0])) o.push(k, String(v)); return o; }
    case 'HSET': H(a[0]).set(a[1], a[2]); return 1;
    case 'HDEL': H(a[0]).delete(a[1]); return 1;
    case 'HMGET': return a.slice(1).map((f) => (H(a[0]).has(f) ? H(a[0]).get(f) : null));
    case 'PFADD': { const s = db.hll.get(a[0]) || new Set(); const n = s.size; s.add(a[1]); db.hll.set(a[0], s); return s.size > n ? 1 : 0; }
    case 'PFCOUNT': return (db.hll.get(a[0]) || new Set()).size;
    case 'ZADD': Z(a[0]).set(a[2], Number(a[1])); return 1;
    case 'ZSCORE': return Z(a[0]).has(a[1]) ? String(Z(a[0]).get(a[1])) : null;
    case 'ZREM': Z(a[0]).delete(a[1]); return 1;
    case 'ZCARD': return Z(a[0]).size;
    case 'ZREVRANK': { const s = sorted(a[0]).reverse().map((e) => e[0]); const i = s.indexOf(a[1]); return i < 0 ? null : i; }
    case 'ZREVRANGE': { const s = sorted(a[0]).reverse(); return s.slice(Number(a[1]), Number(a[2]) + 1).map((e) => e[0]); }
    case 'ZREMRANGEBYRANK': { const s = sorted(a[0]); const n = s.length; let lo = Number(a[1]), hi = Number(a[2]); if (hi < 0) hi += n; if (lo < 0) lo += n; let c = 0; s.forEach((e, i) => { if (i >= lo && i <= hi) { Z(a[0]).delete(e[0]); c++; } }); return c; }
    default: throw new Error('fake redis: unsupported ' + cmd);
  }
}
const redisSrv = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    try { const out = JSON.parse(b).map((c) => { try { return { result: run(c) }; } catch (e) { return { error: e.message }; } }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out)); }
    catch (e) { res.statusCode = 400; res.end('bad'); }
  });
});

const PORT = Number(process.env.PORT || 3000);
redisSrv.listen(0, () => {
  process.env.UPSTASH_REDIS_REST_URL = 'http://127.0.0.1:' + redisSrv.address().port;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'dev';
  process.env.STATS_KEY = process.env.STATS_KEY || 'devkey';
  const root = path.join(__dirname, '..');
  const routes = {};
  for (const f of fs.readdirSync(path.join(root, 'api'))) if (!f.startsWith('_')) routes['/api/' + f.replace(/\.js$/, '')] = require(path.join(root, 'api', f));

  http.createServer((req, res) => {
    const u = url.parse(req.url, true);
    const h = routes[u.pathname];
    if (h) {
      let raw = ''; req.on('data', (c) => (raw += c)); req.on('end', () => {
        req.query = u.query;
        const ct = String(req.headers['content-type'] || '');
        req.body = raw ? (ct.includes('application/json') ? (() => { try { return JSON.parse(raw); } catch (e) { return raw; } })() : raw) : undefined;
        res.status = (c) => { res.statusCode = c; return res; };
        res.send = (b) => { res.end(b); return res; };
        res.json = (o) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
        h(req, res);
      });
      return;
    }
    let p = u.pathname === '/' ? '/index.html' : u.pathname;
    let f = path.join(root, 'public', p);
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('not found'); }
    const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain' };
    res.setHeader('content-type', MIME[path.extname(f)] || 'text/plain');
    try { for (const h of JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).headers[0].headers) res.setHeader(h.key, h.value); } catch (e) {}
    res.end(fs.readFileSync(f));
  }).listen(PORT, () => console.log('Pseudo CEO dev server on http://localhost:' + PORT));
});
