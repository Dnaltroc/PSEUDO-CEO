/* Plays bot games with the engine exactly as the UI does, then checks the server replay matches. */
const E = require('../src/engine.js');
const { replay } = require('../api/_replay.js');
let n = 0, bad = 0;
for (const co of Object.keys(E.CO)) for (const d of ['easy', 'medium', 'hard']) for (let s = 0; s < 6; s++) {
  const seed = 'rt-' + s, useStrat = s % 3 === 0, strategy = !useStrat ? null : { top: E.FORCES.map(f => f[0]).sort(() => Math.random() - 0.5).slice(0, 2), posture: E.POSTURES[Math.floor(Math.random() * 4)][0] }, g = E.newGame(co, d, seed, strategy), runs = [], c = E.CO[co];
  const r = Math.random;
  while (g.status === 'play') {
    const pq = g.plan.quarters[g.q], cards = {};
    for (const cid of pq.cards) cards[cid] = Math.floor(r() * E.CARD[cid].opts.length);
    const m = E.allocMenu(c, g.st), pick = (a) => a[Math.floor(r() * a.length)][0];
    const ch = { cards, reinvest: pick(m.reinvest), ret: pick(m.ret), debt: pick(m.debt), guide: pick(m.guide) };
    const a = E.assess(g, ch), q = { cards: {}, reinvest: a.reinvest, ret: a.ret, debt: a.debt, guide: a.guide, bestGuide: a.best, ctx: {} };
    for (const k in cards) { const gr = E.ctxGrades(c, g.st, E.CARD[k]); q.cards[k] = gr[cards[k]]; q.ctx[k] = gr; }
    E.commitQuarter(g, ch, q);
    let ans;
    if (g.call) { ans = g.call.qs.map(() => ['confident', 'candid', 'deflect'][Math.floor(r() * 3)]); const res = E.applyCall(g, 'st', g.call.qs, ans); g.log[g.log.length - 1].call = res; g.call.done = true; }
    runs.push({ ch, ans });
  }
  if (g.status !== 'done') continue; // fired runs cannot be posted
  n++;
  const me = E.scorecard(g.st, c), gh = E.scorecard(g.ghost, c);
  let out;
  try { out = replay({ co, d, seed, strategy, runs: JSON.parse(JSON.stringify(runs)) }); } catch (e) { bad++; console.log('FAIL', co, d, seed, e.message); continue; }
  if (Math.abs(out.edge - (me.overall - gh.overall)) > 1e-9 || Math.abs(out.idx - g.st.idx) > 1e-9) { bad++; console.log('MISMATCH', co, d, seed, out.edge, me.overall - gh.overall); }
}
console.log('checked', n, 'completed games;', bad, 'problems');
// tampering must fail
try { replay({ co: 'intc', d: 'easy', seed: 'x', runs: [] }); console.log('BAD: empty run accepted'); } catch (e) { console.log('empty run rejected:', e.message); }
try { replay({ co: 'intc', d: 'easy', seed: 'x', runs: [], strategy: { top: ['rivalry','rivalry'], posture: 'cost' } }); console.log('BAD: duplicate forces accepted'); } catch (e) { console.log('bad strategy rejected:', e.message); }
