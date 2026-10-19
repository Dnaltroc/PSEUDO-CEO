/* GET /api/seed: hands out a signed scenario code. Only games that start from one of these can be posted to the leaderboard. */
const { limit, route, newSeed } = require('./_lib');

module.exports = route(['GET'], async (req, res) => {
  await limit(req, 'seed', 40, 3600);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ seed: newSeed() });
});
