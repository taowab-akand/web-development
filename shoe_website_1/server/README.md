# Commerce API

The API runs as a Cloudflare Worker with a D1 `DB` binding. Apply `drizzle/0000_shop.sql` before first use. Schema changes belong in migrations; request handling never creates tables. First API use inserts the starter catalog and coupon using idempotent inserts. Products and orders are real persisted records. Starter inventory is 12 per size (3 for EU 38); adjust stock to match physical inventory before accepting real customer orders.

Set the secret/runtime variable `ADMIN_USER_ID` to the store owner's platform-provided, Site-scoped authenticated user ID. There is no default administrator, first-user takeover, or public admin password. `/api/me` returns the signed-in identity and `isAdmin`. Sites supplies authenticated identity headers; do not expose this Worker directly behind a proxy that accepts visitor-supplied identity headers. Hosted account sign-in is handled by Sites, not an application password database. Google login, email password reset, and payment gateways are not provisioned.

Optional `STAFF_USER_IDS` is a JSON array of platform user IDs allowed to manage orders and inventory; catalog/coupon/moderation writes remain administrator-only.

Prices are integer Bangladeshi taka. Order totals are calculated from the server catalog. Coupon `FIRST10` applies 10% off merchandise for a customer’s first non-cancelled order (checked against delivery email). Standard delivery is ৳120 (free at merchandise subtotal >= ৳12,000); express is ৳250. Every order is cash on delivery and starts unpaid. Stock checks/decrements are protected by SQL triggers inside the D1 batch transaction, preventing partial orders and overselling. Cancelling a confirmed/processing order restores stock once. An order can never transition out of cancelled status through the admin API.

Guests receive a random order access token. Only its SHA-256 hash is stored. Keep the token to retrieve, cancel, or request a return/exchange; never expose it in public logs. Signed-in owners can also retrieve their orders without a token. Returns and exchanges can be requested only after delivery and require manual review. This system records return/refund requests; it does not simulate issuing a refund.

Online payment buttons are unavailable until real merchant gateway credentials, verification endpoints and webhooks are implemented. No card/bKash/Nagad credential is collected. `/api/checkout/config` reports supported methods honestly. Newsletter and back-in-stock preferences persist in the database; sending campaigns/alerts requires a mail delivery service.

Use `node tests/backend.test.mjs` for the SQLite-backed integration checks. They cover totals, inventory reservation and rollback, cancellation, order privacy, account/admin access, origin checks, newsletter persistence and account-scoped wishlist. Local tests do not verify a remote payment provider or production D1 wiring.

Admin product creation accepts sizes/colors and initial stock, using zero stock by default. Editing a product never silently reactivates an archived product or resets stock. Categories and brands have persistent management endpoints. Images must use supplied /products/ or /uploads/ paths; this build does not provision an image upload service.
