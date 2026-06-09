import { json, bad, getUser, scorePrediction } from "../../lib/api.js";

// GET /api/match-picks?fixtureId=NN
// Returns every player's prediction for one match — but only once the match has
// kicked off, so nobody can copy picks beforehand.
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return bad("Not signed in", 401);

  const fixtureId = Number(new URL(request.url).searchParams.get("fixtureId"));
  if (!Number.isInteger(fixtureId)) return bad("Missing fixtureId");

  const fixture = await env.DB.prepare(
    "SELECT id, stage, kickoff, home_score, away_score, status FROM fixtures WHERE id = ?"
  )
    .bind(fixtureId)
    .first();
  if (!fixture) return bad("Unknown fixture", 404);

  if (new Date(fixture.kickoff).getTime() > Date.now()) {
    return bad("Picks are hidden until kick-off", 403);
  }

  const { results } = await env.DB.prepare(
    "SELECT u.name AS name, p.home_pred, p.away_pred " +
      "FROM predictions p JOIN users u ON u.id = p.user_id " +
      "WHERE p.fixture_id = ?"
  )
    .bind(fixtureId)
    .all();

  const picks = results
    .map((r) => ({
      name: r.name,
      home: r.home_pred,
      away: r.away_pred,
      points: scorePrediction(r, fixture),
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return json({ picks, finished: fixture.status === "finished" });
}
