# Moonlight — The Rack Studio

An interactive React + TypeScript + Vite / React Three Fiber clothing rack, built from the supplied video and Moonlight garment reference. All browsing is live WebGL geometry, not a recording or rotating images. No checkout, accounts, or payment flows are included.

## Run locally

Requires Node.js 22.12+ (Node.js 24 recommended).

```sh
npm ci
npm run dev
```

Open the printed local URL. To validate and build:

```sh
npm test
npm run build
npm run preview
```

The production output is `dist/`; it can be served on any static host. `base: './'` also supports hosting this folder beneath a repository subpath. `.openai/hosting.json` identifies the private Sites preview.

## Explore

- Scroll or drag horizontally **over the rack** to browse continuously. Vertical touch gestures remain page scrolling; Ctrl+wheel remains browser zoom. At the finite ends, outward wheel input scrolls the page.
- Click a neighboring garment to select it. Click the centered garment, or **Inspect piece**, to bring it forward. Drag to rotate its real front/back surfaces. **Escape** or **Back to rack** restores the preserved rack position.
- Focus the scene and use **Left/Right** to advance one garment; **Enter** inspects. In inspection, Left/Right turn the garment.
- The studio controls change atmosphere, collection, rail, hanger, and click behavior. Auto browse pauses after interaction, in hidden tabs, and with reduced motion. Archive demonstrates the empty collection state.

## Motion tuning

`src/motion.ts` contains `MOTION` and the renderer-independent `RackMotion` class. Input accumulates into a floating-point target. A delta-time spring drives continuous position `q`, with stable substeps and a maximum frame delta. Idle input snaps gently after 160 ms. Reversing input discards stale velocity and target lead. `garmentPose(index - q)` smoothly maps signed distance to rail position and a maximum 82-degree turn. Distant side spacing compresses.

Tune sensitivity, spring stiffness/damping, idle time, side angle, spacing, release momentum, and maximum sway in `MOTION`. The DOM input handlers in `src/App.tsx` normalize wheel units and scale drag distances with viewport width. `src/scene/RackScene.tsx` drives mesh transforms via refs, keeps hook heights/depth fixed during browsing, and handles the browse → entering-inspect → inspect → exiting-inspect transitions. Cloth sway is a small acceleration-driven response around the hanger hook; reduced motion disables it.

## Assets and replacement

- `src/scene/garmentGeometry.ts` is the reproducible geometry generator. It constructs separate curved front/back torso surfaces, open necklines, side/shoulder joins, shaped open sleeves, collar and seams. It requires no Blender or external models.
- `src/scene/garmentTextures.ts` creates deterministic cotton weave and original moon/star artwork, including a distinct small rear crescent. No reference sheet is placed on a plane or mapped to the mesh.
- `src/products.ts` holds the three product records. Change colors, names, print flags, and sleeve shape here. For imported models, replace `Garment`'s generated geometry in `src/scene/RackScene.tsx`; keep its outer hook transform and data IDs.
- `public/assets/asset-manifest.json` and `public/assets/LICENSE.md` document provenance, licenses, and replacement points. No third-party garment model was downloaded. Fonts are self-hosted from the OFL-licensed Fontsource packages; runtime works without Google Fonts or other external asset requests.

## Limits and reference differences

These are original procedural cloth shells with rounded volume and open neck/hem/cuffs, not scanned garments or a physical cloth simulation. Fold drape, sleeve construction, and fabric thickness are approximate, and seams are stylized. The charcoal tee, forest long sleeve, and ivory tee follow the supplied reference's palette and artwork direction. They are not exact production garment reconstructions. The still reference image was available visually in chat but not as an original downloadable file; its source pixels are not bundled.

The supplied 10.7-second video was inspected at one-second intervals, including the browsing, green-shirt inspection, and return-to-rack segments. Motion is inferred from those observations; this implementation does not claim the original algorithm. Camera filming movement, the laptop, browser chrome, hand, and social overlays are excluded.

Performance uses capped DPR 1–1.5 with a one-time reduction to DPR 1 when initial frames are slow, shared per-product assets, inexpensive lighting, no postprocessing, and GPU resource disposal. Real-device 60 fps is a target, not a measured guarantee. Browser verification uses software-rendered Chromium; physical touch/trackpad and hardware GPU performance require device testing. See `docs/verification.md` for the actual checks performed.

## Recorded demo

[Watch the browsing and inspection demo](docs/demo-2x.mp4). This is a 17-second recording played at 2× speed, captured in software-rendered Chromium. It demonstrates green-shirt selection, front/back inspection, and returning to the same rack; it is not an FPS benchmark.

## Admin, catalog, and cart

The sticky header now includes Shirt and T-shirt filters, an Admin button, and a cart. The cart is saved locally in each visitor's browser; there is no checkout or payment flow.

`api/` is the separate Sites Worker for the shared garment catalog. It stores uploaded image files and product metadata in R2. The admin password is configured as a hosted secret, not bundled in client code. The login endpoint issues an eight-hour signed admin token, and upload/delete routes verify it server-side. The provided login uses `admin123` for both username and password. Change the password in the hosted secret before real commercial use.

An uploaded image is fitted to the front textile surface of the existing procedural 3D shirt or T-shirt shape. The back uses a matching fabric color. This creates a rotatable volumetric garment from a photo, but does not reconstruct unseen drape, seams, or a unique 3D scan from one image. PNG, JPEG, and WebP files up to 4 MB are accepted.

The catalog API must allow public GET access for customers to see uploads across devices. Its admin endpoints remain protected by server-side authentication. The API Site currently has private access because automatic approval review rejected making a separate admin-capable backend public. Until that access change is explicitly approved, the live front end can show its new controls but cannot load or upload shared garments. The source and UI are ready for that final access step.
