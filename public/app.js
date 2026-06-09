// --- tiny state + helpers ---------------------------------------------------
const store = {
  get token() { return localStorage.getItem("wc_token"); },
  get name() { return localStorage.getItem("wc_name"); },
  set(token, name) {
    localStorage.setItem("wc_token", token);
    localStorage.setItem("wc_name", name);
  },
  clear() { localStorage.removeItem("wc_token"); localStorage.removeItem("wc_name"); },
};

async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (store.token) headers["Authorization"] = "Bearer " + store.token;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

const $ = (id) => document.getElementById(id);

// Escape any user- or admin-supplied string before it goes into innerHTML.
// Player names, team names and stage labels are all attacker-influenced.
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// Team name -> ISO 3166-1 alpha-2 code (for flag images). Covers every real
// team in the fixtures plus a few common name variants. Knockout placeholders
// (Q1, W73, L101…) aren't here and fall back to a neutral globe.
const TEAM_ISO = {
  Algeria: "dz", Argentina: "ar", Australia: "au", Austria: "at", Belgium: "be",
  "Bosnia and Herzegovina": "ba", Brazil: "br", Canada: "ca", "Cape Verde": "cv",
  "Cabo Verde": "cv", Colombia: "co", Croatia: "hr", "Curaçao": "cw", Curacao: "cw",
  "Czech Republic": "cz", Czechia: "cz", "DR Congo": "cd", Ecuador: "ec", Egypt: "eg",
  England: "gb-eng", France: "fr", Germany: "de", Ghana: "gh", Haiti: "ht", Iran: "ir",
  Iraq: "iq", "Ivory Coast": "ci", "Côte d'Ivoire": "ci", Japan: "jp", Jordan: "jo",
  Mexico: "mx", Morocco: "ma", Netherlands: "nl", "New Zealand": "nz", Norway: "no",
  Panama: "pa", Paraguay: "py", Portugal: "pt", Qatar: "qa", "Saudi Arabia": "sa",
  Scotland: "gb-sct", Senegal: "sn", "South Africa": "za", "South Korea": "kr",
  Spain: "es", Sweden: "se", Switzerland: "ch", Tunisia: "tn", Turkey: "tr",
  "Türkiye": "tr", "United States": "us", USA: "us", Uruguay: "uy", Uzbekistan: "uz",
  Wales: "gb-wls", "Northern Ireland": "gb-nir",
};

const GLOBE_SVG =
  `<svg class="flag flag-globe" viewBox="0 0 24 24" aria-hidden="true">` +
  `<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/>` +
  `<path fill="none" stroke="currentColor" stroke-width="1.6" d="M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20"/>` +
  `</svg>`;

// A circular flag image for a team, or a globe for unknown/placeholder teams.
function flag(team) {
  const code = TEAM_ISO[team];
  if (!code) return GLOBE_SVG;
  return (
    `<img class="flag" src="https://flagcdn.com/w80/${code}.png" ` +
    `srcset="https://flagcdn.com/w160/${code}.png 2x" ` +
    `alt="${esc(team)}" title="${esc(team)}" loading="lazy" />`
  );
}

// Inline SVG icons (stroke = currentColor, so they inherit text colour).
const svg = (paths) =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const ICONS = {
  calendar: svg(`<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>`),
  clipboard: svg(`<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM9 11h6M9 15h4"/>`),
  check: svg(`<circle cx="12" cy="12" r="9"/><path d="M8.3 12.4l2.6 2.6 4.8-5.3"/>`),
  grid: svg(`<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>`),
  chevron: svg(`<path d="M6 9.5l6 6 6-6"/>`),
  clock: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>`),
  // performance-tag icons
  flame: svg(`<path d="M12 2.5C13.5 6 17 7.5 17 12a5 5 0 0 1-10 0c0-1.7.8-3 1.8-4-.2 1.3.5 2.3 1.4 2.5C9 8.5 9.7 5.7 12 2.5z"/>`),
  target: svg(`<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none"/>`),
  star: svg(`<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>`),
  trend: svg(`<path d="M4 15l5-5 3 3 6-7"/><path d="M15 6h4v4"/>`),
  thumb: svg(`<path d="M7.5 11.5l3.5-7c1.1 0 2 .9 2 2l-.8 3.5h4.6a2 2 0 0 1 2 2.4l-1.1 5.2a2 2 0 0 1-2 1.6H7.5z"/><path d="M7.5 11.5H4.5v8h3z"/>`),
  snow: svg(`<path d="M12 3v18M3.3 7.5l17.4 9M20.7 7.5L3.3 16.5"/>`),
  sparkle: svg(`<path d="M12 4l1.4 4.2L18 9.6l-4.6 1.4L12 16l-1.4-4.6L6 9.6l4.6-1.4z"/>`),
  brain: svg(`<path d="M12 5.2a2.7 2.7 0 0 0-4.8-1.7 2.3 2.3 0 0 0-2 3.3 2.4 2.4 0 0 0 .2 3.9A2.4 2.4 0 0 0 7 14.4a2.6 2.6 0 0 0 5 .4z"/><path d="M12 5.2a2.7 2.7 0 0 1 4.8-1.7 2.3 2.3 0 0 1 2 3.3 2.4 2.4 0 0 1-.2 3.9A2.4 2.4 0 0 1 17 14.4a2.6 2.6 0 0 1-5 .4z"/><path d="M12 5.2v9.6"/>`),
};

const fmtKickoff = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

// Kickoff split into a date line and a time line (for the two-line date column).
function fmtKickoffParts(iso) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

// --- login ------------------------------------------------------------------
let loginMode = "join"; // "join" | "login"

function setMode(mode) {
  loginMode = mode;
  const joining = mode === "join";
  $("modeJoin").classList.toggle("active", joining);
  $("modeLogin").classList.toggle("active", !joining);
  $("code").classList.toggle("hidden", !joining); // join code only needed to join
  $("pin").placeholder = joining ? "Choose a PIN (4+ chars)" : "Your PIN";
  $("submitBtn").textContent = joining ? "Join the game" : "Log in";
  $("loginHint").textContent = joining
    ? "Your PIN lets you log back in on any device."
    : "Use the name and PIN you picked when you joined.";
  $("loginError").textContent = "";
}

$("modeJoin").onclick = () => setMode("join");
$("modeLogin").onclick = () => setMode("login");

$("submitBtn").onclick = async () => {
  $("loginError").textContent = "";
  const body = { name: $("name").value, pin: $("pin").value };
  if (loginMode === "join") body.code = $("code").value;
  try {
    const { token, name } = await api(loginMode === "join" ? "/api/join" : "/api/login", {
      method: "POST",
      body,
    });
    store.set(token, name);
    showApp();
  } catch (e) {
    $("loginError").textContent = e.message;
  }
};

$("logoutBtn").onclick = () => {
  store.clear();
  location.reload();
};

// --- tabs -------------------------------------------------------------------
const TABS = {
  fixtures: { btn: "tabFixtures", view: "fixturesView", load: () => loadFixtures() },
  results: { btn: "tabResults", view: "resultsView", load: () => loadResults() },
  board: { btn: "tabBoard", view: "boardView", load: () => loadBoard() },
};

$("tabFixtures").onclick = () => switchTab("fixtures");
$("tabResults").onclick = () => switchTab("results");
$("tabBoard").onclick = () => switchTab("board");

function switchTab(which) {
  for (const [key, t] of Object.entries(TABS)) {
    const active = key === which;
    $(t.btn).classList.toggle("active", active);
    $(t.view).classList.toggle("hidden", !active);
  }
  TABS[which].load();
}

// --- fixtures + predictions -------------------------------------------------
let allFixtures = [];
let myPredictions = {};
let stageFilter = "all";
let statusFilter = "todo"; // todo | predicted | all
let openStages = null; // Set of expanded stage names; null = "open the first one"

// Canonical display order: groups A→L, then knockout rounds in bracket order.
// Independent of kickoff times so sections never reshuffle as matches are
// predicted (the schedule interleaves groups, e.g. D's opener before C's).
function stageRank(stage) {
  const g = /^Group ([A-Z])$/.exec(stage);
  if (g) return g[1].charCodeAt(0) - 65; // A=0 … L=11
  const ko = ["Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Third place", "Final"];
  const i = ko.indexOf(stage);
  return i === -1 ? 1000 : 100 + i; // knockout after groups; unknown last
}

function stageWeight(stage) {
  if (/^Group/.test(stage)) return 1;
  if (stage === "Quarter-final" || stage === "Semi-final" || stage === "Third place") return 2;
  if (stage === "Final") return 3;
  return 1;
}

const isOpen = (f, now) =>
  f.status !== "finished" && new Date(f.kickoff).getTime() > now;

// A match is "closing soon" once its kickoff (the prediction lock) is within
// this window. Used for the urgency badge and the deadline banner.
const SOON_MS = 24 * 60 * 60 * 1000;
const closesSoon = (f, now) =>
  isOpen(f, now) && new Date(f.kickoff).getTime() - now <= SOON_MS;

// Short "time until kickoff" label, e.g. "45m", "6h", "2d".
function untilLabel(iso, now) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "now";
  const mins = ms / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function passesStatus(f, now) {
  if (statusFilter === "all") return true;
  if (statusFilter === "predicted") return !!myPredictions[f.id];
  return isOpen(f, now) && !myPredictions[f.id]; // "todo"
}

async function loadFixtures() {
  const view = $("fixturesView");
  view.innerHTML = "<p class='note'>Loading fixtures…</p>";
  const [{ fixtures }, { predictions }] = await Promise.all([
    api("/api/fixtures"),
    api("/api/predictions"),
  ]);
  allFixtures = fixtures;
  myPredictions = predictions;
  refreshMatchday();

  if (!fixtures.length) {
    view.innerHTML = "<p class='note'>No fixtures loaded yet. The admin needs to seed them.</p>";
    return;
  }
  renderFixtures();
}

function renderFixtures() {
  const view = $("fixturesView");
  const scrollY = window.scrollY;
  view.innerHTML = "";
  const now = Date.now();

  view.appendChild(renderFilterBar(now));

  const banner = renderDeadlineBanner(now);
  if (banner) view.appendChild(banner);

  const shown = allFixtures.filter(
    (f) => (stageFilter === "all" || f.stage === stageFilter) && passesStatus(f, now)
  );

  if (!shown.length) {
    const p = document.createElement("p");
    p.className = "note empty";
    p.textContent =
      statusFilter === "todo"
        ? "🎉 Nothing left to predict in this view."
        : "No matches match this filter.";
    view.appendChild(p);
    return;
  }

  // Group into collapsible sections by stage, in canonical bracket order so
  // sections never reshuffle as matches get predicted (see stageRank).
  const stagesInOrder = [...new Set(shown.map((f) => f.stage))].sort(
    (a, b) => stageRank(a) - stageRank(b)
  );
  if (openStages === null) openStages = new Set([stagesInOrder[0]]);

  for (const stage of stagesInOrder) {
    const matches = shown.filter((f) => f.stage === stage);
    const w = stageWeight(stage);
    const open = openStages.has(stage);

    const header = document.createElement("button");
    header.className = "stage-header" + (open ? " open" : "");
    header.innerHTML =
      `<span class="stage-name">${esc(stage)}` +
      (w > 1 ? ` <span class="weight">×${w}</span>` : "") +
      `</span><span class="count">${matches.length}</span>`;
    header.onclick = () => {
      open ? openStages.delete(stage) : openStages.add(stage);
      renderFixtures();
    };
    view.appendChild(header);

    if (open) {
      const wrap = document.createElement("div");
      wrap.className = "stage-body";
      for (const f of matches) wrap.appendChild(renderMatch(f, now));
      view.appendChild(wrap);
    }
  }
  window.scrollTo(0, scrollY);
}

function renderFilterBar(now) {
  const bar = document.createElement("div");
  bar.className = "filterbar";

  const todo = allFixtures.filter((f) => isOpen(f, now) && !myPredictions[f.id]).length;
  const predicted = allFixtures.filter((f) => myPredictions[f.id]).length;
  const chips = [
    ["todo", `To predict (${todo})`, ICONS.clipboard],
    ["predicted", `Predicted (${predicted})`, ICONS.check],
    ["all", "All", ICONS.grid],
  ];
  const chipWrap = document.createElement("div");
  chipWrap.className = "chips";
  for (const [val, label, icon] of chips) {
    const b = document.createElement("button");
    b.className = "chip" + (statusFilter === val ? " active" : "");
    b.innerHTML = `${icon}<span>${esc(label)}</span>`;
    b.onclick = () => {
      statusFilter = val;
      renderFixtures();
    };
    chipWrap.appendChild(b);
  }
  bar.appendChild(chipWrap);

  const stages = [...new Set(allFixtures.map((f) => f.stage))];
  const sel = document.createElement("select");
  sel.id = "stageFilter";
  sel.innerHTML =
    `<option value="all">All stages</option>` +
    stages.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  sel.value = stageFilter;
  sel.onchange = () => {
    stageFilter = sel.value;
    renderFixtures();
  };

  // Wrap the native select so we can show a calendar icon + custom chevron.
  const selWrap = document.createElement("div");
  selWrap.className = "select-wrap";
  selWrap.innerHTML = `<span class="lead-ic">${ICONS.calendar}</span>`;
  selWrap.appendChild(sel);
  selWrap.insertAdjacentHTML("beforeend", `<span class="trail-ic">${ICONS.chevron}</span>`);
  bar.appendChild(selWrap);
  return bar;
}

// A nudge banner counting still-unpredicted matches that lock within 24h.
// Shown regardless of the active filter so the deadline never hides behind
// a "Predicted" or single-stage view.
function renderDeadlineBanner(now) {
  const soon = allFixtures.filter((f) => closesSoon(f, now) && !myPredictions[f.id]);
  if (!soon.length) return null;
  const next = soon.reduce((a, b) =>
    new Date(a.kickoff) < new Date(b.kickoff) ? a : b
  );
  const div = document.createElement("div");
  div.className = "deadline-banner";
  const n = soon.length;
  div.innerHTML =
    `${ICONS.clock}<span><strong>${n}</strong> match${n > 1 ? "es" : ""} ` +
    `lock within 24h — next in <strong>${esc(untilLabel(next.kickoff, now))}</strong></span>`;
  return div;
}

function renderMatch(f, now) {
  const locked = new Date(f.kickoff).getTime() <= now;
  const pred = myPredictions[f.id] || {};
  const finished = f.status === "finished";

  const card = document.createElement("div");
  card.className = "card match-card";
  card.innerHTML = `
    <div class="match">
      <span class="kickoff">${ICONS.calendar}<span class="kt"><span class="kd">${esc(
        fmtKickoffParts(f.kickoff).date
      )}</span><span class="ktime">${esc(fmtKickoffParts(f.kickoff).time)}</span></span></span>
      <span class="team home"><span class="name">${esc(f.home_team)}</span>${flag(f.home_team)}</span>
      <input class="score" inputmode="numeric" data-side="home" value="${pred.home ?? ""}" ${locked ? "disabled" : ""} />
      <span class="vs">–</span>
      <input class="score" inputmode="numeric" data-side="away" value="${pred.away ?? ""}" ${locked ? "disabled" : ""} />
      <span class="team away">${flag(f.away_team)}<span class="name">${esc(f.away_team)}</span></span>
      <span class="status"></span>
    </div>
    <div class="picks hidden"></div>`;

  // Urgency badge for matches locking within the next 24h. Predicted ones get
  // a calm green badge; still-open ones get an amber "act now" treatment.
  if (closesSoon(f, now)) {
    const predicted = !!myPredictions[f.id];
    card.classList.add("closing-soon");
    if (!predicted) card.classList.add("urgent");
    const badge = document.createElement("span");
    badge.className = "soon-badge" + (predicted ? " done" : "");
    badge.innerHTML = `${ICONS.clock}${esc(untilLabel(f.kickoff, now))}`;
    card.appendChild(badge);
  }

  const statusEl = card.querySelector(".status");
  if (finished) {
    statusEl.className = "result-tag";
    statusEl.textContent = `Result: ${f.home_score}–${f.away_score}`;
  } else if (locked) {
    statusEl.className = "locked-tag";
    statusEl.textContent = "🔒 Locked";
  } else {
    const btn = document.createElement("button");
    btn.textContent = myPredictions[f.id] ? "Update" : "Save";
    btn.onclick = () => savePrediction(f.id, card, statusEl);
    statusEl.appendChild(btn);
  }

  // Once locked, anyone can reveal everyone's picks for this match.
  if (locked) {
    const picksEl = card.querySelector(".picks");
    const toggle = document.createElement("button");
    toggle.className = "ghost";
    toggle.textContent = "See everyone's picks";
    toggle.onclick = () => togglePicks(f.id, picksEl, toggle);
    const foot = document.createElement("div");
    foot.className = "card-foot";
    foot.appendChild(toggle);
    card.insertBefore(foot, picksEl);
  }
  return card;
}

async function togglePicks(fixtureId, picksEl, toggle) {
  if (!picksEl.classList.contains("hidden")) {
    picksEl.classList.add("hidden");
    toggle.textContent = "See everyone's picks";
    return;
  }
  toggle.textContent = "Hide picks";
  picksEl.classList.remove("hidden");
  picksEl.innerHTML = "<span class='note'>Loading…</span>";
  try {
    const { picks } = await api(`/api/match-picks?fixtureId=${fixtureId}`);
    picksEl.innerHTML = picks.length
      ? picks
          .map(
            (p) =>
              `<div class="pick-row"><span>${esc(p.name)}</span>` +
              `<span>${p.home}–${p.away}` +
              (p.points ? ` <span class="saved">+${p.points}</span>` : "") +
              `</span></div>`
          )
          .join("")
      : "<span class='note'>No one predicted this match.</span>";
  } catch (e) {
    picksEl.innerHTML = `<span class="error">${e.message}</span>`;
  }
}

async function savePrediction(fixtureId, card, statusEl) {
  const inputs = card.querySelectorAll(".score");
  const home = inputs[0].value.trim();
  const away = inputs[1].value.trim();
  if (home === "" || away === "") {
    flash(statusEl, "Enter both scores", true);
    return;
  }
  try {
    await api("/api/predictions", {
      method: "POST",
      body: { fixtureId, home: Number(home), away: Number(away) },
    });
    myPredictions[fixtureId] = { home: Number(home), away: Number(away) };
    const btn = statusEl.querySelector("button");
    if (btn) btn.textContent = "Update";
    flash(statusEl, "✓ Saved");
    const egg = scorelineEgg(Number(home), Number(away));
    if (egg) toast(egg);
    // Keep the chip counts in sync once the confirmation has been seen.
    if (statusFilter === "todo") setTimeout(renderFixtures, 1000);
  } catch (e) {
    flash(statusEl, e.message, true);
  }
}

function flash(statusEl, msg, isError) {
  const old = statusEl.innerHTML;
  statusEl.innerHTML = `<span class="${isError ? "error" : "saved"}">${msg}</span>`;
  setTimeout(() => (statusEl.innerHTML = old), 1800);
}

// --- leaderboard ------------------------------------------------------------
async function loadBoard() {
  const view = $("boardView");
  view.innerHTML = "<p class='note'>Loading…</p>";
  const { standings } = await api("/api/leaderboard");

  if (!standings.length) {
    view.innerHTML = "<p class='note'>No players yet.</p>";
    return;
  }

  const rows = standings
    .map((s, i) => {
      const rank = i + 1;
      const me = s.name === store.name ? "me" : "";
      const tag = deriveTag(s);
      return `<tr class="${me}">
        <td class="rank">${rankCell(rank)}</td>
        <td class="player">${esc(s.name)}</td>
        <td class="tag-cell"><span class="tag ${tag.cls}">${tag.icon}${esc(tag.label)}</span></td>
        <td class="num">${s.points}</td>
        <td class="num">${s.exact}</td>
        <td class="num">${s.played}</td>
      </tr>`;
    })
    .join("");

  view.innerHTML = `
    <div class="card">
      <div class="table-wrap">
        <table class="board-table">
          <thead><tr>
            <th class="num">#</th><th>Player</th><th></th>
            <th class="num">Pts</th><th class="num">Exact</th><th class="num">Played</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="note">3 pts for an exact score, 1 pt for the right result. Later rounds score double (×2) or triple (final, ×3). Tags reflect your last few results.</p>
    </div>`;
}

// Gold/silver/bronze medal for the top 3, a numbered tile for everyone else.
function rankCell(rank) {
  if (rank > 3) return `<span class="rank-pill">${rank}</span>`;
  return `<span class="medal medal-${rank}">
    <svg viewBox="0 0 40 48" class="medal-svg" aria-hidden="true">
      <path class="rib" d="M14 22 L9 45 L15 39 L19 44 L22 26 Z"/>
      <path class="rib" d="M26 22 L31 45 L25 39 L21 44 L18 26 Z"/>
      <circle class="disc" cx="20" cy="16" r="14"/>
      <circle class="rim" cx="20" cy="16" r="14"/>
      <text class="mnum" x="20" y="16.5" text-anchor="middle" dominant-baseline="central">${rank}</text>
    </svg>
  </span>`;
}

// Turn a player's recent form + season stats into a single performance tag.
// `form` = base points (0/1/3) for the last up-to-5 finished matches, newest first.
function deriveTag(s) {
  const form = s.form || [];
  const played = s.played || 0;
  if (played === 0) return { label: "New", icon: ICONS.sparkle, cls: "t-new" };

  const exactRate = s.exact / played;
  const resultRate = (s.exact + s.correct) / played;
  const last3 = form.slice(0, 3);
  const recentExacts = form.filter((x) => x === 3).length;
  const hot = (last3.length >= 3 && last3.every((x) => x > 0)) || recentExacts >= 2;
  const cold = form.length >= 3 && last3.every((x) => x === 0);

  if (hot) return { label: "On Fire", icon: ICONS.flame, cls: "t-fire" };
  if ((s.solo || 0) >= 1) return { label: "Mind Game", icon: ICONS.brain, cls: "t-mind" };
  if (played >= 3 && exactRate >= 0.4) return { label: "Sharp", icon: ICONS.target, cls: "t-sharp" };
  if (played >= 3 && resultRate >= 0.6) return { label: "Consistent", icon: ICONS.star, cls: "t-consistent" };
  if (cold) return { label: "Cold", icon: ICONS.snow, cls: "t-cold" };
  if (form.slice(0, 2).some((x) => x > 0)) return { label: "On Track", icon: ICONS.trend, cls: "t-track" };
  return { label: "Solid", icon: ICONS.thumb, cls: "t-solid" };
}

// --- my results -------------------------------------------------------------
// Base points for one of my predictions: 3 exact, 1 right outcome, else 0.
// Mirrors basePoints() in lib/api.js (myPredictions uses {home, away}).
function myBasePoints(pred, f) {
  if (f.home_score == null) return 0;
  if (pred.home === f.home_score && pred.away === f.away_score) return 3;
  return Math.sign(pred.home - pred.away) === Math.sign(f.home_score - f.away_score)
    ? 1
    : 0;
}

async function loadResults() {
  const view = $("resultsView");
  view.innerHTML = "<p class='note'>Loading…</p>";
  if (!allFixtures.length) {
    const [{ fixtures }, { predictions }] = await Promise.all([
      api("/api/fixtures"),
      api("/api/predictions"),
    ]);
    allFixtures = fixtures;
    myPredictions = predictions;
  }
  renderResults();
}

function renderResults() {
  const view = $("resultsView");
  const finished = allFixtures
    .filter((f) => f.status === "finished" && f.home_score != null)
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));

  if (!finished.length) {
    view.innerHTML =
      "<p class='note empty'>No matches have finished yet. Your scored predictions will show up here.</p>";
    return;
  }

  let total = 0,
    exact = 0,
    correct = 0,
    missed = 0;
  const exactHits = [];

  const rows = finished
    .map((f) => {
      const pred = myPredictions[f.id];
      const w = stageWeight(f.stage);
      const result = `${f.home_score}–${f.away_score}`;
      const matchCell =
        `<td class="r-match">${flag(f.home_team)}` +
        `<span class="r-names">${esc(f.home_team)} <span class="r-v">v</span> ${esc(f.away_team)}</span>` +
        `${flag(f.away_team)}</td>`;

      if (!pred) {
        missed += 1;
        return `<tr class="miss">${matchCell}` +
          `<td class="num muted">—</td>` +
          `<td class="num">${result}</td>` +
          `<td class="num"><span class="pts zero">0</span></td></tr>`;
      }

      const base = myBasePoints(pred, f);
      const pts = base * w;
      total += pts;
      if (base === 3) {
        exact += 1;
        exactHits.push({ id: f.id, label: `${f.home_team} ${f.home_score}–${f.away_score} ${f.away_team}` });
      } else if (base === 1) correct += 1;
      const cls = base === 3 ? "exact" : base === 1 ? "ok" : "zero";
      const wtag = w > 1 ? `<span class="r-weight">×${w}</span>` : "";
      return `<tr>${matchCell}` +
        `<td class="num">${pred.home}–${pred.away}</td>` +
        `<td class="num">${result}</td>` +
        `<td class="num"><span class="pts ${cls}">${pts}</span>${wtag}</td></tr>`;
    })
    .join("");

  view.innerHTML = `
    <div class="card stat-strip">
      <div class="stat"><span class="stat-n">${total}</span><span class="stat-l">Points</span></div>
      <div class="stat"><span class="stat-n accent">${exact}</span><span class="stat-l">Exact</span></div>
      <div class="stat"><span class="stat-n">${correct}</span><span class="stat-l">Right result</span></div>
      <div class="stat"><span class="stat-n">${missed}</span><span class="stat-l">Missed</span></div>
    </div>
    <div class="card">
      <table class="results-table">
        <thead><tr>
          <th>Match</th><th class="num">You</th><th class="num">Result</th><th class="num">Pts</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="note">3 pts exact · 1 pt right result · ×2 later rounds, ×3 final. “Missed” = a finished match you didn't predict.</p>
    </div>`;

  celebrateNewExacts(exactHits);
}

// Throw confetti the first time the user sees an exact-score hit land. Each
// match is celebrated once (remembered in localStorage) so revisiting the tab
// stays calm.
const CELEBRATED_KEY = "wc_celebrated";
function celebrateNewExacts(hits) {
  let done;
  try {
    done = new Set(JSON.parse(localStorage.getItem(CELEBRATED_KEY) || "[]"));
  } catch {
    done = new Set();
  }
  const fresh = hits.filter((h) => !done.has(String(h.id)));
  if (!fresh.length) return;
  fresh.forEach((h) => done.add(String(h.id)));
  localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...done]));

  fireConfetti();
  toast(
    fresh.length === 1
      ? `🎯 Exact score! ${fresh[0].label}`
      : `🎯 ${fresh.length} exact scores — you're on fire!`
  );
}

// --- easter eggs ------------------------------------------------------------
// A transient pill toast (bottom-centre). Plain text only — no HTML injection.
let toastTimer;
function toast(msg) {
  let el = $("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
}

// Lightweight canvas confetti — self-removing, no dependencies.
function fireConfetti() {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const W = (canvas.width = window.innerWidth);
  const H = (canvas.height = window.innerHeight);
  const colors = ["#34d399", "#2dd4bf", "#fbbf24", "#f472b6", "#7aa2ff", "#fb923c"];
  const pieces = Array.from({ length: 170 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.4,
    r: 4 + Math.random() * 6,
    c: colors[(Math.random() * colors.length) | 0],
    vx: -2.5 + Math.random() * 5,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    vr: -0.25 + Math.random() * 0.5,
  }));
  let frame = 0;
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      ctx.restore();
    }
    if (++frame < 240) requestAnimationFrame(tick);
    else canvas.remove();
  })();
}

// Konami code → confetti + a cheeky toast.
const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a",
];
let konamiIdx = 0;
window.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === KONAMI[konamiIdx]) konamiIdx += 1;
  else konamiIdx = key === KONAMI[0] ? 1 : 0;
  if (konamiIdx === KONAMI.length) {
    konamiIdx = 0;
    fireConfetti();
    toast("⚽ GOOOAL! You found the secret.");
  }
});

// Infamous scorelines get a wink when you predict them.
const SCORE_CALLBACKS = {
  "7-1": "Mineirazo flashbacks — Brazil 1–7 Germany, 2014 😬",
  "1-7": "Mineirazo flashbacks — Brazil 1–7 Germany, 2014 😬",
  "5-1": "Munich 2001 — England 5–1 Germany 🏴",
  "0-0": "🚌 Parking the bus.",
  "3-3": "Instant classic 🍿",
  "4-3": "A proper thriller 🍿",
  "2-2": "Honours even — and to penalties? 🥅",
  "4-4": "Goal-fest! 🍿",
};
function scorelineEgg(home, away) {
  const hit = SCORE_CALLBACKS[`${home}-${away}`];
  if (hit) return hit;
  if (home >= 8 || away >= 8 || home + away >= 12) return "Wrong sport? 🏀";
  return null;
}

// Real-matchday header pill: lights up when today actually has fixtures.
function refreshMatchday(now = Date.now()) {
  const el = $("matchday");
  if (!el) return;
  const today = new Date(now);
  const sameDay = (iso) => {
    const d = new Date(iso);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };
  const games = allFixtures.filter((f) => sameDay(f.kickoff));
  if (!games.length) {
    el.classList.add("hidden");
    return;
  }
  const upcoming = games
    .filter((f) => new Date(f.kickoff).getTime() > now)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  el.classList.remove("hidden");
  el.textContent = upcoming.length
    ? `⚽ Matchday · next ${fmtKickoffParts(upcoming[0].kickoff).time}`
    : "⚽ Matchday";
  el.title = `${games.length} match${games.length > 1 ? "es" : ""} today`;
}

// --- boot -------------------------------------------------------------------
function showApp() {
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("meName").textContent = store.name;
  switchTab("fixtures");
}

if (store.token) showApp();
