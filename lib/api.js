// Small shared helpers for the Pages Functions API.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function bad(message, status = 400) {
  return json({ error: message }, status);
}

// --- PIN hashing (PBKDF2-SHA256) -------------------------------------------
// Stored as "saltHex$hashHex". Uses Web Crypto, available in both the Workers
// runtime and Node 18+.
const PIN_ITERATIONS = 100000;

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) =>
  new Uint8Array(hex.match(/.{1,2}/g).map((h) => parseInt(h, 16)));

async function deriveBits(pin, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PIN_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
}

export async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(pin, salt);
  return `${toHex(salt)}$${toHex(bits)}`;
}

export async function verifyPin(pin, stored) {
  if (!stored || !stored.includes("$")) return false;
  const [saltHex, hashHex] = stored.split("$");
  const bits = await deriveBits(pin, fromHex(saltHex));
  const got = toHex(bits);
  // constant-time-ish comparison
  if (got.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

// Resolve the current user from the "Authorization: Bearer <token>" header.
// Returns the user row { id, name } or null if not authenticated.
export async function getUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  return await env.DB.prepare("SELECT id, name FROM users WHERE token = ?")
    .bind(token)
    .first();
}

// Later rounds are worth more. Group stage and the early knockout rounds use
// the base value; the deep rounds multiply it.
export function stageWeight(stage) {
  if (/^Group/.test(stage)) return 1;
  switch (stage) {
    case "Round of 32":
    case "Round of 16":
      return 1;
    case "Quarter-final":
    case "Semi-final":
    case "Third place":
      return 2;
    case "Final":
      return 3;
    default:
      return 1;
  }
}

// Base points before the stage weight: 3 = exact scoreline,
// 1 = correct outcome (win/draw/loss), 0 = wrong.
export function basePoints(pred, fixture) {
  if (fixture.status !== "finished" || fixture.home_score == null) return 0;
  if (pred.home_pred === fixture.home_score && pred.away_pred === fixture.away_score) {
    return 3;
  }
  const predOutcome = Math.sign(pred.home_pred - pred.away_pred);
  const realOutcome = Math.sign(fixture.home_score - fixture.away_score);
  return predOutcome === realOutcome ? 1 : 0;
}

// Final points for a prediction = base points × stage weight.
export function scorePrediction(pred, fixture) {
  return basePoints(pred, fixture) * stageWeight(fixture.stage);
}
