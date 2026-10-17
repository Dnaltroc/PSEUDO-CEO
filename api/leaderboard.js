/* GET /api/leaderboard?co=intc&d=hard: top 25 for one board. Public. */
const { redis, HttpError, route } = require('./_lib');

const COS = ['intc', 'ba', 'unh', 'nke', 'khc'];
const DIFFS = ['easy', 'medium', 'hard'];

module.exports = route(['GET'], async (req, res) => {
  const { co, d } = req.query || {};
  if (!COS.includes(co) || !DIFFS.includes(d)) throw new HttpError(400, 'Unknown board');
  const zk = 'lb:' + co + ':' + d, hk = 'lbh:' + co + ':' + d;
  const [keys, total] = await redis([['ZREVRANGE', zk, 0, 24], ['ZCARD', zk]]);
  let rows = [];
  if (keys && keys.length) {
    const [vals] = await redis([['HMGET', hk, ...keys]]);
    rows = keys.map((k, i) => {
      try { const e = JSON.parse(vals[i]); return { rank: i + 1, k, name: e.n, edge: e.edge, overall: e.ov, ghost: e.gv, idx: e.idx, seed: e.seed, rewinds: e.rw, ts: e.ts }; }
      catch (err) { return null; }
    }).filter(Boolean);
  }
  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
  res.status(200).json({ co, d, total, rows });
});
