# Abdul Taowab — Portfolio

The supplied reference HTML is the website implementation, with its original layout, typography, animated road and car, campus assembly animations, counters, night-to-day colors, skills chips, and portrait chooser. The supplied layout and artwork are retained, with the original local portrait and locally served typefaces. Scrolling uses the locally vendored Lenis library, with native touch scrolling and a native-scrolling fallback when reduced motion is requested or the library is unavailable. Road geometry is sampled at layout time; the car and road mask redraw only while their position changes. The animation follows elapsed time so its easing stays consistent across display refresh rates. Decorative stars and color updates run at up to 30 frames per second, and the main loop pauses in hidden tabs.

Run from this directory:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

No installation or build is required. Styles, SVG illustrations, and application JavaScript are embedded in `index.html`. Lenis 1.3.27 is included in `assets/vendor/lenis/` with its MIT license and source/package integrity metadata; it requires no CDN access. The reference typefaces are served locally from `assets/fonts/` so no external font request is needed. Fontsource package versions, source URLs, verified SHA-512 package integrity, and licenses are included alongside the fonts. The reference includes reduced-motion styles.

The original portrait is included at `assets/abdul-taowab.png`. Selecting a different portrait overrides it in that browser's local storage, as in the supplied reference. Clear the `at-photo` local storage entry to restore the default. BRAC University is listed as graduating in 2027.
