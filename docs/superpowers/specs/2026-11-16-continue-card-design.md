# "Continue where you left off" card — design

Date: 2026-11-16 · Status: draft for approval

## Why

Patients on the bedside screen often press the Android HOME button (or our on-screen Home/Back) by mistake while watching YouTube, using another app, or playing a game. Today they land on the home screen and have to find the thing again — and for built-in games they may not know progress was saved. This is frustrating, especially for elderly or unwell patients. We want a "Continue watching"-style card on the home screen so one tap takes them back.

## Goals

- After a patient leaves something unfinished, the home screen shows a small card: icon, name, "Continue", and how long ago.
- Covers **both**:
  - **Outside apps** — native Android apps launched from the App Launcher (APK entries) and URL apps such as YouTube/Netflix (which on the kiosk open outside our screen via `window.open`).
  - **Built-in games and tools** — the React mini-screens under `src/app/components/games/` and `tools/`.
- One tap resumes: outside app → relaunch it; game/tool → open it straight into its saved progress.
- The card **disappears when the patient is discharged or the patient changes**, immediately, and never shows one patient's activity to the next.

## Non-goals

- Showing the video title or playback position for YouTube/Netflix (we only know app name + icon; not available without native work, maybe not at all).
- A history / list of several recent items — only the single most recent one.
- Resuming the exact in-app position of outside apps ourselves. Android usually restores the app's task where it was; if Android killed it (memory pressure), it starts fresh. That is acceptable.

## Anti-goals (would make this a failure even if it works)

- A previous patient's activity visible to a new patient.
- The card covering important home content (CareMe, call nurse, services) or getting in the way of tapping them.
- The card appearing when nothing is resumable (e.g. a finished game, an empty TicTacToe board).
- Breaking any home layout in landscape, portrait, Kids, RTL, or dark mode.

## Constraints

- Follow `guidelines/Guidelines.md`: theme tokens only, all three locales (en/ar/ur) for new strings, native calls only through `androidBridge.ts`, new localStorage key documented and collision-checked. `App.tsx` and `i18n.ts` are shared files — edits there are small and expected for this feature (flagged here so Sara approves them with this doc).
- Load the `careinn-ui-change` skill before UI edits; verify with `careinn-shoot` at 1920×1080 and portrait, EN + AR, light + dark.
- Same build must work in a plain browser (dev) and inside the Android kiosk.

## What exists today (from code recon)

- **Outside apps:** `AppLauncher.handleAppTap` (`AppLauncher.tsx:1819`) calls `launchApp(packageName)` for APK apps, or `window.open(url)` for URL apps (no one passes `onOpenUrl`, so the in-app browser is unused). Native fires `app-launched` / `app-launch-failed` (payload not read/typed) and `kiosk-resumed` when our screen returns to front (only listener: `App.tsx:463`). Nothing tells us *why* the patient came back (HOME vs back vs crash) or whether the app is still alive. Labels/icons come from `getPackagesCache()` + hardcoded app lists in AppLauncher.
- **Built-in games:** 13 of 14 games already save progress to localStorage and show their own "Resume Game?" prompt on open. Keys are inconsistent (some per difficulty/mode/language). TicTacToe saves even an empty board. None of the 8 tools save anything.
- **What closes a game by accident:** our own Home (`handleGoHome`, `App.tsx:905`) / browser back / Escape. The Android HOME button does *not* close built-in games — the game is still open when the kiosk returns.
- **Patient change:** no single hook. HL7 poll (`App.tsx:369-461`, every 30 s) calls `resetStoreForNewPatient` only when both old and new MRN/admit-ref are non-empty (misses discharge to empty bed). Admission watcher (`dataLifecycle.ts`, Android only, 5 min) wipes all non-device localStorage on any admit-ref change incl. discharge. Daily / 24h-idle policies wipe user data without an event.

## Approaches considered

- **A. Floating card in a fixed corner, rendered once at canvas level (chosen).** One component after the layout switch, like `UpdateBanner`. Works in every layout (Classic v1–v3, CI, Spotlight, Kids, portrait). Trade-off: it floats over content; must pick a spot that doesn't hide key controls.
- **B. Inline card inside each home layout.** Looks most native, but must be fitted into 5+ layouts and shrinks service grids. Rejected: too much per-layout work and layout risk.
- **C. Reuse the existing toast system.** Almost free, but toasts auto-dismiss in seconds — too brief for "continue". Rejected.

Sara picked **A** (2026-11-16).

## Design

### 1. The "last activity" record

One localStorage record, key **`careinn-continue-activity`** (new; grep showed no collision; not in DEVICE/SETUP/LIFECYCLE keys, so all existing wipes clear it):

```ts
{
  kind: "app" | "url" | "game" | "tool",
  id: string,          // packageName, url, game id, or tool id
  nameEn: string, nameAr?: string,   // or an i18n key for built-ins
  icon?: string,       // app icon url (proxied) or bundled asset
  leftAt: number,      // ms timestamp when the patient left it
  mrn: string,         // patient at the time
  admitRef: string,
}
```

A small module (e.g. `src/app/lib/continueActivity.ts`) owns read / write / clear plus a tiny pub/sub so the card re-renders.

### 2. When it is written

- **Outside app / URL:** at launch time, record the item with `leftAt` = now, through one shared `recordLaunch()` helper called from **every** place that opens outside content — `AppLauncher.handleAppTap` (APK + URL branches), `ServicesGrid.tsx` shortcuts, `KidsHomescreen.tsx` Quran/podcast buttons, and the `window.open` calls in `App.tsx` — so the behaviour doesn't depend on which button was used. The card becomes visible only once the patient is back: on `kiosk-resumed` (Android), or on the tab regaining focus/visibility (plain browser fallback). If `app-launch-failed` fires, clear it.
- **Game:** when a game is closed by *any* path (`setActiveGame(null)`), if that game currently has resumable saved progress, record it. If the game was finished (save key removed) → no record / clear.
- **Tool:** same as games, for tools that support saving (see §5).
- Opening any new app/game/tool replaces the record (only the latest).

### 3. When the card shows

All must be true:
- a record exists;
- its `mrn` + `admitRef` match the **current** patient (`careinn-last-mrn` / `careinn-last-admit-ref` or the live values in App);
- for games/tools: the saved progress still exists;
- no overlay/app is open (home screen is showing).

**Knowing the current patient.** `careinn-last-mrn` / `careinn-last-admit-ref` are never cleared on discharge, and `fetchPatientForDevice` returns the same thing for "empty bed" and "server down", so neither is enough. Use `fetchDeviceLocation` (as `dataLifecycle.ts` does), which distinguishes an empty bed from a failed request:
- confirmed **different admit ref or empty bed** → patient change (see §4);
- **request failed** → keep the last known state (don't hide, don't clear); re-check on the next poll;
- **plain browser (no device serial)** → treat as a single fixed "demo" patient so the card works on the web demo.

### 4. When it disappears — and the per-patient wipe

- Tapped (resumes) or dismissed with ×.
- Game finished later / save key gone.
- **Patient change or discharge (Sara: wipe everything).** On a confirmed patient change or discharge, clear the card record **and all saved game and tool progress** (every existing game save key, the new Notes/Whiteboard/Stopwatch saves), so the next patient never sees "Resume Game?" or notes from the previous one. This must work on every path, not only the Android admission watcher:
  - one shared `clearPatientActivity()` (in the new `continueActivity.ts` module) that removes the card record + all game/tool save keys (listed in one place, prefix-matched where keys vary by difficulty/mode/language);
  - called from `resetStoreForNewPatient` (`NurseDataStore.ts`), from the patient check in §3 (covers discharge to empty bed and kiosks where onboarding was never finished), and naturally covered by the existing full wipes.
  - Best scores / leaderboards (`*-high-score`, `memory-best-scores`, `reaction-leaderboard`) are cleared too — they belong to the patient.

### 5. Resume behaviour

- **App:** relaunch via the existing `apps.launch` bridge helper (package name). Android brings back its existing task where possible.
- **URL (YouTube etc.):** reopen the same URL the same way AppLauncher does. Position may be lost — acceptable.
- **Game:** open it with a new `autoResume` prop so it loads its saved state directly instead of showing its own "Resume Game?" prompt (one tap, not two). Games without the prop yet simply show their own prompt — still works.
- **Games excluded from the card:** Reaction Time (5 short rounds) and Simon Says (resume requires remembering a sequence) — resuming is meaningless.
- **TicTacToe:** only counts as resumable when the board is not empty.
- **Tools:** add saving to **Notes, Whiteboard, Stopwatch** only. Calculator, Unit Converter, Breathing, Mirror, Reminders are excluded (no meaningful progress).

### 6. The card (UI)

Floating card, bottom corner of the 1920×1080 canvas (bottom-left in LTR, bottom-right in RTL — opposite the toast stack side), above content via z-index below modals/toasts. Pattern copied from `UpdateBanner` (theme surface, `radiusLg`, `SHADOW.xl`, `role="status"`, `IconButton` ×). Content:

```
┌─────────────────────────────────┐
│ [icon]  YouTube              ×  │
│         Left 2 min ago          │
│         [ ▶ Continue ]          │
└─────────────────────────────────┘
```

Gentle slide-in when it appears. Must be checked in Classic v1/v2/v3, CI, Spotlight, Kids, portrait, EN+AR, light+dark; exact position/size per layout is tuned during build with screenshots.

New strings (en/ar/ur): "Continue", "Left {n} min ago" / "just now", "Dismiss" (aria).

> **Superseded by §6b.** The bottom corner covered home tiles in 4 layouts, so the card moved into a top-bar slot after the logo (white card). Sara tested that on 2026-11-16: "good but not clear at all, I barely noticed it… this is a floating item". She compared full-screen mock-ups (A brand-coloured top-bar card, B floating mini-player, C pop-then-dock) and chose **C**.

### 6b. Pop, then dock (Sara, 2026-11-16)

**Why:** the card must be noticed at the moment of frustration (just back on the home screen after leaving something by mistake), without permanently covering home controls.

**Two states, one record:**
- **Popped (floating mini-player):** large brand-coloured card floating at the bottom centre of the canvas, above content — big icon tile, title "Continue {name}", "Left … ago", large Continue button, ×. Strongest shadow token. Slides up when it appears.
- **Docked (top bar):** the existing top-bar slot after the logo, but brand-coloured (filled `theme.primary`, `brandOnPrimary` text, inverted Continue button, soft ring) so it stands out from the header — mock-up A.

**When it pops:** each time a new record becomes visible — the patient returns from an outside app/link, or closes a resumable game/tool. Once per record (per `leftAt`); a page reload with an existing record may pop again (acceptable). Records already docked stay docked.

**When it docks:** after ~10 seconds, or immediately when the patient touches anywhere outside the popped card (that touch still does what it was meant to do — e.g. opens the tile under the finger if it wasn't under the card). Docking animates the card shrinking toward the top bar (short, ≤ 400 ms; respects reduced motion).

**Actions:** Continue (either state) = resume as before. × (either state) = dismiss the record entirely.

**Must never cover:** Call / Call Nurse / I Need Something, CareMe, or the top bar. Service tiles may be covered only while popped (≤10 s).
- **Kids layout:** the popped card sits **above** the bottom action bar (Call Nurse / I Need Something), not over it.
- **Portrait:** popped card at the bottom centre above any call/nurse controls; verify with screenshots.
- **Phone-width canvases:** popped card fits the width (no overflow); docked state keeps today's fit rules (may hide).

**Dark mode:** navy-on-dark disappears (mock-up A dark: 1.12:1). The docked card uses a lighter brand tint (e.g. `primaryLight` or another existing token) with ≥ 3:1 contrast against the dark top bar; the popped card likewise must stand out against dark content. If no existing token gives the contrast, flag it rather than inlining a colour.

**Same as before:** visibility rules (§3), hidden states (overlays, locks, guest, onboarding), patient wipe (§4), resume (§5).

> **Docked place, dark mode and placement superseded by §6c** (2026-11-17). The pop itself, the dock timing/touch rules and the actions above still hold.

### 6c. Rest at the bottom: compact pill (Sara, 2026-11-17)

**Why:** after building §6b Sara saw that the top bar is far from the patient's hand. She compared whole-screen mock-ups of three bottom resting places (A pill at bottom centre, B side-edge bubble, C bottom-edge tab — `shots/bottomdock/`, report `bottomdock-report.md`) in light and dark, and chose **A**.

**Docked = compact pill, bottom centre.** The popped card shrinks in place (≤ 400 ms, none under reduced motion) into a pill: icon + "Continue {name}" + small ×. Tap the pill = resume; × = dismiss. The top-bar slot is no longer used. Mock-up size on bedside screens: 64 tall, ~384 wide, `SPACE[3]` (24) above the bottom edge. It may cover tile labels while resting (Sara saw this in the mock-ups and accepted it).

**Each item's own icon** (Sara: "can't keep in mind what icon for which open app"). The name is always shown in words; the icon must also match what the patient tapped:
- outside apps / links: their real logo (as today);
- tools: their own icon (as today);
- **games: the game's own mark from its Games-folder tile** (the tile's background and its picture/emoji, e.g. 🧠 Brain Math, ❤️ card Memory Match) — not one shared controller icon. One source of truth for these marks so the tile and the card can't drift.

**Dark mode: the card simply turns white** (Sara: "just turn it white"). Popped and pill: white fill, brand-coloured text (`primaryOnLight`), brand-filled Continue button with `brandOnPrimary` text. No tints, rings or glows. Light mode stays brand-filled with white text. The theme has no colour that is white in both modes, so one is added to `ThemeContext.tsx` (Sara was told and agreed).

**Limits come from the layouts' fixed dimensions, not measurement** (Sara: "our dimensions are static… even if Call not there we can use its dimensions to know where to stop"). The card's max width / height and bottom offset per layout are computed from numbers the layouts already use (ideally exported from the layout files so they move together), never from DOM keep-clear markers or from whether Call / CareMe are present. Must still never cover Call / Call Nurse / I Need Something, CareMe or the top bar — in every layout (Classic v1/v2/v3, CI, Spotlight, Kids, portrait, tablet portrait, phone), EN and AR. Kids: pill and popped card sit above the action bar.

**Responsive size and font** (Sara: "HAS to be responsive"). Text uses the shared type scale (which already steps down on phones); sizes step down one `SPACE` step on phones; Continue and × wrap to a second row only when they don't fit beside the name. On a phone the page's scroll area ends above the card so nothing — including Call — scrolls under it; that space changes smoothly (no jump) when the card shrinks.

### 6d. The pill can be dragged anywhere (Sara, 2026-11-17)

**Why:** a patient wants the pill out of the way of a tile it is covering.

- **Free drag:** the patient can press the resting pill and drag it anywhere on the screen. The only limit is that it can't go off the screen's edges. It may sit over anything, including Call, Call Nurse, CareMe or the top bar. Sara: "he's free to drag it anywhere". The "never cover" rule now applies only to where the card appears **by default**: the pop spot and the first resting spot.
- **Drag vs tap:** a touch that moves less than a small threshold is still a tap and resumes; past the threshold it becomes a drag, and letting go doesn't resume. × still dismisses. No long-press is needed. *(Claude's call.)*
- **It stays where it's left.** The spot is remembered for the current patient across new activities, reloads and size changes (stored relative to the canvas). It is wiped on patient change like everything else. A new activity still pops at the default spot, then rests at the patient's chosen spot. *(Claude's call.)*
- **Only the pill moves.** The popped card does not; any touch docks it, as before. *(Claude's call.)*
- **Phone:** the page keeps its bottom lane only while the card sits at its default place. Once the patient moves the pill, the lane goes away. *(Claude's call.)*

- **Showing it can be dragged (Sara chose "both", 2026-11-17):**
  - **Grip dots (⋮⋮)** always sit at the start of the pill (mirrored in RTL).
  - **A one-time nudge:** the first time the pill settles for a patient, it gives a small wiggle and a short bubble beside it says "Drag to move it anywhere". It lasts about 4 s, or until any touch.
    - It is shown once per patient and wiped on patient change.
    - It is skipped if the patient has already moved the pill.
    - Under reduced motion it shows the bubble only, with no wiggle.

### 7. Native follow-up (separate request to the Android team — not blocking)

Ask native to include in `kiosk-resumed` a detail `{ lastPackage, reason: "home" | "back" | "crash" | "unknown" }`, and to type the `app-launched` payload. When available, the web side can show the card only for HOME/crash and skip it when the patient deliberately backed out. Until then the card shows for any return from an app.

## Decided by Sara

- Covers both outside apps and built-in games/tools.
- Must disappear on discharge and on patient change.
- Approach A (floating card, all layouts).
- On patient change / discharge, wipe **everything**: the card and all saved game/tool progress (and scores).
- Card look and place: **C — pop, then dock** (§6b), with Kids above the action bar and a lighter tint in dark mode (2026-11-16).
- Resting place: **A — compact pill at the bottom centre** (§6c), each item with its own icon (games use their tile's mark), white card in dark mode, limits from the layouts' fixed sizes, responsive size and font (2026-11-17).

## Calls made by Claude (open to correction)

- Patient is checked via `fetchDeviceLocation`; during a server outage the card keeps its last state rather than hiding.
- Works on both the Android kiosk and the web demo (browser focus fallback). Needs one on-device check that returning from a YouTube URL fires `kiosk-resumed`.
- All outside-content launch points are recorded, not only the App Launcher (Kids, ServicesGrid, App shortcuts).
- Shared files touched: `App.tsx`, `i18n.ts`, `NurseDataStore.ts`, `AppLauncher.tsx`, `ServicesGrid.tsx`, `KidsHomescreen.tsx`, each game with `autoResume`.
- Only the single latest item, no history.
- No time-based expiry; it lives until tapped, dismissed, patient change, or the existing daily/idle wipe.
- Card shows after *any* exit from an app (we can't detect accidental HOME yet) — refined once native sends `reason`.
- Excluded: Reaction Time, Simon Says, and tools without real progress.
- `autoResume` prop to skip the games' own resume prompt.
- ~~Bottom corner opposite the toasts.~~ Replaced by §6b.
- §6b details: pops once per record, docks after ~10 s or on any touch outside it (the touch still works), × dismisses in both states.

## Left to the builder

- Exact per-game "is resumable" check against each game's existing keys (difficulty/mode/language variants).
- Exact card size, offsets and z-index per layout, verified with screenshots.
- How to read the current patient (live App state vs localStorage) as long as it updates within one HL7 poll.
