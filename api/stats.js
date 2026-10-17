/* GET /api/stats?days=30: aggregate analytics for the owner. Needs the STATS_KEY. */
const { redis, requireKey, day, route, pairs } = require('./_lib');

const COS = ['intc', 'ba', 'unh', 'nke', 'khc'];
const DIFFS = ['easy', 'medium', 'hard'];

module.exports = route(['GET'], async (req, res) => {
  requireKey(req);
  const days = Math.max(1, Math.min(90, parseInt((req.query || {}).days, 10) || 30));
  const dayList = Array.from({ length: days }, (_, i) => day(i)).reverse();
  const cmds = [['HGETALL', 'ev:total'], ['PFCOUNT', 'uv:all']];
  for (const d of dayList) cmds.push(['HGETALL', 'ev:day:' + d], ['PFCOUNT', 'uv:' + d]);
  const boards = [];
  for (const c of COS) for (const d of DIFFS) { boards.push(c + ':' + d); cmds.push(['ZCARD', 'lb:' + c + ':' + d]); }
  const out = await redis(cmds);
  const total = pairs(out[0]);
  const uvAll = out[1];
  const series = dayList.map((d, i) => ({ day: d, ev: pairs(out[2 + i * 2]), uv: out[3 + i * 2] }));
  const base = 2 + days * 2;
  const sizes = {};
  boards.forEach((b, i) => { sizes[b] = out[base + i]; });
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ generated: new Date().toISOString(), total, uvAll, series, boards: sizes });
});
