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
$("joinBtn").onclick = async () => {
  $("loginError").textContent = "";
  try {
    const { token, name } = await api("/api/join", {
      method: "POST",
      body: { name: $("name").value, code: $("code").value },
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
async function loadFixtures() {
  const view = $("fixturesView");
  view.innerHTML = "<p class='note'>Loading fixtures…</p>";
  const [{ fixtures }, { predictions }] = await Promise.all([
    api("/api/fixtures"),
    api("/api/predictions"),
  ]);

  if (!fixtures.length) {
    view.innerHTML = "<p class='note'>No fixtures loaded yet. The admin needs to seed them.</p>";
    return;
  }

  view.innerHTML = "";
  const now = Date.now();
  for (const f of fixtures) {
    const locked = new Date(f.kickoff).getTime() <= now;
    const pred = predictions[f.id] || {};
    const finished = f.status === "finished";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="stage">${f.stage}</div>
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
      </div>`;

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
    view.appendChild(card);
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
    flash(statusEl, "✓ Saved");
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
      <p class="note">3 pts for an exact score, 1 pt for the right result.</p>
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
