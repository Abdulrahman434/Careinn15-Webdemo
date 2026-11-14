---
name: careinn-shoot
description: Open the CareInn demo as a given hospital in a headless browser, open a screen, measure real sizes (box, padding, radius, colours, fonts) and save a screenshot. Use whenever you need exact values or pictures of a CareInn screen — writing a dev guide, checking a UI change at 1920×1080 or in portrait, comparing English/Arabic or light/dark, or making a mock-up such as "what if there were 4 cards".
---

# CareInn: measure and screenshot a screen

Never guess a size or colour. Measure it from the running demo.

## Setup (once per session)

1. The dev server must be running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` should print 200. If not, start `npm run dev` in the background.
2. Install puppeteer-core **outside the repo**. The repo's dependency list is fixed, so never add it to package.json:
   ```bash
   npm i --prefix "$SCRATCH/pptr" puppeteer-core@23.11.1
   ```
   `$SCRATCH` is your scratchpad directory.
3. Chrome is found automatically (`$CHROME_PATH`, `~/.cache/puppeteer`, or the installed Google Chrome). If none is found, run `npx @puppeteer/browsers install chrome@stable --path ~/.cache/puppeteer`.

## Run

```bash
NODE_PATH="$SCRATCH/pptr/node_modules" node .claude/skills/careinn-shoot/scripts/shoot.mjs \
  --hospital burjeel --open Feedback \
  --measure ".sm-card,.sm-hub-row,.sm-shell" \
  --out "$SCRATCH/feedback-en.png"
```

All options are documented at the top of [scripts/shoot.mjs](scripts/shoot.mjs):

- `--hospital`: `burjeel`, `dallah`, `slh`, `caremed`, `dsfh` (Fakeeh), `imc`, or `careinn`.
- `--size`: `1920x1080` (the kiosk) or `1080x1920` (bedside portrait).
- `--lang ar`, `--dark`: Arabic and dark mode.
- `--open`: text of the home tile to tap.
- `--tap`: CSS selector(s) to tap after that.
- `--press`: hold an element down to show its pressed state.
- `--mock file.js`: changes the page DOM before the shot, for mock-ups.
- `--measure`: prints every match with box, padding, radius, colours and font.

To run several shots, start them in parallel (`&` … `wait`). Each run takes about 10 s.

## Tips

- Find the selectors first: grep the component for its `className`s (for example `sm-card` in `SurveyModal.tsx`).
- The first-run tips (tour, onboarding, app-lock tutorial) are skipped automatically. If a new popup covers the screen, add its "seen" key to the script's localStorage block.
- Crop and compress shots before publishing them, with Pillow (`python3 -I`): JPEG, quality 86, at most 1600 px wide.
- Label every mock-up as a mock-up wherever it's shown.
