# Abdul Taowab — Portfolio

The supplied reference HTML is the website implementation, with its original layout, typography, animated road and car, campus assembly animations, counters, night-to-day colors, skills chips, and portrait chooser. The adaptations to the supplied HTML are loading the original local portrait by default and serving the same font families locally.

Run from this directory:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

No installation or build is required. Styles, SVG illustrations, and JavaScript are embedded in `index.html`. The reference typefaces are served locally from `assets/fonts/` so no external font request is needed. Fontsource package versions, source URLs, verified SHA-512 package integrity, and licenses are included alongside the fonts. The reference includes reduced-motion styles.

The original portrait is included at `assets/abdul-taowab.png`. Selecting a different portrait overrides it in that browser's local storage, as in the supplied reference. Clear the `at-photo` local storage entry to restore the default. BRAC University is listed as graduating in 2027.
