const ALLOWED = new Set([
  "https://taowab-akand.github.io",
  "https://moonlight-rack-studio.shrewdpixie1.chatgpt.site",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const encoder = new TextEncoder();
const reply = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
const bytes = (v) => new Uint8Array(v);
const b64 = (value) =>
  btoa(String.fromCharCode(...bytes(value)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
const unb64 = (value) =>
  Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
async function signature(input, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64(await crypto.subtle.sign("HMAC", key, encoder.encode(input)));
}
async function makeToken(secret) {
  const payload = b64(
    encoder.encode(
      JSON.stringify({ role: "admin", exp: Date.now() + 8 * 3600_000 }),
    ),
  );
  return `${payload}.${await signature(payload, secret)}`;
}
async function isAdmin(request, secret) {
  const token = (request.headers.get("authorization") || "").replace(
    /^Bearer /,
    "",
  );
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !secret) return false;
  const expected = await signature(payload, secret);
  if (sig.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++)
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (mismatch) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64(payload)));
    return (
      data.role === "admin" &&
      Number.isFinite(data.exp) &&
      data.exp > Date.now()
    );
  } catch {
    return false;
  }
}
async function passwordMatches(input, expected) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(input)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  let mismatch = 0;
  const x = bytes(a),
    y = bytes(b);
  for (let i = 0; i < x.length; i++) mismatch |= x[i] ^ y[i];
  return mismatch === 0;
}
async function catalog(bucket) {
  const object = await bucket.get("catalog.json");
  if (!object) return [];
  try {
    const parsed = await object.json();
    return Array.isArray(parsed)
      ? parsed.filter((p) => p && typeof p.id === "string")
      : [];
  } catch {
    return [];
  }
}
async function validImage(file) {
  if (!(file instanceof File) || file.size < 100 || file.size > 4_000_000)
    return false;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return false;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return file.type === "image/png"
    ? head[0] === 137 && head[1] === 80 && head[2] === 78 && head[3] === 71
    : file.type === "image/jpeg"
      ? head[0] === 255 && head[1] === 216
      : String.fromCharCode(...head.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...head.slice(8, 12)) === "WEBP";
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const cors =
      origin && ALLOWED.has(origin)
        ? {
            "access-control-allow-origin": origin,
            "access-control-allow-headers": "content-type, authorization",
            "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
            vary: "Origin",
          }
        : {};
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: ALLOWED.has(origin) ? 204 : 403,
        headers: cors,
      });
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/"))
      return reply({ error: "Not found" }, 404, cors);
    if (!env.BUCKET)
      return reply({ error: "Storage is not configured" }, 503, cors);
    try {
      if (url.pathname === "/api/products" && request.method === "GET")
        return reply({ products: await catalog(env.BUCKET) }, 200, {
          ...cors,
          "cache-control": "public, max-age=20",
        });
      if (url.pathname.startsWith("/api/images/") && request.method === "GET") {
        const id = url.pathname.slice("/api/images/".length);
        if (!/^[0-9a-f-]{36}$/.test(id))
          return reply({ error: "Not found" }, 404, cors);
        const object = await env.BUCKET.get(`images/${id}`);
        return object
          ? new Response(object.body, {
              headers: {
                ...cors,
                "content-type": object.httpMetadata?.contentType || "image/png",
                "cache-control": "public, max-age=31536000, immutable",
                "x-content-type-options": "nosniff",
              },
            })
          : reply({ error: "Not found" }, 404, cors);
      }
      if (url.pathname === "/api/login" && request.method === "POST") {
        if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET)
          return reply({ error: "Login is not configured" }, 503, cors);
        const ip = request.headers.get("cf-connecting-ip") || "unknown";
        const key = `login/${await signature(ip, env.SESSION_SECRET)}`;
        const state = (await env.BUCKET.get(key)
          .then((o) => o?.json())
          .catch(() => null)) || { count: 0, until: 0 };
        if (state.until > Date.now())
          return reply(
            { error: "Too many attempts. Try again later." },
            429,
            cors,
          );
        const data = await request.json().catch(() => ({}));
        const valid =
          data.username === "admin123" &&
          (await passwordMatches(
            String(data.password || ""),
            env.ADMIN_PASSWORD,
          ));
        if (!valid) {
          const count = (state.count || 0) + 1;
          await env.BUCKET.put(
            key,
            JSON.stringify(
              count >= 5
                ? { count: 0, until: Date.now() + 15 * 60_000 }
                : { count, until: 0 },
            ),
          );
          return reply({ error: "Invalid username or password" }, 401, cors);
        }
        await env.BUCKET.delete(key);
        return reply({ token: await makeToken(env.SESSION_SECRET) }, 200, cors);
      }
      if (url.pathname === "/api/session" && request.method === "GET")
        return reply(
          { authenticated: await isAdmin(request, env.SESSION_SECRET) },
          200,
          cors,
        );
      if (!(await isAdmin(request, env.SESSION_SECRET)))
        return reply({ error: "Admin login required" }, 401, cors);
      if (url.pathname === "/api/products" && request.method === "POST") {
        const data = await request.formData();
        const name = String(data.get("name") || "")
          .trim()
          .slice(0, 70);
        const category = String(data.get("category") || "");
        const color = String(data.get("color") || "");
        const image = data.get("image");
        if (
          !name ||
          !["shirts", "tees"].includes(category) ||
          !/^#[0-9a-fA-F]{6}$/.test(color) ||
          !(await validImage(image))
        )
          return reply(
            {
              error:
                "Provide a name, type, color and PNG/JPEG/WebP image under 4 MB.",
            },
            400,
            cors,
          );
        const id = crypto.randomUUID();
        await env.BUCKET.put(`images/${id}`, await image.arrayBuffer(), {
          httpMetadata: { contentType: image.type },
        });
        const all = await catalog(env.BUCKET);
        const product = {
          id,
          name,
          category,
          color,
          colorName: category === "shirts" ? "Custom shirt" : "Custom T-shirt",
          fabric: "Uploaded design · 3D garment",
          printed: false,
          longSleeve: category === "shirts",
          imageUrl: `${url.origin}/api/images/${id}`,
          number: String(all.length + 4).padStart(2, "0"),
        };
        all.push(product);
        await env.BUCKET.put("catalog.json", JSON.stringify(all));
        return reply({ product }, 201, cors);
      }
      if (
        url.pathname.startsWith("/api/products/") &&
        request.method === "DELETE"
      ) {
        const id = url.pathname.slice("/api/products/".length);
        const all = await catalog(env.BUCKET);
        const item = all.find((p) => p.id === id);
        if (!item) return reply({ error: "Not found" }, 404, cors);
        await env.BUCKET.put(
          "catalog.json",
          JSON.stringify(all.filter((p) => p.id !== id)),
        );
        await env.BUCKET.delete(`images/${id}`);
        return reply({ ok: true }, 200, cors);
      }
      return reply({ error: "Not found" }, 404, cors);
    } catch (error) {
      return reply({ error: "Request failed" }, 500, cors);
    }
  },
};
