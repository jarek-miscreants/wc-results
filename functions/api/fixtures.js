import { json } from "../../lib/api.js";

// GET /api/fixtures  ->  list of all fixtures ordered by kickoff.
// Results (home_score/away_score) are included once a match is finished.
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, stage, home_team, away_team, kickoff, home_score, away_score, status " +
      "FROM fixtures ORDER BY kickoff ASC, id ASC"
  ).all();
  return json({ fixtures: results });
}
