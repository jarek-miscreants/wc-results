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
const fmtKickoff = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

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

  // Group into collapsible sections by stage, in fixture order.
  const stagesInOrder = [...new Set(shown.map((f) => f.stage))];
  if (openStages === null) openStages = new Set([stagesInOrder[0]]);

  for (const stage of stagesInOrder) {
    const matches = shown.filter((f) => f.stage === stage);
    const w = stageWeight(stage);
    const open = openStages.has(stage);

    const header = document.createElement("button");
    header.className = "stage-header" + (open ? " open" : "");
    header.innerHTML =
      `<span class="stage-name">${stage}` +
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
    ["todo", `To predict (${todo})`],
    ["predicted", `Predicted (${predicted})`],
    ["all", "All"],
  ];
  const chipWrap = document.createElement("div");
  chipWrap.className = "chips";
  for (const [val, label] of chips) {
    const b = document.createElement("button");
    b.className = "chip" + (statusFilter === val ? " active" : "");
    b.textContent = label;
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
    stages.map((s) => `<option value="${s}">${s}</option>`).join("");
  sel.value = stageFilter;
  sel.onchange = () => {
    stageFilter = sel.value;
    renderFixtures();
  };
  bar.appendChild(sel);
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
      <span class="team home">${f.home_team}</span>
      <input class="score" inputmode="numeric" data-side="home" value="${pred.home ?? ""}" ${locked ? "disabled" : ""} />
      <span class="vs">v</span>
      <input class="score" inputmode="numeric" data-side="away" value="${pred.away ?? ""}" ${locked ? "disabled" : ""} />
      <span class="team away">${f.away_team}</span>
    </div>
    <div class="meta">
      <span class="kickoff">${fmtKickoff(f.kickoff)}</span>
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
    btn.textContent = "Save";
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
    card.querySelector(".meta").appendChild(toggle);
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
              `<div class="pick-row"><span>${p.name}</span>` +
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
        <td>${s.name}</td>
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
