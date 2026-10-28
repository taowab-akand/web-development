# Verification

## Automated controller checks

`npm test` passes nine tests: fractional high-resolution input accumulation, immediate reversal, idle snap/settlement, release momentum, finite boundaries, empty/single collections, background-tab delta stability, shared intermediate garment turns, and monotonic reduced-motion navigation.

`npm run build` passes TypeScript and the production Vite build.

## Browser checks

Chromium with software WebGL, desktop 1440px and phone 390px viewports. Captured desktop, phone, transition and actual rear garment screenshots. No page errors or console errors with all fonts self-hosted.

Confirmed layout without horizontal overflow at both sizes, genuine rear geometry and a separate small back crescent, working collection/material/atmosphere controls, single-item disabled arrows, empty collection view, help dialog with Escape, normal page scrolling outside the scene, and disabled auto browsing under reduced motion. Forced WebGL unavailability renders a static illustrated product fallback with working navigation.

The initial browser pass found a pointer-capture issue with buttons embedded inside the scene, and an Escape focus gap while entering inspection. Both were repaired: capture starts only after horizontal drag intent, DOM buttons are excluded, and Escape is handled throughout inspection. Pointer release no longer cancels release momentum.

The follow-up browser pass passed keyboard selection of the green long sleeve, clicking a neighboring mesh to select it, clicking the centered mesh to inspect it, Escape while entering, desktop close-button return to the same garment, preservation of the selected garment during filtering, and recovery from Archive. Outward wheel input at the first garment was not prevented and scrolled the page from y=100 to y=0. These checks use state polling instead of short fixed waits, since software WebGL runs substantially slower than hardware rendering.

## Reference comparison and limits

Inspected frames across the entire supplied 10.7-second reference, including green-shirt selection, isolation, and return. Compared the implementation's captured browsing/inspection sequence: the same fixed rail and continuous sliding/turning concept is implemented. The movement is inferred, not the original site's algorithm; proportions, materials, fold drape, lighting and timing differ.

No physical trackpad, multi-touch device, Safari/Firefox, or hardware GPU performance benchmark was available. Automated mouse dragging and emulated phone taps do not verify native finger gesture feel or pinch zoom on hardware. Real-device 60 fps is not claimed. The optional demo uses software-rendered Chromium, so recording speed is not a hardware performance measurement.
