/* POST /api/score: post a finished run to the leaderboard. The server re-plays it first. */
const crypto = require('crypto');
const { redis, HttpError, readBody, limit, route, seedOK } = require('./_lib');
const { replay } = require('./_replay');

const BLOCK = ['fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'pussy', 'nigg', 'fagg', 'retard', 'nazi', 'hitler', 'kkk', 'porn'];
const KEEP_TOP = 100;
/* names that could be mistaken for the site owner or for staff */
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'owner', 'staff', 'official', 'support', 'pseudoceo', 'pseudo ceo', 'cortland', 'cortland clarke', 'claude', 'anthropic'];

function cleanName(raw) {
  const n = String(raw || '').replace(/\s+/g, ' ').trim();
  if (n.length < 2 || n.length > 16 || !/^[A-Za-z0-9 ._-]+$/.test(n)) {
    throw new HttpError(400, 'Use 2 to 16 letters, numbers, spaces, dots, dashes or underscores');
  }
  const flat = n.toLowerCase().replace(/[^a-z]/g, '').replace(/0/g, 'o');
  if (BLOCK.some((w) => flat.includes(w))) throw new HttpError(400, 'Please pick a different name');
  if (RESERVED.includes(n.toLowerCase().replace(/[^a-z ]/g, '').trim())) throw new HttpError(400, 'Please pick a different name');
  return n;
}

module.exports = route(['POST'], async (req, res) => {
  await limit(req, 'score', 12, 3600);
  const b = readBody(req);
  const name = cleanName(b.name);
  if (typeof b.pid !== 'string' || !/^[a-f0-9]{16,32}$/.test(b.pid)) throw new HttpError(400, 'Missing player id');

  if (!seedOK(b.seed)) throw new HttpError(400, 'This scenario code was not issued by the server, so it cannot be ranked. Start a new game from the home screen to get a ranked code.');
  const r = replay(b);
  const k = crypto.createHash('sha256').update([b.pid, b.co, b.d].join('|')).digest('hex').slice(0, 12);
  const rewinds = Math.max(0, Math.min(r.maxRewinds, Number.isInteger(b.rewinds) ? b.rewinds : 0));
  const entry = {
    k, n: name, seed: b.seed, ov: +r.overall.toFixed(1), gv: +r.ghost.toFixed(1),
    edge: +r.edge.toFixed(1), idx: +r.idx.toFixed(1), rw: rewinds, ts: Date.now(),
  };
  const zk = 'lb:' + b.co + ':' + b.d;
  const hk = 'lbh:' + b.co + ':' + b.d;
  const score = Math.round(r.edge * 100);

  // One row per player per board: keep their best run, replace only if the new score is higher.
  const [prev] = await redis([['ZSCORE', zk, k]]);
  if (prev == null || score > Number(prev)) {
    await redis([
      ['ZADD', zk, score, k],
      ['HSET', hk, k, JSON.stringify(entry)],
      ['ZREMRANGEBYRANK', zk, 0, -(KEEP_TOP + 1)],
      ['HINCRBY', 'ev:total', 'post', 1],
      ['HINCRBY', 'ev:day:' + new Date().toISOString().slice(0, 10), 'post', 1],
    ]);
  }
  const [rank, total, best] = await redis([['ZREVRANK', zk, k], ['ZCARD', zk], ['ZSCORE', zk, k]]);
  res.status(200).json({
    ok: true, k, rank: rank == null ? null : rank + 1, total,
    edge: +r.edge.toFixed(1), overall: +r.overall.toFixed(1), kept: best != null && Number(best) >= score,
  });
});
