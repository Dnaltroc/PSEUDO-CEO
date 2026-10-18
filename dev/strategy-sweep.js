/* How much does strategy move the score? Same seed, same random choices, with and without. */
const E = require('../src/engine.js');
function play(co, d, seed, strategy, policy) {
  const g = E.newGame(co, d, seed, strategy), c = E.CO[co];
  let h = 0; for (const ch of seed + co) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  while (g.status === 'play') {
    const pq = g.plan.quarters[g.q], cards = {};
    for (const cid of pq.cards) {
      const opts = E.CARD[cid].opts;
      if (policy && strategy) {
        const fits = opts.map(o => E.fitOf(cid, opts.indexOf(o), strategy.posture));
        const want = policy === 'fit' ? Math.max(...fits) : Math.min(...fits);
        const idx = fits.map((f, i) => f === want ? i : -1).filter(i => i >= 0);
        cards[cid] = idx[Math.floor(rnd() * idx.length)];
      } else cards[cid] = Math.floor(rnd() * opts.length);
    }
    const m = E.allocMenu(c, g.st), pick = a => a[Math.floor(rnd() * a.length)][0];
    const ch = { cards, reinvest: 'hold', ret: m.ret[0][0], debt: 'hold', guide: 'maintain' };
    const a = E.assess(g, ch), q = { cards: {}, reinvest: a.reinvest, ret: a.ret, debt: a.debt, guide: a.guide, bestGuide: a.best, ctx: {} };
    for (const kk in cards) { const gr = E.ctxGrades(c, g.st, E.CARD[kk]); q.cards[kk] = gr[cards[kk]]; q.ctx[kk] = gr; }
    E.commitQuarter(g, ch, q);
    if (g.call) { const ans = g.call.qs.map(() => 'candid'); E.applyCall(g, 'st', g.call.qs, ans); }
  }
  if (g.status !== 'done') return null;
  return { me: E.scorecard(g.st, c).overall, gh: E.scorecard(g.ghost, c).overall, g };
}
const stat = a => { a = a.filter(x => x != null); const m = a.reduce((x, y) => x + y, 0) / a.length; return { n: a.length, mean: +m.toFixed(2), min: +Math.min(...a).toFixed(2), max: +Math.max(...a).toFixed(2) }; };
for (const d of ['easy', 'medium']) {
  const base = [], fit = [], fight = [], ghostShift = [];
  for (const co of Object.keys(E.CO)) for (let s = 0; s < 8; s++) {
    const seed = 'sw' + s;
    const strategy = { top: ['rivalry', 'buyers'], posture: E.POSTURES[s % 4][0] };
    const b = play(co, d, seed, null), f = play(co, d, seed, strategy, 'fit'), x = play(co, d, seed, strategy, 'fight');
    if (b && f && x) { base.push(b.me - b.gh); fit.push(f.me - f.gh); fight.push(x.me - x.gh); }
  }
  console.log(d, 'edge no-strategy', stat(base), '\n   all-fit', stat(fit), '\n   all-fight', stat(fight));
}
