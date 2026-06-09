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
$("tabFixtures").onclick = () => switchTab("fixtures");
$("tabBoard").onclick = () => switchTab("board");

function switchTab(which) {
  const onFixtures = which === "fixtures";
  $("tabFixtures").classList.toggle("active", onFixtures);
  $("tabBoard").classList.toggle("active", !onFixtures);
  $("fixturesView").classList.toggle("hidden", !onFixtures);
  $("boardView").classList.toggle("hidden", onFixtures);
  if (onFixtures) loadFixtures();
  else loadBoard();
}

// --- fixtures + predictions -------------------------------------------------
let allFixtures = [];
let myPredictions = {};
let stageFilter = "all";
let statusFilter = "todo"; // todo | predicted | all
let openStages = null; // Set of expanded stage names; null = "open the first one"

function stageWeight(stage) {
  if (/^Group/.test(stage)) return 1;
  if (stage === "Quarter-final" || stage === "Semi-final" || stage === "Third place") return 2;
  if (stage === "Final") return 3;
  return 1;
}

const isOpen = (f, now) =>
  f.status !== "finished" && new Date(f.kickoff).getTime() > now;

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

  // Group into collapsible sections by stage, in canonical fixture order.
  // Derive the order from ALL fixtures (not just the filtered subset) so a
  // stage doesn't jump position when its earliest match gets predicted away.
  const present = new Set(shown.map((f) => f.stage));
  const stagesInOrder = [...new Set(allFixtures.map((f) => f.stage))].filter(
    (s) => present.has(s)
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
      const me = s.name === store.name ? "me" : "";
      return `<tr class="${me}">
        <td class="num">${i + 1}</td>
        <td>${esc(s.name)}</td>
        <td class="num">${s.points}</td>
        <td class="num">${s.exact}</td>
        <td class="num">${s.played}</td>
      </tr>`;
    })
    .join("");

  view.innerHTML = `
    <div class="card">
      <table>
        <thead><tr>
          <th class="num">#</th><th>Player</th>
          <th class="num">Pts</th><th class="num">Exact</th><th class="num">Played</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="note">3 pts for an exact score, 1 pt for the right result. Later rounds score double (×2) or triple (final, ×3).</p>
    </div>`;
}

// --- boot -------------------------------------------------------------------
function showApp() {
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("meName").textContent = store.name;
  switchTab("fixtures");
}

if (store.token) showApp();
