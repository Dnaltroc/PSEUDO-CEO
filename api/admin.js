/* Moderation. GET lists a board with entry ids; POST removes one entry. Needs the STATS_KEY. */
const { redis, HttpError, readBody, requireKey, route } = require('./_lib');

const COS = ['intc', 'ba', 'unh', 'nke', 'khc'];
const DIFFS = ['easy', 'medium', 'hard'];

module.exports = route(['GET', 'POST'], async (req, res) => {
  requireKey(req);
  const src = req.method === 'GET' ? (req.query || {}) : readBody(req);
  const { co, d } = src;
  if (!COS.includes(co) || !DIFFS.includes(d)) throw new HttpError(400, 'Unknown board');
  const zk = 'lb:' + co + ':' + d, hk = 'lbh:' + co + ':' + d;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    if (typeof src.k !== 'string' || !/^[a-f0-9]{12}$/.test(src.k)) throw new HttpError(400, 'Bad id');
    await redis([['ZREM', zk, src.k], ['HDEL', hk, src.k]]);
    return res.status(200).json({ ok: true });
  }
  const [keys] = await redis([['ZREVRANGE', zk, 0, 99]]);
  let rows = [];
  if (keys && keys.length) {
    const [vals] = await redis([['HMGET', hk, ...keys]]);
    rows = keys.map((k, i) => { try { return { k, ...JSON.parse(vals[i]) }; } catch (e) { return null; } }).filter(Boolean);
  }
  res.status(200).json({ rows });
});
