# Stockbee Market Monitor

A fast, single‑page, client‑only market breadth dashboard that reads live data from a Google Sheets CSV and renders interactive charts with Chart.js.

## Live Demo

- GitHub Pages: https://timlihk.github.io/Stockbee-market-monitor/

## Highlights

- Instant loads via local cache, then updates live
- Smooth, modern hover with custom tooltip, crosshair, and deltas
- Adaptive performance: decimation, fewer ticks, no points on dense ranges
- No build step, no server — just static HTML, CSS, and JS

## Getting Started

- Local preview:
  - Python 3: `python3 -m http.server 8080` then open `http://localhost:8080/stockbee-market-monitor/`
  - Or open `index.html` directly (some browsers restrict CSV fetch from `file://`; use a server for best results).
- Hosting: any static host (GitHub Pages, Netlify, Vercel, S3) — no backend required.
  - GitHub Pages automatically serves from this repo’s `main` branch. Use the live URL above.

## Data Source

This page fetches a public Google Sheet as CSV. The sheet ID is hard‑coded in `script.js` as `SHEET_ID`.

To use your sheet:
- Publish the sheet to the web (File → Share → Publish to web) so the CSV endpoints are readable without auth.
- Replace the `SHEET_ID` in `script.js` with your own.
- The app tries multiple CSV endpoints (gviz/published/export) and finally a light CORS proxy for browsers that block Google CSV CORS.

Expected columns (header names are normalized and forgiving):
- `Date`
- `Number of stocks up 4% plus today`
- `Number of stocks down 4% plus today`
- `5 day ratio`
- `10 day ratio` (extra spaces in original are tolerated)
- `Number of stocks up 25% plus in a quarter`
- `Number of stocks down 25% + in a quarter`
- `Number of stocks up 25% + in a month`
- `Number of stocks down 25% + in a month`
- `Number of stocks up 50% + in a month`
- `Number of stocks down 50% + in a month`
- `Number of stocks up 13% + in 34 days`
- `Number of stocks down 13% + in 34 days`
- `T2108`
- `S&P` (optional)

The app normalizes header spacing and maps columns to internal keys, so minor header spacing variations do not break rendering.

## Features & Controls

- Indicator selection: pick which series to display (persisted)
- Time range: filter by recent windows (ticks adapt to screen/points)
- Theme: light/dark toggle (persisted)
- Refresh:
  - Manual button fetches with cache‑busting and updates if data hash changes
  - Auto‑refresh option fetches periodically (persisted)
- Tooltip:
  - Series color + value
  - Day‑over‑day delta and percentage
  - Crosshair region for clear alignment

## Performance

- Chart.js decimation (LTTB) for large datasets
- Adaptive rendering by visible points:
  - > 600 points: no markers, shorter animations, fewer x‑ticks, slightly reduced devicePixelRatio
  - ≤ 600 points: small markers, smooth short animations

## Caching

- On load, the app tries to render from a cached copy in `localStorage` (key: `marketDataCache`) for instant display.
- It then fetches fresh data; if the data hash changed, the UI updates and cache is refreshed.
- You can clear cache by:
  - Browser devtools → Application → Local Storage → remove `marketDataCache` key, or
  - Clearing site data for your domain.

## Accessibility

- Live status region (`aria-live="polite"`) for data updates
- High‑contrast color coding in tooltip summary

## Development Notes

- No build toolchain required. Edit `index.html`, `styles.css`, `script.js`.
- If you change the sheet schema, update `indicatorConfig` names and/or extend the header mapping logic at the top of `script.js`.

## License

This repository follows the original project’s license terms. If absent, treat as All Rights Reserved unless a LICENSE file is added.
