---
name: careinn-ui-change
description: Rules and checks for changing the look or layout of the CareInn demo (any React component under src/ — cards, popups, keypads, buttons, spacing, portrait/phone layouts, hospital themes). Use before editing UI in this repo, and when Sara reports something looks wrong, too small, misaligned or inconsistent.
---

# CareInn: changing the UI

Read `guidelines/Guidelines.md` first (tokens, i18n, bridge, scope). Then follow these rules. Each one comes from a correction Sara made.

## Design rules

- **One system, no special cases.** When a shared component doesn't fit somewhere, change the component once for every place, or change the content. Never add a smaller or "compact" variant, or a fallback, for one card or one count. The Android team builds from the guides, so every exception becomes extra spec and extra code for them.
- **Same in every orientation.** Elements that share a size in landscape (font sizes, labels, tiles) keep sharing it in portrait, tablet and phone. When shrinking for small screens, shrink siblings together and keep their ratios. Use the shared scales (`PHONE_TYPE_SCALE`, compact radii) rather than per-element overrides.
- **No hover.** Don't add `:hover` styles (lift, border colour, shadow, zoom). Give tap feedback with `:active` (for example `scale(0.97)`, or the brand fill on home cards). It's fine to remove hover rules you come across in a file you're already editing.
- **Cancel buttons stay grey.** A dialog's Cancel and other secondary buttons use muted text with a grey outline. If the edge is too faint, darken the neutral border. Never switch them to the brand colour.
- **Keypads.** All 4-digit PIN prompts share `PinDialog.tsx` + `PinKeypad` (same keys, dots and ✕). The phone dialers in `CallScreen.tsx` deliberately stay round with mono digits. Unify behaviour (150 ms press flash, sound), not their shape.
- Tokens only: `theme.*`, `TYPE_SCALE`, `WEIGHT`, `LEADING`, `SHADOW`, `SPACE`. No raw hex or px values in components.
- New strings need en, ar and ur.

## Don't touch

- **Kiosk IPTV loading:** the native `iptv.fetchChannels()` path and the `iptv-channels-loaded` / `iptv-channels-error` handling in `androidBridge.ts`. That belongs to Abdulrahman. Browser-only paths and the Live TV UI are fine to change.
- **Fakeeh Person-Centred Care / Care Partner:** not final. Don't polish or extend it unless Sara reopens it.

## Check your change

1. Use the **careinn-shoot** skill to measure before and after, at 1920 × 1080 and, if the screen has a portrait layout, at 1080 × 1920. Check English, Arabic and dark mode where they apply.
2. Compare the computed sizes of elements that should match (`--measure`). Report the numbers, not just "looks good".
3. Run `npx tsc --noEmit -p .` for non-trivial changes. It takes a few minutes, so run it in the background.
4. Show Sara the before and after screenshots.

## Git

- Commit on the `sara` branch only.
- Never push to `main` or deploy unless Sara says so for that change. Then use the **careinn-release** skill.
- End replies with the dev server link (`http://localhost:5173/`). Keep replies short: the answer and the action items.
