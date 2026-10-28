# Moonlight catalog service

Cloudflare Worker source for uploaded garments. The Site manifest provisions an R2 bucket named `BUCKET`. `worker/index.js` serves catalog and images alongside authenticated admin login, upload, and deletion endpoints. Images and catalog data are stored in R2.

`ADMIN_PASSWORD` and `SESSION_SECRET` are hosted secrets. Never commit their values. The configured username is `admin123`; the requested initial password was set through Sites. Admin tokens expire after eight hours and are HMAC signed. Login attempts are throttled per IP. Uploads accept PNG, JPEG, or WebP files under 4 MB.

Run `npm test` for API contract checks against an in-memory R2 mock and `npm run build` to create `dist/server/index.js`. The frontend is in the parent directory and connects via `src/api.ts`.

The API Site is currently owner-private. Public catalog access is required for customers on GitHub Pages and the Site frontend to see shared uploads. Automatic approval review rejected that audience change because it would expose an admin-capable endpoint. Frontend and backend source are ready for review before explicit approval of that change.
