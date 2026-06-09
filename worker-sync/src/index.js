// Cron Worker: pull finished match results from football-data.org and write
// them into the shared D1 `fixtures` table, marking matches finished so the
// leaderboard scores them automatically.
//
// Matching strategy (chosen for an office game): a finished API match is applied
// only when it maps to EXACTLY ONE not-yet-finished fixture whose home and away
// team names both match (same orientation). This is deliberately conservative —
// ambiguous or unmatched games are skipped and reported, never guessed. It
// relies on fixtures having real team names (use the admin "Save details" editor
// to replace placeholders like A2 / W73 once matchups are known).

export default {
  // Cloudflare cron trigger.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sync(env));
  },

  // Manual trigger for testing / forcing a run. Protected by SYNC_KEY if set:
  //   GET https://wc-results-sync.<subdomain>.workers.dev/sync?key=YOUR_SYNC_KEY
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/sync") {
      return new Response("wc-results-sync worker. GET /sync to run a sync.\n", {
        status: 200,
      });
    }
    if (env.SYNC_KEY && url.searchParams.get("key") !== env.SYNC_KEY) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    const result = await sync(env);
    return new Response(JSON.stringify(result, null, 2), {
      status: result.error ? 502 : 200,
      headers: { "content-type": "application/json" },
    });
  },
};

async function sync(env) {
  const token = env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return { error: "FOOTBALL_DATA_TOKEN secret is not set" };
  }
  const competition = env.COMPETITION || "WC";

  // 1. Pull finished matches from the football API.
  let apiMatches;
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED`,
      { headers: { "X-Auth-Token": token } }
    );
    if (!res.ok) {
      return { error: `football-data.org returned ${res.status}`, detail: await safeText(res) };
    }
    ({ matches: apiMatches = [] } = await res.json());
  } catch (e) {
    return { error: `fetch failed: ${e.message}` };
  }

  // 2. Load the fixtures we might still update.
  const { results: fixtures } = await env.DB.prepare(
    "SELECT id, home_team, away_team, kickoff FROM fixtures WHERE status != 'finished'"
  ).all();

  // 3. Match each finished API game to exactly one open fixture.
  const updates = new Map(); // fixtureId -> { id, home, away, label }
  const unmatched = [];

  for (const m of apiMatches) {
    const home = m?.score?.fullTime?.home;
    const away = m?.score?.fullTime?.away;
    if (home == null || away == null) continue; // no usable scoreline

    const apiHome = nameForms(m.homeTeam);
    const apiAway = nameForms(m.awayTeam);

    const candidates = fixtures.filter(
      (f) => apiHome.has(norm(f.home_team)) && apiAway.has(norm(f.away_team))
    );

    const label = `${m.homeTeam?.name ?? "?"} ${home}-${away} ${m.awayTeam?.name ?? "?"}`;
    if (candidates.length === 1) {
      updates.set(candidates[0].id, { id: candidates[0].id, home, away, label });
    } else {
      unmatched.push({ match: label, candidates: candidates.length });
    }
  }

  // 4. Apply. The WHERE guard keeps us from clobbering a manual correction that
  //    landed between the SELECT and now.
  let applied = 0;
  if (updates.size) {
    const stmt = env.DB.prepare(
      "UPDATE fixtures SET home_score = ?, away_score = ?, status = 'finished' " +
        "WHERE id = ? AND status != 'finished'"
    );
    const res = await env.DB.batch(
      [...updates.values()].map((u) => stmt.bind(u.home, u.away, u.id))
    );
    applied = res.reduce((n, r) => n + (r.meta?.changes ?? 0), 0);
  }

  return {
    finishedFromApi: apiMatches.length,
    applied,
    updates: [...updates.values()].map((u) => u.label),
    unmatched,
  };
}

// Normalise a team name for comparison: strip accents, lowercase, drop anything
// that isn't a letter or digit. "Côte d'Ivoire" -> "cotedivoire".
function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// All the name variants the API gives us for a team, normalised into a Set so a
// fixture name matches whether it stored the full name, short name or TLA.
function nameForms(team) {
  const set = new Set();
  for (const v of [team?.name, team?.shortName, team?.tla]) {
    const n = norm(v);
    if (n) set.add(n);
  }
  return set;
}

async function safeText(res) {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}
