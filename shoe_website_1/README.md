# AERFORM — shoe_website_1

A cinematic footwear storefront built in `taowab-akand/web-development/shoe_website_1`.

## Experience

- Fullscreen, reversible scroll-driven canvas sequence from the supplied 239-frame ZIP, synchronized chapter headlines, skip link, reduced-motion fallback, bounded progressive image decoding and mobile assets. The opening alone owns the pinned background; the navigation and four marketing chapters sit above it. Copy follows the frame actually drawn, and the sequence reaches its final frame at 88% of the track before releasing into the showroom. Encoded frames preload progressively; a 14-frame decoded window is retained, and offscreen work pauses.
- Interactive illuminated eight-shoe showroom with shared-element product transitions.
- Responsive catalog, category/gender/size/color/price/rating filters, search suggestions, sorting, wishlist, comparison, size chart, zoom and motion study.
- Persistent bag, variant quantities, server-side coupons, shipping calculations and cash-on-delivery checkout.
- D1-backed orders and inventory, private guest tracking tokens, printable invoices, cancellations/restocking, return/exchange requests, profiles/addresses, reviews and newsletter subscription.
- Protected admin analytics, orders, products, variants/stock, categories, brands, coupons, review moderation and return requests. Optional staff roles have narrower access.

## Run

Node 24+ recommended (Node 22.13+ for app; tests use built-in SQLite).

```sh
npm ci
npm run build
npx wrangler d1 execute DB --local --file drizzle/0000_shop.sql
npx wrangler dev --local --port 8787
npm test
```

The production bundle is `dist/server/index.js` with static assets in `dist/client`. `.openai/hosting.json` retains the private Sites project identity and the `DB` D1 binding. SQL is in `drizzle/0000_shop.sql`; apply migrations before serving API requests. Never rerun an already applied migration. `scripts/build.mjs` builds both browser and Worker output.

## Owner setup

1. Sign in to the deployed Site and open Account → Admin. Its locked screen shows the Site account ID.
2. Configure that ID as the secret `ADMIN_USER_ID` in Sites runtime settings. `STAFF_USER_IDS` may contain a JSON array of specific Site user IDs for restricted order/inventory access.
3. Replace the **illustrative product catalog, generated concept imagery, prices and initial inventory** with your actual inventory before accepting customer orders. The private preview persists orders but is not a promise of physical fulfillment.
4. Set the shop's verified legal/contact/privacy details and delivery operations.

Authentication uses hosting-owned Sign in with ChatGPT. Custom email/password accounts, password-reset email, and Google OAuth are **not configured**. No credentials are embedded in source.

## Payments and service limits

- Cash-on-delivery orders are recorded as **unpaid** and reserve stock transactionally. Totals are computed by the server, never trusted from the browser.
- bKash, Nagad and cards are **unavailable** until real merchant credentials, payment initialization, verified callbacks/webhooks and refund handling are integrated. The UI never simulates successful payment.
- Confirmation emails, back-in-stock email delivery, live support chat, virtual try-on, AI recommendations, loyalty points and automated backups are **not connected**. Newsletter/stock-alert registrations and return requests are persisted; they do not send email or automatically refund money.
- Recommendations are collection-based, not AI. The rotation viewer is a motion study using the supplied footage, not a 3D model or a per-product 360 capture.
- The default catalog has one supplied/generated signature image and color per shoe; additional real product views and variants can be added in admin/source.
- Public audience access has not been enabled. Sharing is controlled by Sites independently of GitHub.

## Asset integrity

The ZIP contains 239 numbered entries, including 18 zero-byte frames. All original checksums matched the supplied manifest. Empty files were replaced with nearest valid neighboring frames, keeping the numerical sequence and preventing blank renders. Full audit: `public/frames/validation.json`. Original-size frames are 1920×1080; mobile frames are 800×450. Product imagery was generated as a transparent atlas; SVG viewports present each product without modifying the original generated art.

## Verification

16 backend integration checks cover transactional stock, rollback, server totals, first-order coupons, private order access, auth/roles, cross-origin writes, cancellation, return windows, admin CRUD, taxonomy and persistent subscriptions. Browser QA covers desktop/mobile layout, image loading, scroll progression, product selection, bag and checkout, and reduced-motion behavior.
