import { json, scorePrediction } from "../../lib/api.js";

// GET /api/leaderboard  ->  { standings: [{ name, points, exact, correct, played }] }
// Scoring is computed in JS so the rules stay readable: 3 pts exact, 1 pt outcome.
export async function onRequestGet({ env }) {
  const [usersRes, fixturesRes, predsRes] = await Promise.all([
    env.DB.prepare("SELECT id, name FROM users").all(),
    env.DB.prepare(
      "SELECT id, home_score, away_score, status FROM fixtures WHERE status = 'finished'"
    ).all(),
    env.DB.prepare(
      "SELECT user_id, fixture_id, home_pred, away_pred FROM predictions"
    ).all(),
  ]);

  const fixtureById = new Map(fixturesRes.results.map((f) => [f.id, f]));

  const tally = new Map();
  for (const u of usersRes.results) {
    tally.set(u.id, { name: u.name, points: 0, exact: 0, correct: 0, played: 0 });
  }

  for (const p of predsRes.results) {
    const fixture = fixtureById.get(p.fixture_id);
    if (!fixture) continue; // match not finished yet
    const row = tally.get(p.user_id);
    if (!row) continue;
    const pts = scorePrediction(p, fixture);
    row.points += pts;
    row.played += 1;
    if (pts === 3) row.exact += 1;
    else if (pts === 1) row.correct += 1;
  }

  const standings = [...tally.values()].sort(
    (a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name)
  );

  return json({ standings });
}
