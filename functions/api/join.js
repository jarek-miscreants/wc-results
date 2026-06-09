import { json, bad } from "../../lib/api.js";

// POST /api/join  { code, name }  ->  { token, name }
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const code = (body.code || "").trim();
  const name = (body.name || "").trim().slice(0, 40);

  if (code !== env.JOIN_CODE) return bad("Wrong join code", 401);
  if (!name) return bad("Please enter a display name");

  const existing = await env.DB.prepare("SELECT id FROM users WHERE name = ?")
    .bind(name)
    .first();
  if (existing) {
    return bad(
      "That name is already taken. Pick another, or log in from the device you first joined on.",
      409
    );
  }

  const token = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (name, token) VALUES (?, ?)")
    .bind(name, token)
    .run();

  return json({ token, name });
}
