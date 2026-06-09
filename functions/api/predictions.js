import { json, bad, getUser } from "../../lib/api.js";

// GET /api/predictions  ->  { predictions: { [fixtureId]: { home, away } } }
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return bad("Not signed in", 401);

  const { results } = await env.DB.prepare(
    "SELECT fixture_id, home_pred, away_pred FROM predictions WHERE user_id = ?"
  )
    .bind(user.id)
    .all();

  const predictions = {};
  for (const r of results) {
    predictions[r.fixture_id] = { home: r.home_pred, away: r.away_pred };
  }
  return json({ predictions });
}

// POST /api/predictions  { fixtureId, home, away }  -> upsert a prediction.
// Rejected once the match has kicked off.
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return bad("Not signed in", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const fixtureId = Number(body.fixtureId);
  const home = Number(body.home);
  const away = Number(body.away);

  if (!Number.isInteger(fixtureId)) return bad("Missing fixtureId");
  if (!isValidScore(home) || !isValidScore(away)) {
    return bad("Scores must be whole numbers between 0 and 30");
  }

  const fixture = await env.DB.prepare(
    "SELECT kickoff FROM fixtures WHERE id = ?"
  )
    .bind(fixtureId)
    .first();
  if (!fixture) return bad("Unknown fixture", 404);

  if (new Date(fixture.kickoff).getTime() <= Date.now()) {
    return bad("This match has already kicked off — predictions are locked", 403);
  }

  await env.DB.prepare(
    "INSERT INTO predictions (user_id, fixture_id, home_pred, away_pred) " +
      "VALUES (?1, ?2, ?3, ?4) " +
      "ON CONFLICT(user_id, fixture_id) DO UPDATE SET " +
      "home_pred = ?3, away_pred = ?4, updated_at = datetime('now')"
  )
    .bind(user.id, fixtureId, home, away)
    .run();

  return json({ ok: true });
}

function isValidScore(n) {
  return Number.isInteger(n) && n >= 0 && n <= 30;
}
