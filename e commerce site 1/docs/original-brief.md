# Codex implementation brief — interactive 3D clothing rack

## Attachments to provide
1. My original approximately 11-second reference video (the laptop filming of the Hookline clothing rack). This is the source of truth for movement, composition, timing, and interaction feel.
2. The generated garment reference sheet: charcoal moon-print T-shirt, forest-green long sleeve, and ivory T-shirt, with corresponding back views. Use it for appearance and modeling guidance. It is NOT a finished 3D asset or a UV texture atlas. Do not put the entire sheet on a plane in the scene.
3. If available, my existing project files. Repair the rack renderer and animation while preserving working surrounding UI. Otherwise create a runnable new project.

## Your task
Build the actual working website in code. Reproduce the reference video's interactive clothes-rack experience as closely as the available assets allow. The priority is the smooth physical movement when scrolling or dragging between shirts. Do not stop at a plan, screenshot, or static prototype. Implement, run, test, and deliver source with setup instructions.

The previous implementation failed because it rotated flat SVG shirt silhouettes using CSS transforms and advanced one discrete index per scroll event. That approach looks like flat cards rather than clothes hanging on a rail. Replace the core renderer and input model. A more attractive static page alone does not satisfy this task.

## 1. Study the video first
Inspect frames throughout the original clip, especially around 0–3 seconds, 4–6 seconds, 6–8 seconds, and 9–10 seconds. Distinguish the laptop camera's movement from movement inside the webpage. Do not reproduce the laptop, hand, browser chrome, or social-media overlays.

Observed behavior to reproduce:
- A fixed horizontal rail above several garments on hangers.
- A selected garment faces the viewer while neighboring garments appear predominantly edge-on.
- Garments slide along the rail and turn smoothly as the selected position changes.
- Around the middle of the clip, a forest-green long sleeve becomes the main visible garment.
- The green garment is then isolated for closer viewing; afterward the rack arrangement returns.

The video does not reveal the original source code, exact input mapping, or physics. Infer a reasonable implementation and tune it against the visible motion. Do not claim to know the original algorithm.

## 2. Architecture
Use React + TypeScript + Vite with Three.js, preferably through React Three Fiber. Use compatible installed dependency versions and consult current official documentation when needed. Keep the UI in accessible DOM elements around a WebGL canvas. Separate product data, geometry/assets, input handling, animation state, scene lighting, and control-panel UI.

Suggested components: RackScene, RackRail, Garment, Hanger, RackController, GarmentInspector, StudioControls, and LoadingFallback. These are organizational suggestions, not a requirement to over-engineer.

Never use CSS rotateY on shirt images as the primary rendering technique. Do not replace the interaction with a prerecorded video, animated GIF, sprite sequence, or full-screen image. The user's movement must control the rack continuously.

## 3. Real garment geometry and assets
Preferred: locally stored, properly licensed GLB/glTF garment meshes with front/back surfaces, thickness, neck opening, sleeve openings, fabric folds, and consistent scale. Use the reference sheet to guide colors, proportions, stitching, and prints. Record the origin and license for any downloaded assets.

If suitable meshes are not supplied or obtainable, create actual mesh geometry with a reproducible Blender Python asset-generation script when Blender is available. Otherwise construct a reasonable volumetric garment mesh procedurally in Three.js. It must have separate front/back surfaces, shaped sleeves, openings, smooth normals, and subtle folds. A flat extruded shirt outline is only an explicitly labeled intermediate fallback, not the final fidelity target. If high-quality cloth assets remain unavailable, say so clearly instead of presenting a crude mesh as an exact recreation.

Use real mesh hangers made from curves/tubes and a metal cylindrical rail. Position each hanger hook in contact with the rail. Keep the shirt shoulders supported by the hanger. The garment body must have enough volume that side and rear views remain plausible.

Create three initial products matching the sheet; optionally add color variants to make a five-piece rack. Keep front/back graphics distinct so rotating the shirt does not reveal mirrored front artwork on its back. Recreate simple moon/star print art as a separate transparent texture/decal or vector-derived texture, applied to the mesh with correct UVs. Do not use the entire generated sheet as a material. Generate normal/roughness texture detail procedurally if necessary. Use rough cotton materials, not glossy plastic.

Organize model and texture files under public/assets with clear product IDs. Keep an asset manifest and make products data-driven so I can replace garments later. Preserve original assets; optimize copies for runtime.

## 4. Rack composition
Reproduce the cream/peach webpage, compact header, dark navy-purple rounded studio panel, gold or chrome rail, pink-magenta light on the left, cyan-blue light on the right, subtle ground grid, and compact settings below. The rack itself should remain the focal point. Avoid adding a large marketing hero that pushes the experience below the fold.

Use a fixed camera with mild perspective. Match the video framing before adding decorative effects. The rail should span most of the scene width. Clothes hang below it and above the caption area. Neighbors should retain dimensional shading even when edge-on.

Use soft ambient illumination plus controlled pink and blue lighting. Add restrained contact shadows where useful. Keep fabric readable and prevent strong bloom from erasing the silhouettes. The entire scene must not rotate when browsing garments.

## 5. Continuous input and motion — highest priority
Use a continuous floating-point rack position q, not just an integer activeIndex. Let t be the target position. Inputs change t continuously; a damped spring smoothly drives q toward t. Derive each garment's position and angle from its signed distance d = index - q.

Core behavior:
- At d = 0, the garment is centered and faces the camera.
- As abs(d) increases, the garment slides toward its side slot and turns progressively toward a near-edge-on orientation, approximately 75–88 degrees.
- Use a smooth mapping, such as smoothstep over a configurable transition range; never jump the angle based only on the rounded active index.
- As the next shirt approaches the center, it continuously opens toward the viewer while the outgoing shirt turns away.
- Compress spacing among distant side garments but allow clearance around the selected item. Avoid visible mesh intersections during the transition.
- Keep hanger hooks constrained to the rail's height and depth while translating along its length.

Wheel and trackpad:
- Normalize wheel deltaMode (pixels/lines/pages).
- Use the dominant intended horizontal or vertical delta while interacting with the rack.
- Accumulate small high-resolution deltas immediately. Do not debounce browsing into one item every 450 ms.
- Preserve momentum smoothly and allow immediate reversal without queuing old animations.
- Snap gently to the nearest garment only after interaction settles, for example after 120–180 ms of idle input; tune by observation.
- Do not hijack page scrolling globally. Outside the rack, normal page scrolling must work. At finite rack boundaries, allow outward scrolling to leave the scene. Preserve browser zoom gestures such as ctrl+wheel.

Pointer/touch:
- Use pointer capture for dragging, handle cancellation and release outside the canvas, and distinguish a tap from a drag with a small movement threshold.
- Horizontal drag follows the user's finger continuously; use release velocity for a short, damped continuation before snapping.
- On touch screens, preserve ordinary vertical page scrolling and pinch zoom; detect horizontal intent before consuming the gesture.
- Clicking a neighboring garment smoothly brings it to center. Clicking the centered garment opens inspection. A drag must never trigger inspection accidentally.
- Arrow buttons and left/right keyboard input move exactly one garment using the same controller.

Secondary motion:
- Model subtle hanger/garment sway around a physically sensible pivot near the hook. Acceleration causes a small delayed response, then it settles.
- Keep side swing modest, roughly 2–5 degrees, and optional cloth deformation very subtle.
- Keep the hook on the rail; do not rotate the whole rack around the shirt center.
- No perpetual bouncing, dramatic pendulum swings, rubber-band stretching, or exaggerated idle motion.

Implementation notes:
- Use delta-time-based damping in the render loop. Avoid React state updates every frame; use refs/scene transforms.
- Clamp large dt values after background-tab pauses; use stable substeps if implementing spring integration explicitly.
- Expose parameters in one motion config: input sensitivity, spring stiffness, damping, snap idle time, side angle, spacing, and maximum sway.
- Starting values such as stiffness 90–150 and damping 18–26 are only tuning suggestions for unit-mass spring coordinates, not recovered values from the video.
- Start with a finite rack and soft boundary resistance. Do not implement a visibly teleporting infinite loop.

## 6. Inspection mode
Use explicit browse, entering-inspect, inspect, and exiting-inspect states. Preserve rack position when entering and exiting.

Animate the selected garment forward and slightly larger, or smoothly adjust camera framing. Fade/retract the other garments and rail as appropriate to the reference. Do not pop instantly between unrelated DOM views. In inspection, dragging rotates the garment around its vertical axis and exposes a true back view. Provide a clear close button and Escape support; return smoothly to the exact prior rack state. Ignore rack wheel browsing during inspection or give it a clearly defined, bounded role. Keep scene controls usable after closing.

## 7. Working controls and responsive behavior
Implement functional background presets (neon/studio/dawn/forest), collection filters, rail materials (gold/chrome/black/wood), hanger materials, click behavior, optional auto-browse, and reset. Controls should modify existing meshes/materials without rebuilding the entire scene or destroying motion state unnecessarily.

Collection filtering should preserve the current product when possible, otherwise choose a valid item and transition cleanly. Handle a single-item collection and empty collection without crashes.

On mobile, fit the rail and selected garment to the available viewport; move settings into a compact grid or expandable panel. Keep touch targets comfortable and captions clear. Do not shrink desktop text until it becomes unreadable.

Respect prefers-reduced-motion: remove secondary sway and inertial overshoot while retaining usable selection. Provide semantic buttons, visible keyboard focus, named controls, a readable current-product label, and a useful static product fallback if WebGL fails. Pause auto-browse when users interact, when the tab is hidden, and when reduced motion is requested.

## 8. Performance and verification
Aim for smooth 60 fps on ordinary hardware, with adaptive quality rather than a guaranteed unsupported claim. Cap DPR sensibly (for example 1–1.5 on mobile, up to 2 on desktop), limit expensive shadows/postprocessing, share geometry/materials where appropriate, and dispose of replaced GPU resources. Show loading progress and recover from missing models with an honest fallback.

Run the build and inspect browser errors. Test:
1. Slow trackpad movement shows intermediate garment angles and positions.
2. A fast swipe moves continuously and settles naturally.
3. Reversing direction responds immediately without finishing a stale animation first.
4. During transitions, two neighboring garments visibly share the turn; there is no instant face/edge switch.
5. Hanger hooks stay aligned with the rail; clothes do not float or intersect conspicuously.
6. A selected garment has believable side and rear geometry, not a paper-thin card or mirrored print.
7. Clicking, dragging, keyboard navigation, and inspection do not conflict.
8. Inspection closes to the same rack position.
9. Filters and material controls still work after repeated inspection.
10. Page scrolling works outside the scene, at rack boundaries, and on mobile.
11. Reduced-motion and WebGL-failure fallbacks work.
12. Test desktop and a narrow phone viewport; report any testing you could not perform.

Compare a short recording of the implementation to the supplied original video. Match the continuous turning and sliding first, then tune spacing, inertia, sway, lighting, and typography. Do not declare success solely because the layout resembles the reference.

## Deliverables
- Complete runnable source and assets, with package scripts and README.
- Reproducible geometry-generation scripts if used, plus third-party asset licenses.
- A concise explanation of the motion controller and exactly where to tune it.
- A short demo recording if the environment supports recording; otherwise describe the unverified parts honestly.
- A list of remaining differences from the reference, especially model fidelity.

Proceed with reasonable defaults and complete the implementation. Ask only when a missing asset or decision genuinely blocks the result. Do not add checkout, accounts, payments, or unrelated shop features to this animation task.
