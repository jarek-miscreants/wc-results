import { json, bad } from "../../../lib/api.js";

// POST /api/admin/fixture  { fixtureId, home_team?, away_team?, kickoff? }
// Header: X-Admin-Key: <ADMIN_KEY>
// Edits a fixture's team names and/or kickoff time. Use this once the real draw
// or a knockout matchup is known to replace placeholder labels (A2, W73, …) and
// to correct kickoff times. Only the fields you send are changed.
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
  if (!Number.isInteger(fixtureId)) return bad("Missing fixtureId");

  const sets = [];
  const binds = [];

  if (body.home_team !== undefined) {
    const home = String(body.home_team).trim().slice(0, 60);
    if (!home) return bad("Home team can't be empty");
    sets.push("home_team = ?");
    binds.push(home);
  }
  if (body.away_team !== undefined) {
    const away = String(body.away_team).trim().slice(0, 60);
    if (!away) return bad("Away team can't be empty");
    sets.push("away_team = ?");
    binds.push(away);
  }
  if (body.kickoff !== undefined) {
    const kickoff = String(body.kickoff).trim();
    if (Number.isNaN(new Date(kickoff).getTime())) {
      return bad("Kickoff must be a valid date/time (ISO 8601)");
    }
    sets.push("kickoff = ?");
    binds.push(kickoff);
  }

  if (!sets.length) return bad("Nothing to update");

  const res = await env.DB.prepare(
    `UPDATE fixtures SET ${sets.join(", ")} WHERE id = ?`
  )
    .bind(...binds, fixtureId)
    .run();

  if (res.meta.changes === 0) return bad("Unknown fixture", 404);
  return json({ ok: true });
}
