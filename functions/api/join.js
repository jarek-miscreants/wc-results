import { json, bad, hashPin } from "../../lib/api.js";

// POST /api/join  { code, name, pin }  ->  { token, name }
// Creates a new player. The PIN lets them log in again on any device.
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const code = (body.code || "").trim();
  const name = (body.name || "").trim().slice(0, 40);
  const pin = (body.pin || "").trim();

  if (code !== env.JOIN_CODE) return bad("Wrong join code", 401);
  if (!name) return bad("Please enter a display name");
  if (pin.length < 4 || pin.length > 64) {
    return bad("PIN must be at least 4 characters");
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE name = ?")
    .bind(name)
    .first();
  if (existing) {
    return bad(
      "That name is already taken. If it's you, use \"Log in\" with your PIN instead.",
      409
    );
  }

  const token = crypto.randomUUID();
  const pinHash = await hashPin(pin);
  await env.DB.prepare(
    "INSERT INTO users (name, pin_hash, token) VALUES (?, ?, ?)"
  )
    .bind(name, pinHash, token)
    .run();

  return json({ token, name });
}
