/* /api/leads
   POST: the welcome screen sends the player's name and email here before a game starts. It also carries an optional
         "updates" flag (the player ticked the box). POST with {remove:true,email} deletes that address (privacy page).
   GET:  the site owner lists them (needs the STATS_KEY). Add &format=csv for a spreadsheet file.
   Emails are stored once per address in a private hash and are never returned by any public route. */
const { redis, HttpError, readBody, requireKey, limit, route } = require('./_lib');

const COS = ['intc', 'ba', 'unh', 'nke', 'khc'];
const DIFFS = ['easy', 'medium', 'hard'];
const KEY = 'leads:e';
const MAX_ROWS = 5000;

function cleanName(raw) {
  const n = String(raw || '').replace(/\s+/g, ' ').trim();
  if (n.length < 2 || n.length > 60 || !/^\p{L}[\p{L}\p{M} .'’-]*$/u.test(n)) {
    throw new HttpError(400, 'Enter your name using letters, spaces, dots, dashes or apostrophes');
  }
  return n;
}

function cleanEmail(raw) {
  const e = String(raw || '').trim().toLowerCase();
  if (e.length > 120 || !/^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\.]{2,}$/.test(e)) {
    throw new HttpError(400, 'Enter a valid email address');
  }
  return e;
}

/* A spreadsheet opens a cell that starts with = + - or @ as a formula, so defuse those. */
const csvCell = (v) => {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};

module.exports = route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    requireKey(req);
    res.setHeader('Cache-Control', 'no-store');
    const [flat] = await redis([['HGETALL', KEY]]);
    const rows = [];
    for (let i = 0; i + 1 < (flat || []).length; i += 2) {
      try { rows.push({ e: flat[i], ...JSON.parse(flat[i + 1]) }); } catch (e) { /* skip a bad row */ }
    }
    rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const out = rows.slice(0, MAX_ROWS);
    if ((req.query || {}).format === 'csv') {
      const head = ['name', 'email', 'wants_updates', 'first_seen', 'last_seen', 'first_company', 'first_difficulty', 'times_started'];
      const lines = [head.join(',')].concat(out.map((r) => [
        r.n, r.e, r.u ? 'yes' : 'no', new Date(r.ts || 0).toISOString(), new Date(r.last || r.ts || 0).toISOString(), r.co || '', r.d || '', r.times || 1,
      ].map(csvCell).join(',')));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="pseudo-ceo-players.csv"');
      return res.status(200).end(lines.join('\n') + '\n');
    }
    return res.status(200).json({ total: rows.length, rows: out });
  }

  const b = readBody(req);
  if (b.remove === true) {
    /* Removal is always answered the same way, so the route cannot be used to check who is on the list. */
    await limit(req, 'leadrm', 8, 3600);
    const gone = cleanEmail(b.email);
    await redis([['HDEL', KEY, gone]]);
    return res.status(200).json({ ok: true });
  }
  await limit(req, 'lead', 12, 3600);
  const name = cleanName(b.name);
  const updates = b.updates === true;
  const email = cleanEmail(b.email);
  const co = COS.includes(b.co) ? b.co : '';
  const d = DIFFS.includes(b.d) ? b.d : '';
  const now = Date.now();

  const [prev] = await redis([['HMGET', KEY, email]]);
  let rec = { n: name, ts: now, last: now, co, d, times: 1, u: updates };
  let fresh = true;
  if (prev && prev[0]) {
    try {
      const o = JSON.parse(prev[0]);
      rec = { n: name, ts: o.ts || now, last: now, co: o.co || co, d: o.d || d, times: (o.times || 1) + 1, u: updates };
      fresh = false;
    } catch (e) { /* overwrite an unreadable row */ }
  }
  const cmds = [['HSET', KEY, email, JSON.stringify(rec)]];
  if (fresh) cmds.push(['HINCRBY', 'ev:total', 'lead', 1], ['HINCRBY', 'ev:day:' + new Date().toISOString().slice(0, 10), 'lead', 1]);
  await redis(cmds);
  res.status(200).json({ ok: true });
});
