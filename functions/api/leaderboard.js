import { json, scorePrediction, basePoints } from "../../lib/api.js";

// A "contrarian hit" is getting the result right on a match where few others
// did — the basis for the 🧠 Mind Game tag. A match counts as contrarian-worthy
// only when enough people predicted it (so a 1-of-2 fluke doesn't qualify).
const SOLO_MIN_PREDICTORS = 4;
const SOLO_HIT_RATE = 0.3; // you scored while ≤30% of predictors did

// GET /api/leaderboard
//   -> { standings: [{ name, points, exact, correct, played, form, solo }] }
// `form` is the player's base points (0/1/3) for their last up-to-5 finished
// matches, newest first; `solo` is how many of those were contrarian hits.
// The frontend turns these into a performance tag.
// Scoring is computed in JS so the rules stay readable: 3 pts exact, 1 pt outcome.
export async function onRequestGet({ env }) {
  const [usersRes, fixturesRes, predsRes] = await Promise.all([
    env.DB.prepare("SELECT id, name FROM users").all(),
    env.DB.prepare(
      "SELECT id, stage, kickoff, home_score, away_score, status FROM fixtures WHERE status = 'finished'"
    ).all(),
    env.DB.prepare(
      "SELECT user_id, fixture_id, home_pred, away_pred FROM predictions"
    ).all(),
  ]);

  const fixtureById = new Map(fixturesRes.results.map((f) => [f.id, f]));

  // Pass 1: per finished match, how many predicted it and how many got the
  // result right — used to judge whether a hit was contrarian.
  const fixtureStats = new Map(); // fixtureId -> { total, hits }
  for (const p of predsRes.results) {
    const fixture = fixtureById.get(p.fixture_id);
    if (!fixture) continue;
    const st = fixtureStats.get(p.fixture_id) || { total: 0, hits: 0 };
    st.total += 1;
    if (basePoints(p, fixture) > 0) st.hits += 1;
    fixtureStats.set(p.fixture_id, st);
  }

  const isContrarianHit = (p, fixture) => {
    if (basePoints(p, fixture) <= 0) return false;
    const st = fixtureStats.get(p.fixture_id);
    return st && st.total >= SOLO_MIN_PREDICTORS && st.hits / st.total <= SOLO_HIT_RATE;
  };

  const tally = new Map();
  for (const u of usersRes.results) {
    tally.set(u.id, { name: u.name, points: 0, exact: 0, correct: 0, played: 0, _form: [] });
  }

  for (const p of predsRes.results) {
    const fixture = fixtureById.get(p.fixture_id);
    if (!fixture) continue; // match not finished yet
    const row = tally.get(p.user_id);
    if (!row) continue;
    const base = basePoints(p, fixture);
    row.points += scorePrediction(p, fixture);
    row.played += 1;
    if (base === 3) row.exact += 1;
    else if (base === 1) row.correct += 1;
    row._form.push({ kickoff: fixture.kickoff, base, solo: isContrarianHit(p, fixture) });
  }

  const standings = [...tally.values()]
    .map((r) => {
      const recent = r._form
        .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff))
        .slice(0, 5);
      delete r._form;
      return { ...r, form: recent.map((x) => x.base), solo: recent.filter((x) => x.solo).length };
    })
    .sort(
      (a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name)
    );

  return json({ standings });
}
