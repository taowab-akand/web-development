import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
function bucket() {
  const entries = new Map();
  return {
    async get(key) {
      const item = entries.get(key);
      return (
        item && {
          body: item.body,
          httpMetadata: item.meta,
          async json() {
            return JSON.parse(
              typeof item.body === "string"
                ? item.body
                : new TextDecoder().decode(item.body),
            );
          },
        }
      );
    },
    async put(key, value, options = {}) {
      entries.set(key, { body: value, meta: options.httpMetadata });
    },
    async delete(key) {
      entries.delete(key);
    },
  };
}
const env = {
  BUCKET: bucket(),
  ADMIN_PASSWORD: "admin123",
  SESSION_SECRET: "test-only-secret",
};
const origin = "https://taowab-akand.github.io";
const call = (path, options = {}) =>
  worker.fetch(
    new Request(`https://api.example.test${path}`, {
      ...options,
      headers: { origin, ...options.headers },
    }),
    env,
  );
test("catalog, authentication, upload and deletion", async () => {
  assert.deepEqual((await (await call("/api/products")).json()).products, []);
  assert.equal(
    (await call("/api/products", { method: "POST", body: new FormData() }))
      .status,
    401,
  );
  const denied = await call("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin123", password: "wrong" }),
  });
  assert.equal(denied.status, 401);
  const logged = await call("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin123", password: "admin123" }),
  });
  assert.equal(logged.status, 200);
  const { token } = await logged.json();
  const data = new FormData();
  data.set("name", "Blue Shirt");
  data.set("category", "shirts");
  data.set("color", "#123456");
  data.set(
    "image",
    new File(
      [new Uint8Array([137, 80, 78, 71, ...Array(120).fill(0)])],
      "shirt.png",
      { type: "image/png" },
    ),
  );
  const created = await call("/api/products", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: data,
  });
  assert.equal(created.status, 201);
  const item = (await created.json()).product;
  assert.equal(item.name, "Blue Shirt");
  assert.equal((await (await call("/api/products")).json()).products.length, 1);
  assert.equal((await call(`/api/images/${item.id}`)).status, 200);
  assert.equal(
    (
      await call(`/api/products/${item.id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      })
    ).status,
    200,
  );
  assert.deepEqual((await (await call("/api/products")).json()).products, []);
});
