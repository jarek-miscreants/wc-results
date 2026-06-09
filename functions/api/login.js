import { json, bad, verifyPin } from "../../lib/api.js";

// POST /api/login  { name, pin }  ->  { token, name }
// Logs an existing player back in from any device. No join code needed here —
// the PIN is the credential.
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = (body.name || "").trim().slice(0, 40);
  const pin = (body.pin || "").trim();
  if (!name || !pin) return bad("Enter your name and PIN");

  const user = await env.DB.prepare(
    "SELECT token, pin_hash FROM users WHERE name = ?"
  )
    .bind(name)
    .first();

  // Same generic error whether the name or the PIN is wrong.
  if (!user || !(await verifyPin(pin, user.pin_hash))) {
    return bad("Wrong name or PIN", 401);
  }

  return json({ token: user.token, name });
}
