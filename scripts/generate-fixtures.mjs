// Generates data/fixtures.json with the full 2026 World Cup structure:
// 12 groups (A–L) × 6 matches = 72 group games, then a 32-team knockout
// bracket (Round of 32 → Final) for 104 matches total.
//
// Team names and exact kick-off times are PLACEHOLDERS — replace them with the
// official schedule once known, then re-seed. Knockout slots use bracket
// progression labels (e.g. "W73" = winner of match 73) which stay accurate
// regardless of who qualifies.
//
//   node scripts/generate-fixtures.mjs

import { writeFileSync } from "node:fs";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
// A handful of confirmed host slots; everything else is a placeholder label.
const HOSTS = { A1: "Mexico", B1: "Canada", D1: "USA" };

// Standard intra-group match order (team indices 1–4).
const GROUP_ORDER = [
  [1, 2], [3, 4],
  [1, 3], [2, 4],
  [1, 4], [2, 3],
];

const fixtures = [];
let id = 0;

const slot = (g, p) => HOSTS[`${g}${p}`] || `${g}${p}`;

// One kick-off time per match, spread across plausible tournament dates.
function makeClock(startDay, perDay = 5, hoursUTC = [16, 19, 22, 1]) {
  let n = 0;
  return () => {
    const day = Math.floor(n / perDay);
    const slotInDay = n % perDay;
    n++;
    const d = new Date(Date.UTC(2026, 5, startDay)); // month is 0-indexed (5 = June)
    d.setUTCDate(d.getUTCDate() + day);
    const hour = hoursUTC[slotInDay % hoursUTC.length];
    // hour of 1 means just past midnight -> next calendar day
    if (hour < 6) d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString().replace(".000Z", "Z");
  };
}

// --- Group stage: ids 1–72 --------------------------------------------------
const groupClock = makeClock(11, 5);
for (const g of GROUPS) {
  for (const [a, b] of GROUP_ORDER) {
    fixtures.push({
      id: ++id,
      stage: `Group ${g}`,
      home_team: slot(g, a),
      away_team: slot(g, b),
      kickoff: groupClock(),
    });
  }
}

// --- Knockout bracket -------------------------------------------------------
// Helper to add a round whose teams reference earlier match winners/losers.
function addRound(stage, count, homeFn, awayFn, clock) {
  const startId = id + 1;
  for (let k = 0; k < count; k++) {
    fixtures.push({
      id: ++id,
      stage,
      home_team: homeFn(k),
      away_team: awayFn(k),
      kickoff: clock(),
    });
  }
  return startId; // first id of this round
}

// Round of 32 (ids 73–88): 32 group qualifiers fill 16 matches.
const r32Clock = makeClock(28, 4);
const r32Start = addRound(
  "Round of 32", 16,
  (k) => `Q${2 * k + 1}`,
  (k) => `Q${2 * k + 2}`,
  r32Clock
);

// Round of 16 (ids 89–96): winners of consecutive R32 matches.
const r16Clock = makeClock(34, 2); // ~ Jul 4–7
const r16Start = addRound(
  "Round of 16", 8,
  (k) => `W${r32Start + 2 * k}`,
  (k) => `W${r32Start + 2 * k + 1}`,
  r16Clock
);

// Quarter-finals (ids 97–100).
const qfClock = makeClock(39, 2); // ~ Jul 9–11
const qfStart = addRound(
  "Quarter-final", 4,
  (k) => `W${r16Start + 2 * k}`,
  (k) => `W${r16Start + 2 * k + 1}`,
  qfClock
);

// Semi-finals (ids 101–102).
const sfClock = makeClock(44, 1); // ~ Jul 14–15
const sfStart = addRound(
  "Semi-final", 2,
  (k) => `W${qfStart + 2 * k}`,
  (k) => `W${qfStart + 2 * k + 1}`,
  sfClock
);

// Third-place play-off (id 103): losers of the semi-finals.
addRound(
  "Third place", 1,
  () => `L${sfStart}`,
  () => `L${sfStart + 1}`,
  makeClock(48, 1) // ~ Jul 18
);

// Final (id 104).
addRound(
  "Final", 1,
  () => `W${sfStart}`,
  () => `W${sfStart + 1}`,
  makeClock(49, 1) // ~ Jul 19
);

writeFileSync(
  new URL("../data/fixtures.json", import.meta.url),
  JSON.stringify(fixtures, null, 2) + "\n"
);
console.log(`Wrote ${fixtures.length} fixtures.`);
