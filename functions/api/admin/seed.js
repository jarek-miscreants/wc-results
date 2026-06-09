import { json, bad } from "../../../lib/api.js";
import fixtures from "../../../data/fixtures.json";

// POST /api/admin/seed
// Header: X-Admin-Key: <ADMIN_KEY>
// Loads data/fixtures.json into the fixtures table. Existing rows (by id) are
// left untouched, so this is safe to re-run after adding new fixtures.
export async function onRequestPost({ request, env }) {
  if (request.headers.get("X-Admin-Key") !== env.ADMIN_KEY) {
    return bad("Forbidden", 403);
  }

  const stmt = env.DB.prepare(
    "INSERT OR IGNORE INTO fixtures (id, stage, home_team, away_team, kickoff) " +
      "VALUES (?, ?, ?, ?, ?)"
  );

  const batch = fixtures.map((f) =>
    stmt.bind(f.id, f.stage, f.home_team, f.away_team, f.kickoff)
  );
  await env.DB.batch(batch);

  return json({ ok: true, seeded: fixtures.length });
}
