/* Re-plays a submitted run through the real engine so scores cannot be typed in.
   The engine is deterministic for a given scenario code, so the same choices always
   produce the same result. */
const E = require('../src/engine.js');
const { HttpError } = require('./_lib');

const bad = (m) => new HttpError(400, m);
const TONES = ['confident', 'candid', 'deflect'];

function replay(b) {
  const co = E.CO[b.co];
  const D = E.DIFF[b.d];
  if (!co || !D) throw bad('Unknown company or difficulty');
  /* The Strategy room is gone, so new games carry no strategy. A strategy is still honoured if a game that
     started before the change sends one, so those games replay to the same score the player saw. */
  const strategy = b.strategy == null ? null : b.strategy;
  if (strategy !== null && !E.validStrategy(strategy)) throw bad('Bad strategy');
  if (typeof b.seed !== 'string' || !b.seed.trim() || b.seed.length > 40) throw bad('Bad scenario code');
  if (!Array.isArray(b.runs) || b.runs.length !== D.quarters) throw bad('Only finished games can be posted');

  const g = E.newGame(b.co, b.d, b.seed, strategy);
  for (let i = 0; i < b.runs.length; i++) {
    if (g.status !== 'play') throw bad('Run does not match the scenario');
    const r = b.runs[i];
    if (!r || !r.ch || typeof r.ch !== 'object' || !r.ch.cards) throw bad('Bad run');
    const pq = g.plan.quarters[g.q];
    const ch = { cards: {} };
    for (const cid of pq.cards) {
      const card = E.CARD[cid];
      const v = r.ch.cards[cid];
      if (!card || !Number.isInteger(v) || v < 0 || v >= card.opts.length) throw bad('Bad choice');
      ch.cards[cid] = v;
    }
    const m = E.allocMenu(co, g.st);
    for (const k of ['reinvest', 'ret', 'debt', 'guide']) {
      if (!m[k].some((a) => a[0] === r.ch[k])) throw bad('Bad capital choice');
      ch[k] = r.ch[k];
    }
    const a = E.assess(g, ch);
    const quality = { cards: {}, reinvest: a.reinvest, ret: a.ret, debt: a.debt, guide: a.guide, bestGuide: a.best, ctx: {} };
    for (const k in ch.cards) {
      const grades = E.ctxGrades(co, g.st, E.CARD[k]);
      quality.cards[k] = grades[ch.cards[k]];
      quality.ctx[k] = grades;
    }
    E.commitQuarter(g, ch, quality);
    if (g.call && Array.isArray(r.ans)) {
      if (r.ans.length !== g.call.qs.length || !r.ans.every((t) => TONES.includes(t))) throw bad('Bad call answers');
      const res = E.applyCall(g, 'st', g.call.qs, r.ans);
      g.log[g.log.length - 1].call = res;
      g.call.done = true;
    }
  }
  if (g.status !== 'done') throw bad('Only completed games can be posted');
  const me = E.scorecard(g.st, co);
  const gh = E.scorecard(g.ghost, co);
  return { overall: me.overall, ghost: gh.overall, edge: me.overall - gh.overall, idx: g.st.idx, quarters: D.quarters, maxRewinds: D.rewinds };
}

module.exports = { replay };
