// One-off: replace the 72 group-stage fixtures with the real 2026 World Cup
// schedule (teams + kickoff times in UTC), keeping the knockout bracket (ids
// 73-104) untouched since those teams depend on results. Run: node scripts/build-real-fixtures.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "data", "fixtures.json");
const existing = JSON.parse(readFileSync(path, "utf8"));

// Real group-stage schedule, sorted by kickoff. Source: cross-checked against
// ESPN, Sky Sports and WiLX schedules (ET anchored, June 2026 = EDT = UTC-4).
const groups = [
  ["Group A", "Mexico", "South Africa", "2026-06-11T19:00:00Z"],
  ["Group A", "South Korea", "Czech Republic", "2026-06-12T02:00:00Z"],
  ["Group B", "Canada", "Bosnia and Herzegovina", "2026-06-12T19:00:00Z"],
  ["Group D", "United States", "Paraguay", "2026-06-13T01:00:00Z"],
  ["Group B", "Qatar", "Switzerland", "2026-06-13T19:00:00Z"],
  ["Group C", "Brazil", "Morocco", "2026-06-13T22:00:00Z"],
  ["Group C", "Haiti", "Scotland", "2026-06-14T01:00:00Z"],
  ["Group D", "Australia", "Turkey", "2026-06-14T04:00:00Z"],
  ["Group E", "Germany", "Curaçao", "2026-06-14T17:00:00Z"],
  ["Group F", "Netherlands", "Japan", "2026-06-14T20:00:00Z"],
  ["Group E", "Ivory Coast", "Ecuador", "2026-06-14T23:00:00Z"],
  ["Group F", "Sweden", "Tunisia", "2026-06-15T02:00:00Z"],
  ["Group H", "Spain", "Cape Verde", "2026-06-15T16:00:00Z"],
  ["Group G", "Belgium", "Egypt", "2026-06-15T19:00:00Z"],
  ["Group H", "Saudi Arabia", "Uruguay", "2026-06-15T22:00:00Z"],
  ["Group G", "Iran", "New Zealand", "2026-06-16T01:00:00Z"],
  ["Group I", "France", "Senegal", "2026-06-16T19:00:00Z"],
  ["Group I", "Iraq", "Norway", "2026-06-16T22:00:00Z"],
  ["Group J", "Argentina", "Algeria", "2026-06-17T01:00:00Z"],
  ["Group J", "Austria", "Jordan", "2026-06-17T04:00:00Z"],
  ["Group K", "Portugal", "DR Congo", "2026-06-17T17:00:00Z"],
  ["Group L", "England", "Croatia", "2026-06-17T20:00:00Z"],
  ["Group L", "Ghana", "Panama", "2026-06-17T23:00:00Z"],
  ["Group K", "Uzbekistan", "Colombia", "2026-06-18T02:00:00Z"],
  ["Group A", "Czech Republic", "South Africa", "2026-06-18T16:00:00Z"],
  ["Group B", "Switzerland", "Bosnia and Herzegovina", "2026-06-18T19:00:00Z"],
  ["Group B", "Canada", "Qatar", "2026-06-18T22:00:00Z"],
  ["Group A", "Mexico", "South Korea", "2026-06-19T01:00:00Z"],
  ["Group D", "United States", "Australia", "2026-06-19T19:00:00Z"],
  ["Group C", "Scotland", "Morocco", "2026-06-19T22:00:00Z"],
  ["Group C", "Brazil", "Haiti", "2026-06-20T00:30:00Z"],
  ["Group D", "Turkey", "Paraguay", "2026-06-20T03:00:00Z"],
  ["Group F", "Netherlands", "Sweden", "2026-06-20T17:00:00Z"],
  ["Group E", "Germany", "Ivory Coast", "2026-06-20T20:00:00Z"],
  ["Group E", "Ecuador", "Curaçao", "2026-06-21T00:00:00Z"],
  ["Group F", "Tunisia", "Japan", "2026-06-21T04:00:00Z"],
  ["Group H", "Spain", "Saudi Arabia", "2026-06-21T16:00:00Z"],
  ["Group G", "Belgium", "Iran", "2026-06-21T19:00:00Z"],
  ["Group H", "Uruguay", "Cape Verde", "2026-06-21T22:00:00Z"],
  ["Group G", "New Zealand", "Egypt", "2026-06-22T01:00:00Z"],
  ["Group J", "Argentina", "Austria", "2026-06-22T17:00:00Z"],
  ["Group I", "France", "Iraq", "2026-06-22T21:00:00Z"],
  ["Group I", "Norway", "Senegal", "2026-06-23T00:00:00Z"],
  ["Group J", "Jordan", "Algeria", "2026-06-23T03:00:00Z"],
  ["Group K", "Portugal", "Uzbekistan", "2026-06-23T17:00:00Z"],
  ["Group L", "England", "Ghana", "2026-06-23T20:00:00Z"],
  ["Group L", "Panama", "Croatia", "2026-06-23T23:00:00Z"],
  ["Group K", "Colombia", "DR Congo", "2026-06-24T02:00:00Z"],
  ["Group B", "Switzerland", "Canada", "2026-06-24T19:00:00Z"],
  ["Group B", "Bosnia and Herzegovina", "Qatar", "2026-06-24T19:00:00Z"],
  ["Group C", "Scotland", "Brazil", "2026-06-24T22:00:00Z"],
  ["Group C", "Morocco", "Haiti", "2026-06-24T22:00:00Z"],
  ["Group A", "Czech Republic", "Mexico", "2026-06-25T01:00:00Z"],
  ["Group A", "South Africa", "South Korea", "2026-06-25T01:00:00Z"],
  ["Group E", "Ecuador", "Germany", "2026-06-25T20:00:00Z"],
  ["Group E", "Curaçao", "Ivory Coast", "2026-06-25T20:00:00Z"],
  ["Group F", "Japan", "Sweden", "2026-06-25T23:00:00Z"],
  ["Group F", "Tunisia", "Netherlands", "2026-06-25T23:00:00Z"],
  ["Group D", "Turkey", "United States", "2026-06-26T02:00:00Z"],
  ["Group D", "Paraguay", "Australia", "2026-06-26T02:00:00Z"],
  ["Group I", "Norway", "France", "2026-06-26T19:00:00Z"],
  ["Group I", "Senegal", "Iraq", "2026-06-26T19:00:00Z"],
  ["Group H", "Uruguay", "Spain", "2026-06-27T00:00:00Z"],
  ["Group H", "Cape Verde", "Saudi Arabia", "2026-06-27T00:00:00Z"],
  ["Group G", "New Zealand", "Belgium", "2026-06-27T03:00:00Z"],
  ["Group G", "Egypt", "Iran", "2026-06-27T03:00:00Z"],
  ["Group L", "Panama", "England", "2026-06-27T21:00:00Z"],
  ["Group L", "Croatia", "Ghana", "2026-06-27T21:00:00Z"],
  ["Group K", "Colombia", "Portugal", "2026-06-27T23:30:00Z"],
  ["Group K", "DR Congo", "Uzbekistan", "2026-06-27T23:30:00Z"],
  ["Group J", "Jordan", "Argentina", "2026-06-28T02:00:00Z"],
  ["Group J", "Algeria", "Austria", "2026-06-28T02:00:00Z"],
];

const groupFixtures = groups.map(([stage, home, away, kickoff], i) => ({
  id: i + 1,
  stage,
  home_team: home,
  away_team: away,
  kickoff,
}));

// Sanity: every group must have exactly 6 matches and a valid round-robin.
const byGroup = {};
for (const f of groupFixtures) (byGroup[f.stage] ||= []).push(f);
for (const [g, ms] of Object.entries(byGroup)) {
  if (ms.length !== 6) throw new Error(`${g} has ${ms.length} matches, expected 6`);
  const teams = new Set(ms.flatMap((m) => [m.home_team, m.away_team]));
  if (teams.size !== 4) throw new Error(`${g} has ${teams.size} teams, expected 4`);
  const counts = {};
  for (const m of ms) {
    counts[m.home_team] = (counts[m.home_team] || 0) + 1;
    counts[m.away_team] = (counts[m.away_team] || 0) + 1;
  }
  for (const [t, c] of Object.entries(counts))
    if (c !== 3) throw new Error(`${g}: ${t} plays ${c} matches, expected 3`);
}

const knockout = existing.filter((f) => f.id > 72);
const all = [...groupFixtures, ...knockout];
writeFileSync(path, JSON.stringify(all, null, 2) + "\n");
console.log(`Wrote ${all.length} fixtures (${groupFixtures.length} group + ${knockout.length} knockout)`);
