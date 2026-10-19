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
- **Welcome, CEO.** Before the first quarter the player enters their name and email on the welcome screen (saved on the device, so a returning player just confirms). The game then greets them as "CEO <last name>" and uses their name on the home screen, band, tracker, debrief and share card. The real CEO whose chair they take is shown with a photo where a free one exists (initials otherwise), and the company logo appears throughout. Photo and logo credits are listed in the game.
- **Three difficulties.** Guided (plain English, 6 quarters, about 10 min), Standard (8 quarters, about 20 min), Hot Seat (12 quarters, about 30 min, full numbers, one bad board quarter ends it).
- **Luck is separated from skill.** The debrief replays your choices without random noise.

The real leadership's choices come from public reporting. The size of each choice's effect is modeled, so the comparison is "what would the real decisions have produced in this simulation", not a prediction of what actually would have happened.

## Why is the company struggling

Before Quarter 1 the player reads a one-page briefing in plain English on why the company is struggling. Each company has five or fewer points (`STORY` in `src/ui.js`), each linked to a source taken from the company's facts and five-forces evidence links in `src/engine.js`. The page ends with the decision the player is about to face.

- This replaced the old Strategy room (Porter's Five Forces and a strategic posture). The strategy code in the engine is still there but unused. New games carry no strategy.
- The server still accepts a strategy when a game started before the change sends one, so those runs replay to the score the player saw.

## Getting fired

When the board fires the player, the game shows a fake newspaper story, "CEO (player name) fired from (company)", written from the run's real numbers: quarters served, misses, stock move, what $10,000 became, board support, jobs cut. It is labeled as fiction on the page. The paper is the invented "Pseudo Post", the only quote comes from one of the game's invented analysts, and nothing is attributed to the real company, its board or its leaders. The page is laid out like a front page with a giant FIRED! banner, and the picture is a stock photo of a man in distress with the face blurred.

## Leaderboard, sharing and analytics

- **Share card.** The debrief makes an image (and copyable text) with your result.
- **Leaderboard.** One board per company and seat. Posting sends your choices to the server, which replays them through the same deterministic engine and computes the score itself, so numbers cannot be typed in. Ranked by points ahead of the real playbook. Only completed games are ranked. Rewinds used are self-reported.
- **Analytics.** Anonymous counts only: which company and difficulty were picked, how far games got, completions, shares. A random ID kept in the browser counts unique players. No names, emails or IP addresses are stored. Browsers with Do Not Track on are not counted. A one-hour abuse limit uses a scrambled form of the connection address that is not kept.
- **Stats dashboard** at `/stats`, protected by a key only you know. It shows the anonymous counts, a Players tab (name, email, whether they ticked the updates box, games played, with a work-email filter and CSV download) and lets you remove leaderboard entries.
- **Player list and privacy.** The welcome screen asks for a name and email and has an optional, unticked "Email me about new companies and features" box. Emails are stored privately and never shown. `/privacy` explains what is kept, and has a form that removes an email (`POST /api/leads` with `{"remove":true,"email":"..."}`; it always answers the same way, so it does not reveal who is on the list).
- **Link preview.** Open Graph and Twitter tags plus `og.png` (1200x630) give the site a share card on LinkedIn and elsewhere.

## Project layout

```
src/        engine.js (simulation + data), ui.js (screens), shell.html (styles), photos.css, faces.css, stats.html, privacy.html, og.png
api/        serverless functions: event, score, leaderboard, leads, stats, admin (+ _replay.js, _lib.js)
dev/        local dev server with an in-memory database, and a replay self-test
build.js    assembles src/ into public/index.html (the single-file game)
```

Run locally: `node build.js && node dev/server.js`, then open http://localhost:3000. The dev server uses an in-memory stand-in for the database. `node dev/replay-test.js` checks that the server replay matches the browser engine exactly.

Deploying (Vercel, Upstash Redis for storage): see [SETUP.md](SETUP.md).

## Data and sources

- Financials: SEC EDGAR filings (10-K and 10-Q) via the SEC's XBRL data.
- Workforce, layoff and site information: company filings and public reporting, linked from inside the game.
- The headline figures for each company link to the primary document where one exists (earnings releases and SEC filings). A few claims drawn from earnings calls or leadership news still link to secondary reports.

## Photo credits

Photos are from Wikimedia Commons and credited in the game and on share cards.

| Company | Subject | Photographer | License |
|---|---|---|---|
| Intel | Intel headquarters, Santa Clara | Coolcaesar | CC BY-SA 4.0 |
| Boeing | 737 MAX 9 | KirkXWB | CC BY-SA 4.0 |
| UnitedHealth | Optum headquarters, Eden Prairie | Chad Davis | CC BY 2.0 |
| Nike | Nike World Headquarters, Beaverton | Brandon Carson | CC BY 2.0 |
| Kraft Heinz | PPG Place, Pittsburgh | Derek Jensen (Tysto) | Public domain |

The "FILE PHOTO" on the fired front page is "Man Stressed At Work" by CIPHR Connect, CC BY 2.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Man_Stressed_At_Work.jpg). The face is blurred and the image is cropped and made black and white before it is stored in `src/faces.css`. It shows no one connected to the story, and the caption says so.

## Disclaimer

Educational game. Not affiliated with or endorsed by any company shown. The executives and advisors are fictional. Nothing here is financial advice.
