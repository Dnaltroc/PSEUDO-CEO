/* POST /api/event: anonymous play counts. No names, no addresses, no free text. */
const { redis, HttpError, readBody, day, limit, route } = require('./_lib');

const COS = ['intc', 'ba', 'unh', 'nke', 'khc'];
const DIFFS = ['easy', 'medium', 'hard'];
const KEEP = 120 * 86400;

const int = (v, lo, hi) => {
  if (!Number.isInteger(v) || v < lo || v > hi) throw new HttpError(400, 'Bad value');
  return v;
};
const oneOf = (v, list) => {
  if (!list.includes(v)) throw new HttpError(400, 'Bad value');
  return v;
};

module.exports = route(['POST'], async (req, res) => {
  await limit(req, 'ev', 400, 3600);
  const b = readBody(req);
  const fields = [];
  const extra = [];
  const t = b.t;
  switch (t) {
    case 'view':
    case 'board':
      fields.push(t);
      break;
    case 'start': {
      const co = oneOf(b.co, COS), d = oneOf(b.d, DIFFS);
      fields.push('start', 'start:' + co, 'start:' + co + ':' + d);
      break;
    }
    case 'q': {
      const co = oneOf(b.co, COS), d = oneOf(b.d, DIFFS), q = int(b.q, 0, 19);
      fields.push('q:' + co + ':' + d + ':' + q);
      break;
    }
    case 'end': {
      const co = oneOf(b.co, COS), d = oneOf(b.d, DIFFS), out = oneOf(b.out, ['done', 'fired']);
      int(b.q, 0, 20);
      fields.push('end:' + co + ':' + d, out + ':' + co + ':' + d);
      if (out === 'done') {
        const edge = int(b.edge, -1000, 1000); // overall points vs the real playbook, times 10
        extra.push(['edge:' + co + ':' + d, edge], ['edgeN:' + co + ':' + d, 1]);
      }
      break;
    }
    case 'share':
      fields.push('share', 'share:' + oneOf(b.kind, ['image', 'download', 'copy', 'native']));
      break;
    default:
      throw new HttpError(400, 'Unknown event');
  }

  const D = day();
  const cmds = [];
  for (const f of fields) {
    cmds.push(['HINCRBY', 'ev:total', f, 1], ['HINCRBY', 'ev:day:' + D, f, 1]);
  }
  for (const [f, n] of extra) {
    cmds.push(['HINCRBY', 'ev:total', f, n], ['HINCRBY', 'ev:day:' + D, f, n]);
  }
  cmds.push(['EXPIRE', 'ev:day:' + D, KEEP]);
  if (typeof b.pid === 'string' && /^[a-f0-9]{16,32}$/.test(b.pid)) {
    cmds.push(['PFADD', 'uv:' + D, b.pid], ['EXPIRE', 'uv:' + D, KEEP], ['PFADD', 'uv:all', b.pid]);
  }
  await redis(cmds);
  res.status(200).json({ ok: true });
});
