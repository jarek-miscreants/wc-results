import { json, bad } from "../../../lib/api.js";

// POST /api/admin/result  { fixtureId, home, away }
// Header: X-Admin-Key: <ADMIN_KEY>
// Records a final score and marks the fixture finished.
export async function onRequestPost({ request, env }) {
  if (request.headers.get("X-Admin-Key") !== env.ADMIN_KEY) {
    return bad("Forbidden", 403);
  }

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
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return bad("Scores must be non-negative whole numbers");
  }

  const res = await env.DB.prepare(
    "UPDATE fixtures SET home_score = ?, away_score = ?, status = 'finished' WHERE id = ?"
  )
    .bind(home, away, fixtureId)
    .run();

  if (res.meta.changes === 0) return bad("Unknown fixture", 404);
  return json({ ok: true });
}
