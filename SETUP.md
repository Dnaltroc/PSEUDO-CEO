# Setup: GitHub, Vercel and the database

About 10 minutes. You need a GitHub account and the Vercel account that already hosts pseudo-ceo.

## 1. Put the code on GitHub
1. Unzip this folder.
2. Open your `pseudo-ceo` repo on GitHub, click **Add file**, then **Upload files**.
3. Drag in everything inside the unzipped folder (all the folders and files, including `src`, `api`, `dev`, `build.js`, `vercel.json`, `package.json`). Commit.
   - If the repo has an older `index.html` or README, these files replace them. Delete the old root `index.html` so it does not shadow the build.

## 2. Connect the repo to Vercel
1. In Vercel, **Add New**, then **Project**, and import the `pseudo-ceo` repo.
2. Leave the framework as **Other**. `vercel.json` already sets the build command (`node build.js`) and output folder (`public`). Click **Deploy**.
3. If you already have a pseudo-ceo project made by drag and drop, either delete it first or give the new one a different name. The domain `pseudo-ceo.vercel.app` goes to whichever project owns the name.

## 3. Add the database (free)
1. In the project, open the **Storage** tab, then **Create Database**, then choose **Upstash for Redis** from the Marketplace. Pick the free plan and any region near you.
2. Connect it to this project for Production, Preview and Development. Vercel adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` variables for you.

## 4. Add your private stats key
1. Project **Settings**, **Environment Variables**.
2. Add `STATS_KEY` with a long random value (a password manager can generate one). Optionally add `IP_SALT` with another random value. `STATS_KEY` also signs the scenario codes that make leaderboard games rankable (set `SEED_KEY` to use a separate secret). Changing it later only invalidates codes already handed out.
3. **Deployments**, open the latest, **Redeploy** so the variables apply.

## 5. Check it works
- Open the game, play Guided on any company to the end, and post a score. You should see your rank.
- Open `/stats` on your site and enter the `STATS_KEY`. You should see your play counted.

## Day to day
- Push to GitHub and Vercel redeploys on its own.
- Download the names and emails players typed on the welcome screen as a spreadsheet file:
  `curl -H "Authorization: Bearer YOUR_STATS_KEY" "https://YOUR-SITE/api/leads?format=csv" -o players.csv`
  (leave off `?format=csv` for JSON). They are stored once per email address in the same Upstash database, are never returned by a public route, and the key is required. Treat the file as private. The CSV has a `wants_updates` column: only email people who said yes, one at a time, from your own address. The `/stats` Players tab shows the same list.
- Someone asks to be removed: they can use the form at `/privacy`, or delete them yourself by removing the email from the `leads:e` hash in Upstash.
- Remove a bad leaderboard name: `/stats`, Moderation, Load board, Remove.
- Free-tier Upstash allows roughly 500,000 commands a month. A game uses about 30, so that is thousands of plays a month.
