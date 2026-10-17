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

Every starting number (revenue, margin, cash, debt, capital spending, dividends, headcount) comes from the company's SEC filings. Links to the filings appear inside the game.

## How it works

- **Quarterly decisions.** Each quarter brings briefings with options across finance, operations, strategy and people. Effects land over the following quarters, so earlier choices come back to you.
- **Scored against the real playbook.** A "ghost" plays the same scenario using what the real leadership actually did. Your value index starts at 100 and is compared with theirs.
- **Your leadership team.** Five fictional executives advise you. Overrule them and they lose trust; take their advice and they gain it. Low trust can mean resignations.
- **Stakeholders.** Investors, brand, employees, customers, regulators and execution each have a meter that moves with your choices.
- **Earnings calls.** Answer analysts with confidence, candor or deflection. Overpromising has a cost.
- **Three difficulties.**
  - **Easy:** plain-language explanations of every number, with hints.
  - **Medium:** standard financial terms and fewer hints.
  - **Hard:** every number, no hints, and the board can fire you.
- **Luck is separated from skill.** The debrief replays your decisions without random noise so you can see how much was the dice and how much was your judgment.

## Running it locally

The whole game is one static file with no dependencies and no backend.

```
open index.html
```

Progress is saved in your browser's local storage. Nothing is sent anywhere.

## Data and sources

- Financials: SEC EDGAR filings (10-K and 10-Q) via the SEC's XBRL data.
- Workforce, layoff and site information: company filings and public reporting, linked from inside the game.
- Decision outcomes are modeled. The real leadership's choices are based on public reporting, but the effects of each choice in the game are a simulation, not a prediction.

## Photo credits

Photos are from Wikimedia Commons and credited in the game as well.

| Company | Subject | Photographer | License |
|---|---|---|---|
| Intel | Intel headquarters, Santa Clara | Coolcaesar | CC BY-SA 4.0 |
| Boeing | 737 MAX 9 | KirkXWB | CC BY-SA 4.0 |
| UnitedHealth | Optum headquarters, Eden Prairie | Chad Davis | CC BY 2.0 |
| Nike | Nike World Headquarters, Beaverton | Brandon Carson | CC BY 2.0 |
| Kraft Heinz | PPG Place, Pittsburgh | Derek Jensen (Tysto) | Public domain |

## Disclaimer

Pseudo CEO is an educational game. It is not affiliated with or endorsed by any of the companies shown. The executives and advisors in the game are fictional. Nothing here is financial advice.
