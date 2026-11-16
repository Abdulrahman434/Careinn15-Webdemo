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

### 7. Native follow-up (separate request to the Android team — not blocking)

Ask native to include in `kiosk-resumed` a detail `{ lastPackage, reason: "home" | "back" | "crash" | "unknown" }`, and to type the `app-launched` payload. When available, the web side can show the card only for HOME/crash and skip it when the patient deliberately backed out. Until then the card shows for any return from an app.

## Decided by Sara

- Covers both outside apps and built-in games/tools.
- Must disappear on discharge and on patient change.
- Approach A (floating card, all layouts).
- On patient change / discharge, wipe **everything**: the card and all saved game/tool progress (and scores).

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
- Bottom corner opposite the toasts.

## Left to the builder

- Exact per-game "is resumable" check against each game's existing keys (difficulty/mode/language variants).
- Exact card size, offsets and z-index per layout, verified with screenshots.
- How to read the current patient (live App state vs localStorage) as long as it updates within one HL7 poll.
