# Pseudo CEO

A CEO strategy game built on real company data. You take over a struggling Fortune 500 company, make quarterly decisions, and see how your results compare with what the real leadership did.

**Play it:** https://pseudo-ceo.vercel.app

## The companies

| Company | The problem you inherit |
|---|---|
| Intel | How much to bet on new chip factories |
| Boeing | Production rate versus quality and cash |
| UnitedHealth | Margin versus membership and trust |
| Nike | Resetting a slowing brand |
| Kraft Heinz | Reviving mature food brands |

Every starting number (revenue, margin, cash, debt, capital spending, dividends, headcount) comes from the company's SEC filings, with links to the filings inside the game.

## How it works

- **Quarterly decisions** across finance, operations, strategy and people. Effects land over later quarters, so earlier choices come back to you.
- **Scored against the real playbook.** A "ghost" plays the same scenario using what the real leadership announced. Your scoreboard is the share price: it starts at the real Oct 16, 2026 close, and a live tracker, a $10,000 profit-and-loss and a quarter-by-quarter timeline show how you compare with the real CEO.
- **Your leadership team.** Five fictional executives advise you. Overrule them and they lose trust; take their advice and they gain it.
- **Earnings calls.** Answer analysts with confidence, candor or deflection. Overpromising has a cost.
- **Welcome, CEO.** Each game opens with a welcome screen for the real CEO whose chair you take, with a photo where a free one exists (initials otherwise) and the company logo throughout. Photo and logo credits are listed in the game.
- **Three difficulties.** Guided (plain English, 6 quarters, about 10 min), Standard (8 quarters, about 20 min), Hot Seat (12 quarters, about 30 min, full numbers, one bad board quarter ends it).
- **Luck is separated from skill.** The debrief replays your choices without random noise.

The real leadership's choices come from public reporting. The size of each choice's effect is modeled, so the comparison is "what would the real decisions have produced in this simulation", not a prediction of what actually would have happened.

## Strategy room

Before Quarter 1 the player reads the industry with Porter's Five Forces (a sourced one-line read per force, from each company's latest 10-K and recent earnings commentary), picks the two pressures that worry them most, then picks a way to win: cost leader, differentiator, focused niche or reinventor.

- Every decision option is hand-tagged to a posture (`FIT_TAG` in `src/engine.js`). An option that fits the chosen posture adds a little execution and investor confidence; one that fights it subtracts. The effect is small: about 4 to 5 points of overall score between a fully aligned and a fully conflicting run.
- Shock events are tagged to a force. A shock tied to a force the player watched hits about a third softer.
- The reference read and the leadership posture for each company are our reading of its filings and public statements. They are judgment, not fact. The real playbook gets the same fit effect using the leadership posture.
- The strategy is sent with the score, and the server replays it, so it cannot be changed after the fact.
- Hot Seat hides the pressure ratings so the player has to judge from the evidence.

## Leaderboard, sharing and analytics

- **Share card.** The debrief makes an image (and copyable text) with your result.
- **Leaderboard.** One board per company and seat. Posting sends your choices to the server, which replays them through the same deterministic engine and computes the score itself, so numbers cannot be typed in. Ranked by points ahead of the real playbook. Only completed games are ranked. Rewinds used are self-reported.
- **Analytics.** Anonymous counts only: which company and difficulty were picked, how far games got, completions, shares. A random ID kept in the browser counts unique players. No names, emails or IP addresses are stored. Browsers with Do Not Track on are not counted. A one-hour abuse limit uses a scrambled form of the connection address that is not kept.
- **Stats dashboard** at `/stats`, protected by a key only you know. It also lets you remove leaderboard entries.

## Project layout

```
src/        engine.js (simulation + data), ui.js (screens), shell.html (styles), photos.css, stats.html
api/        serverless functions: event, score, leaderboard, stats, admin (+ _replay.js, _lib.js)
dev/        local dev server with an in-memory database, and a replay self-test
build.js    assembles src/ into public/index.html (the single-file game)
```

Run locally: `node build.js && node dev/server.js`, then open http://localhost:3000. The dev server uses an in-memory stand-in for the database. `node dev/replay-test.js` checks that the server replay matches the browser engine exactly.

Deploying (Vercel, Upstash Redis for storage): see [SETUP.md](SETUP.md).

## Data and sources

- Financials: SEC EDGAR filings (10-K and 10-Q) via the SEC's XBRL data.
- Workforce, layoff and site information: company filings and public reporting, linked from inside the game.

## Photo credits

Photos are from Wikimedia Commons and credited in the game and on share cards.

| Company | Subject | Photographer | License |
|---|---|---|---|
| Intel | Intel headquarters, Santa Clara | Coolcaesar | CC BY-SA 4.0 |
| Boeing | 737 MAX 9 | KirkXWB | CC BY-SA 4.0 |
| UnitedHealth | Optum headquarters, Eden Prairie | Chad Davis | CC BY 2.0 |
| Nike | Nike World Headquarters, Beaverton | Brandon Carson | CC BY 2.0 |
| Kraft Heinz | PPG Place, Pittsburgh | Derek Jensen (Tysto) | Public domain |

## Disclaimer

Educational game. Not affiliated with or endorsed by any company shown. The executives and advisors are fictional. Nothing here is financial advice.
