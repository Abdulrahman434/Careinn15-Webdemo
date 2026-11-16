# "Continue where you left off" Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A floating "Continue" card on the home screen that reopens the last outside app / URL or the last unfinished built-in game/tool, and wipes itself plus all saved game/tool progress on patient change or discharge.

**Architecture:** One dependency-free module `src/app/lib/continueActivity.ts` owns the single localStorage record, the current-patient key, resumable-save detection and the per-patient wipe; it is unit-tested with a node script like `test:reload`. Launch sites call `recordLaunch()`; App records built-in games/tools when they close; one `ContinueCard` component rendered once at canvas level (like `UpdateBanner`) subscribes to the module and handles return detection, patient re-checks and resume.

**Tech Stack:** React 18 + TypeScript (strict), Vite, existing theme tokens (`ThemeContext.tsx`), i18n (`i18n.ts`), Android bridge (`androidBridge.ts`), esbuild + node for the logic test.

**Spec:** `docs/superpowers/specs/2026-11-16-continue-card-design.md`

## Global Constraints

- Read `guidelines/Guidelines.md` first. Load the `careinn-ui-change` skill before any UI edit (Tasks 4, 5, 6).
- No hardcoded hex colours, font strings, sizes, weights, shadows or spacing — `theme.*`, `TYPE_SCALE`, `WEIGHT`, `LEADING`, `SHADOW`, `SPACE` only.
- Every new i18n key has `en`, `ar` and `ur`. Use `t("key", arg0)` — `{0}` placeholders.
- Native calls only via `src/app/utils/androidBridge.ts` (`apps.launch`, `getDeviceInfo`, `isAndroidApp`). Same build must work in a plain browser.
- API-served images through `proxyImageUrl()`; images rendered with `ImageWithFallback`.
- New localStorage keys (documented inline where read/written): `careinn-continue-activity`, `careinn-continue-patient`, `careinn-tool-notes`, `careinn-tool-whiteboard`, `careinn-tool-stopwatch`.
- No new dependencies. Adding a `scripts` entry to `package.json` is allowed.
- `src/app/components/i18n.ts` and `SurveyModal.tsx` had **uncommitted changes by Sara** before this work started. Before staging `i18n.ts`, run `git diff src/app/components/i18n.ts`; if hunks other than this feature's keys are present, stop and ask Sara whether to include them. Never stage `SurveyModal.tsx`.
- Commit on branch `sara`. Do not bump the version or push — releasing is a separate request (`careinn-release` skill).
- Verify: `npm run typecheck` clean for touched files, `npm run build` succeeds, `npm run test:continue` passes.

## Review Focus

1. **Patient B never sees patient A's activity** — A → B, A → empty bed, and A → (server down) → B must all end with no card and no game/tool saves. (Task 1 tests; Task 2 wiring.)
2. **Card appears while the patient is still inside the outside app** — must stay hidden until `kiosk-resumed` / tab visible again. (Task 1 `returned` test; Task 6 manual check.)
3. **Finished game still shows a card** — once a game removes its save key the card disappears without a reload. (Task 1 test.)
4. **Multi-difficulty games resume the wrong board** — autoResume must open the most recently saved difficulty/language. (Task 1 `latestSaveKey` test; Task 5 manual check.)
5. **Card blocks key controls or breaks a layout** — Classic v1/v2/v3, CI, Spotlight, Kids, portrait, EN/AR, light/dark. (Task 6 screenshots.)

---

### Task 1: `continueActivity` module + logic test

**Files:**
- Create: `src/app/lib/continueActivity.ts`
- Create: `src/app/lib/__tests__/continueActivity.test.ts`
- Modify: `package.json` (`scripts` only)

**Interfaces:**
- Produces (exact exports of `continueActivity.ts`; the module imports nothing so esbuild can bundle it for node):

```ts
export type ActivityKind = "app" | "url" | "game" | "tool";
export interface ContinueActivity {
  kind: ActivityKind;
  id: string;            // packageName | url | game id | tool id
  name?: string;         // app/url display name as launched (en)
  nameAr?: string;
  icon?: string;         // app/url icon (bundled asset or API url, unproxied)
  leftAt: number;        // ms
  patientKey: string;
  returned: boolean;     // false while an outside app is in front
}
export const CONTINUE_KEY = "careinn-continue-activity";
export const PATIENT_KEY = "careinn-continue-patient";
export const DEMO_PATIENT = "demo";
export const RESUMABLE_GAMES: readonly string[];   // 11 ids, see Step 3
export const RESUMABLE_TOOLS: readonly ["notes", "whiteboard", "stopwatch"];
export const TOOL_SAVE_KEYS: { notes: string; whiteboard: string; stopwatch: string };

export function currentPatientKey(): string;                         // stored key, else DEMO_PATIENT
export function applyLocation(loc: { patient_id?: string; admit_data?: string } | null): void;
export function recordLaunch(item: { kind: "app" | "url"; id: string; name?: string; nameAr?: string; icon?: string }, now?: number): void;
export function markReturned(now?: number): void;
export function recordBuiltInLeft(kind: "game" | "tool", id: string, now?: number): void;
export function hasResumableSave(kind: "game" | "tool", id: string): boolean;
export function latestSaveKey(gameId: string): string | null;
export function getVisibleActivity(): ContinueActivity | null;
export function clearActivity(): void;
export function clearPatientActivity(): void;
export function subscribe(fn: () => void): () => void;
```

- [ ] **Step 1: Write the failing test** `src/app/lib/__tests__/continueActivity.test.ts`, in the same script style as `reloadSafety.test.ts` (`ok(name, cond)`, PASS/FAIL lines, `process.exit(1)` on any failure). Install a Map-backed `globalThis.localStorage` shim with `getItem/setItem/removeItem/clear/key(i)/length`, and `localStorage.clear()` before each case. Cases (`A = {patient_id:"P1", admit_data:"R1"}`, `B = {patient_id:"P2", admit_data:"R2"}`):
  - `app hidden until returned`: `applyLocation(A); recordLaunch({kind:"app", id:"com.google.android.youtube", name:"YouTube"})` → `getVisibleActivity() === null`; after `markReturned()` → `.id === "com.google.android.youtube"` and `.returned === true`.
  - `markReturned ignores records already returned`: record game, store leftAt, `markReturned(later)` → leftAt unchanged.
  - `new launch replaces previous`: launch YouTube, launch `{kind:"url", id:"https://www.netflix.com/"}`, `markReturned()` → `.kind === "url"`.
  - `game recorded only with a save`: `recordBuiltInLeft("game","brainmath")` with no key → `null`; set `brain-math-game-state` → record → visible, `.kind === "game"`.
  - `excluded games never recorded`: set `simon-game-state`, `recordBuiltInLeft("game","simonsays")` → `null`; same for `reactiontime` with `reaction-speed-classic-state`.
  - `multi-difficulty save detected`: set `memory-match-hard-state` → `hasResumableSave("game","memory") === true`.
  - `tictactoe empty board not resumable`: `tictactoe-game-state = {"squares":[null×9]}` → false; with one `"X"` → true.
  - `finished game hides card`: record brainmath with save, then remove `brain-math-game-state` → `getVisibleActivity() === null`.
  - `latestSaveKey picks newest`: `word-search-easy-en-state {timestamp:1}`, `word-search-hard-ar-state {timestamp:5}` → `latestSaveKey("wordsearch") === "word-search-hard-ar-state"`; unknown game → `null`.
  - `patient change wipes everything`: `applyLocation(A)`; record brainmath; set `brain-math-high-score`, `memory-best-scores`, `game-lang-memory-match`, `careinn-tool-notes`, `wordchain-highscore`, `careinn-api-config`; `applyLocation(B)` → card `null`, all game/tool keys gone, `careinn-api-config` still present, `currentPatientKey() === "P2|R2"`.
  - `discharge to empty bed wipes`: `applyLocation(A)`; record; `applyLocation({patient_id:"", admit_data:""})` → `null`, save keys gone.
  - `failed fetch keeps state`: `applyLocation(A)`; record; `applyLocation(null)` → still visible.
  - `first location does not wipe`: no stored patient; set `brain-math-game-state`; `applyLocation(A)` → key still present.
  - `browser demo patient`: never call `applyLocation`; record + return → visible, `.patientKey === "demo"`.
  - `other patient's record hidden`: write a record with `patientKey:"X|Y"` directly → `null`.
  - `corrupt record ignored`: `CONTINUE_KEY = "{oops"` → `null`, no throw.
  - `subscribe notifies`: counter increments on `recordLaunch`, `clearActivity`, `clearPatientActivity`; unsubscribe stops it.

- [ ] **Step 2: Add the script and run it to see it fail**

Add to `package.json` `scripts`, mirroring `test:reload`:
`"test:continue": "esbuild src/app/lib/__tests__/continueActivity.test.ts --bundle --platform=node --format=esm --outfile=node_modules/.cache/continueActivity.test.mjs --log-level=error && node node_modules/.cache/continueActivity.test.mjs"`

Run: `npm run test:continue`
Expected: esbuild error — `Could not resolve "../continueActivity"`.

- [ ] **Step 3: Implement `src/app/lib/continueActivity.ts`**

Pinned values:
- `RESUMABLE_GAMES = ["memory","tictactoe","puzzle","colormatch","patternmemory","emojimatch","wordsearch","brainmath","triviaquiz","picturepuzzle","wordchain"]`.
- Resumable save detection per game (state keys only): `memory` `/^memory-match-.+-state$/`; `tictactoe` `tictactoe-game-state` with at least one non-null in `squares`; `puzzle` `/^sliding-puzzle-.+-state$/`; `colormatch` `color-match-game-state`; `patternmemory` `pattern-memory-game-state`; `emojimatch` `emoji-match-game-state`; `wordsearch` `/^word-search-.+-state$/`; `brainmath` `brain-math-game-state`; `triviaquiz` `trivia-quiz-game-state`; `picturepuzzle` `/^jigsaw-puzzle-.+-state$/`; `wordchain` `wordchain-game-state`.
- `TOOL_SAVE_KEYS = { notes: "careinn-tool-notes", whiteboard: "careinn-tool-whiteboard", stopwatch: "careinn-tool-stopwatch" }`; a tool is resumable when its key exists (Task 4 writes it only when there is real progress).
- Patient key = `` `${patient_id ?? ""}|${admit_data ?? ""}` ``. `applyLocation(null)` does nothing. Otherwise: if a stored key exists and differs → `clearPatientActivity()`; then store the new key. No stored key → just store.
- `clearPatientActivity()` removes `CONTINUE_KEY` and every key whose name starts with one of: `memory-match-`, `memory-best-scores`, `tictactoe-game-state`, `sliding-puzzle-`, `color-match-`, `pattern-memory-`, `pattern-high-score`, `emoji-match-`, `simon-`, `word-search-`, `reaction-speed-`, `reaction-leaderboard`, `brain-math-`, `trivia-quiz-`, `jigsaw-puzzle-`, `wordchain-`, `game-lang-`, `careinn-tool-`. Collect keys first, then remove (don't mutate while iterating `key(i)`). It does **not** remove `PATIENT_KEY`.
- `getVisibleActivity()` returns the record only if JSON parses, `returned`, `patientKey === currentPatientKey()`, and for game/tool `hasResumableSave` is still true.
- `recordBuiltInLeft` writes `returned: true` only when `hasResumableSave`; otherwise it calls `clearActivity()`.
- Every storage access wrapped in try/catch (quota / private mode). `subscribe` is an in-module `Set` of listeners, notified after every write.

- [ ] **Step 4: Run the test**

Run: `npm run test:continue`
Expected: every line `PASS`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/continueActivity.ts src/app/lib/__tests__/continueActivity.test.ts package.json
git commit -m "feat(continue): activity record, patient key and per-patient wipe"
```

---

### Task 2: Wire patient changes into the existing lifecycle

**Files:**
- Modify: `src/app/lib/dataLifecycle.ts:38-52` (`checkAdmission`)
- Modify: `src/app/components/NurseDataStore.ts:754-765` (`resetStoreForNewPatient`)

**Interfaces:**
- Consumes: `applyLocation`, `clearPatientActivity` from Task 1.

- [ ] **Step 1:** In `checkAdmission`, call `applyLocation(loc)` right after `fetchDeviceLocation` and **before** the `if (!loc) return` / onboarding-complete check, so it runs on every Android kiosk whether or not onboarding finished (`applyLocation(null)` is a no-op, so a failed fetch stays safe).
- [ ] **Step 2:** In `resetStoreForNewPatient`, call `clearPatientActivity()` inside the existing `try` that removes keys.
- [ ] **Step 3: Verify**

Run: `npm run typecheck 2>&1 | grep -E "dataLifecycle|NurseDataStore|continueActivity"` → no output. `npm run test:continue` → all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/dataLifecycle.ts src/app/components/NurseDataStore.ts
git commit -m "feat(continue): clear patient activity on admission change and new patient"
```

---

### Task 3: Record outside-app launches everywhere

**Files:**
- Modify: `src/app/components/AppLauncher.tsx` — `handleAppTap` (~1819-1868) and the `app-launch-failed` handler (~1690)
- Modify: `src/app/components/ServicesGrid.tsx:1106, 1157, 1219, 1482`
- Modify: `src/app/components/KidsHomescreen.tsx:267, 292`
- Modify: `src/app/App.tsx:1289` (broadcast CTA `open-url`)

**Interfaces:**
- Consumes: `recordLaunch`, `clearActivity` from Task 1.

- [ ] **Step 1:** In `handleAppTap`, immediately before each outside launch, call `recordLaunch`:
  - APK branch (installed → `launchApp(pkg)`): `{kind:"app", id: app.packageName, name: app.name, nameAr: app.nameAr, icon: app.imageUrl}`.
  - URL branches (both `window.open(app.url…)` calls and the `finalUrl` one at ~1813): `{kind:"url", id: <the url opened>, name: app.name, nameAr: app.nameAr, icon: app.imageUrl}`. For bundled-icon apps (YouTube/Netflix entries at ~208-229) pass the imported icon asset as `icon`.
  - Do **not** record the install-APK path (nothing opened yet) or `url-browser`.
- [ ] **Step 2:** In the `app-launch-failed` listener, also call `clearActivity()`.
- [ ] **Step 3:** At each `window.open` in ServicesGrid, KidsHomescreen (Quran, podcast) and App.tsx:1289, call `recordLaunch({kind:"url", id: url, name: <the label shown on that button, resolved via t() in en>, nameAr: <ar label>})`. Leave App.tsx:1479 (Consultation login link carrying the MRN) unrecorded — it is a clinical login, not something to "continue" (Claude's call, flag in the PR notes).
- [ ] **Step 4: Verify** — `npm run typecheck` shows no new errors in these files; `npm run build` succeeds. In `npm run dev`, tap YouTube in the App Launcher, then in devtools `localStorage.getItem("careinn-continue-activity")` shows `"kind":"url"` with `"returned":false`.
- [ ] **Step 5: Commit**

```bash
git add src/app/components/AppLauncher.tsx src/app/components/ServicesGrid.tsx src/app/components/KidsHomescreen.tsx src/app/App.tsx
git commit -m "feat(continue): record outside app and link launches"
```

---

### Task 4: Save progress in Notes, Whiteboard and Stopwatch

**Files:**
- Modify: `src/app/components/tools/NotesTool.tsx`
- Modify: `src/app/components/tools/WhiteboardTool.tsx`
- Modify: `src/app/components/tools/StopwatchTool.tsx`

**Interfaces:**
- Consumes: `TOOL_SAVE_KEYS` from Task 1. Each tool loads its key on mount and writes it on change; the key exists **only** while there is real progress (that is what makes the tool resumable).

- [ ] **Step 1: Notes** — persist `{ notes, selectedId }` to `TOOL_SAVE_KEYS.notes` whenever notes change, **but only once they differ from the seeded defaults** (NotesTool.tsx:21); load it on mount in place of the seed. Deleting back to the seed state removes the key.
- [ ] **Step 2: Whiteboard** — on each stroke end, save `canvas.toDataURL("image/png")` to `TOOL_SAVE_KEYS.whiteboard`; the clear action removes the key. On mount, draw the saved image scaled to the current canvas size (landscape 1600×880 vs portrait sizing differ). Wrap `setItem` in try/catch — on quota error, skip saving silently.
- [ ] **Step 3: Stopwatch** — persist `{ startedAt: number | null, elapsedBefore: number, laps: number[] }` to `TOOL_SAVE_KEYS.stopwatch`; derive displayed time as `elapsedBefore + (startedAt ? Date.now() - startedAt : 0)` so it keeps running while the tool is closed. Reset removes the key. Key exists only when running or elapsed > 0.
- [ ] **Step 4: Verify in `npm run dev`** — for each tool: make progress, close, reopen → progress is back; Notes opened and closed without edits leaves no `careinn-tool-notes` key; Stopwatch started, closed 10 s, reopened → shows ≥ 10 s. `npm run typecheck` clean for these files.
- [ ] **Step 5: Commit**

```bash
git add src/app/components/tools/NotesTool.tsx src/app/components/tools/WhiteboardTool.tsx src/app/components/tools/StopwatchTool.tsx
git commit -m "feat(tools): keep Notes, Whiteboard and Stopwatch progress for the patient"
```

---

### Task 5: `autoResume` for the 11 resumable games

**Files:**
- Modify: `src/app/components/games/{MemoryGame,TicTacToeGame,SlidingPuzzleGame,ColorMatchGame,PatternMemoryGame,EmojiMatchGame,WordSearchGame,BrainMathGame,TriviaQuizGame,ImageJigsawGame,WordChainGame}.tsx`

**Interfaces:**
- Consumes: `latestSaveKey(gameId)` from Task 1.
- Produces: each of these components accepts `autoResume?: boolean` alongside `onClose` / `onBackToGames`.

- [ ] **Step 1:** In each game's mount effect where it currently detects a save and calls `setShowResumeModal(true)` (e.g. `BrainMathGame.tsx:48-52`), when `autoResume` is true call the same function the modal's "Continue Playing" button calls (e.g. `loadGameState()`) instead of showing the modal. Without `autoResume`, behaviour is unchanged.
- [ ] **Step 2:** For the keyed-by-difficulty games — Memory (`memory-match-${difficulty}-state`), SlidingPuzzle (`sliding-puzzle-${difficulty}-state`), ImageJigsaw (`jigsaw-puzzle-${easy|medium|hard}-state`), WordSearch (`word-search-${difficulty}-${en|ar}-state`) — use `latestSaveKey(<game id>)` to get the newest key, set the game's difficulty (and WordSearch's language) parsed from it, then load that save.
- [ ] **Step 3: Verify** — `npm run typecheck` clean for these files; in `npm run dev`, opening a game from the launcher with a save still shows its normal "Resume Game?" prompt (no regression). The autoResume path is checked end-to-end in Task 6 Step 4, including WordSearch saved on hard + Arabic.
- [ ] **Step 4: Commit**

```bash
git add src/app/components/games/*.tsx
git commit -m "feat(games): autoResume opens the saved game without the resume prompt"
```

---

### Task 6: `ContinueCard` + App wiring + strings + visual check

**Files:**
- Create: `src/app/components/ContinueCard.tsx`
- Modify: `src/app/App.tsx` — game/tool render blocks (~2475-2506), next to `<UpdateBanner>` (~2522), new effects near the `activeGame`/`activeTool` state (~605)
- Modify: `src/app/components/i18n.ts`

**Interfaces:**
- Consumes: everything from Task 1; `apps`, `getDeviceInfo`, `isAndroidApp` from `androidBridge.ts`; `fetchDeviceLocation` from `src/app/lib/hospitalApi.tsx`; `autoResume` from Task 5.
- Produces: `export function ContinueCard(props: { hidden: boolean; onOpenGame: (id: string) => void; onOpenTool: (id: string) => void }): JSX.Element | null`

- [ ] **Step 1: Strings** — add to `i18n.ts`, all three locales:
  - `continue.action` "Continue"; `continue.justNow` "Left just now"; `continue.minAgo` "Left {0} min ago"; `continue.hoursAgo` "Left {0} h ago"; `continue.dismiss` "Dismiss".
  - `continue.game.<id>` for the 11 `RESUMABLE_GAMES`, English/Arabic names taken from the Games list in `AppLauncher.tsx` (~462 onward), Urdu translated. Tools reuse existing `tool.notes` / `tool.whiteboard` / `tool.stopwatch`.
- [ ] **Step 2: `ContinueCard.tsx`** — behaviour:
  - Reads `getVisibleActivity()`; re-reads on `subscribe`, and on a 60 s interval (for the "min ago" text).
  - On `kiosk-resumed` (via `useAndroidEvent` or a window listener) and on `document.visibilitychange` → visible: call `markReturned()`, then re-check the patient: if `getDeviceInfo()?.serial` exists, `applyLocation(await fetchDeviceLocation(serial))`. Do the same patient re-check once on mount.
  - Renders nothing when `hidden` or no activity.
  - Content: icon, name, time text, a primary `TouchButton` (`continue.action`) and an `IconButton` × (`aria-label` `continue.dismiss`). Icon: app/url → `ImageWithFallback` with `proxyImageUrl(icon)` (fallback lucide `Play`); game → lucide `Gamepad2`; notes `StickyNote`, whiteboard `PenTool`, stopwatch `Timer`. Name: app/url → `nameAr` when locale is ar/ur and present, else `name`; game → `t("continue.game.<id>")`; tool → `t("tool.<id>")`.
  - Time text: < 1 min `continue.justNow`; < 60 min `continue.minAgo`; else `continue.hoursAgo`.
  - Tap Continue: `app` → `recordLaunch({ kind: "app", id, name, nameAr, icon })` then `apps.launch(id)`; `url` → `recordLaunch({ kind: "url", id, name, nameAr, icon })` then `window.open(id, "_blank", "noopener,noreferrer")`; `game` → `onOpenGame(id)`; `tool` → `onOpenTool(id)`. × → `clearActivity()`.
  - Look: copy `UpdateBanner.tsx` — absolute in the canvas, elevated theme surface, `theme.radiusLg`, `SHADOW.xl`, `role="status"`, `useLocale()` for `dir`/font. Position bottom-left in LTR, bottom-right in RTL (opposite the toast stack), inset `SPACE[3]`, z-index above home content and below modals/toasts (`< 80`). Gentle slide-in.
- [ ] **Step 3: App wiring**
  - `const [autoResumeGame, setAutoResumeGame] = useState<string | null>(null)`; pass `autoResume={autoResumeGame === "<id>"}` to the 11 resumable games' render lines.
  - One effect on `activeGame` with a `useRef` of the previous value: when it becomes non-null → `clearActivity()`; when it changes away from a previous id → `recordBuiltInLeft("game", prev)` and `setAutoResumeGame(null)`. Same effect shape for `activeTool` → `recordBuiltInLeft("tool", prev)` (non-resumable tools simply clear).
  - Render `<ContinueCard hidden={anyOverlayOpen || showOnboarding || isLocked} onOpenGame={(id) => { setAutoResumeGame(id); setActiveGame(id); }} onOpenTool={(id) => setActiveTool(id as any)} />` next to `<UpdateBanner>`.
- [ ] **Step 4: Verify behaviour in `npm run dev`** (browser = demo patient):
  1. Play Brain Math a little → Home → card "Brain Math · Left just now" → Continue opens the game on the saved equation with no prompt.
  2. Finish/new-game it → Home → no card.
  3. Tap YouTube → new tab; return to the app tab → card "YouTube"; × hides it; reload → still hidden.
  4. With a card showing, in devtools set `careinn-continue-patient` to `"P9|R9"` and reload → card hidden (record belongs to another patient). The wipe itself is covered by Task 1's tests.
  5. Open Notes, write, close → card "Notes".
  6. Word Search on hard in Arabic, find one word, Home → Continue → opens hard + Arabic with the found word still marked.
- [ ] **Step 5: Visual check** — use the `careinn-shoot` skill with a resumable record present: Classic layout v1, v2, v3, CI (layout 2), Kids (3), Spotlight (4), portrait; English and Arabic; light and dark. Confirm the card doesn't cover CareMe, the call/nurse buttons, the shortcuts column or the Kids bottom bar; adjust offsets per layout only if needed. Report which combinations were screenshotted.
- [ ] **Step 6:** `npm run typecheck` (no new errors), `npm run build` succeeds, `npm run test:continue` all PASS.
- [ ] **Step 7: Commit** (check the `i18n.ts` diff first — see Global Constraints)

```bash
git add src/app/components/ContinueCard.tsx src/app/App.tsx src/app/components/i18n.ts
git commit -m "feat(home): Continue card for the last app, link, game or tool"
```

---

### Task 7: Request to the Android team (non-blocking)

- [ ] **Step 1:** Using the `careinn-dev-guide` skill, write a short revision note for the Android team asking for: `kiosk-resumed` detail `{ lastPackage: string | null, reason: "home" | "back" | "crash" | "unknown" }`, a typed `app-launched` detail `{ packageName: string }`, and confirmation that returning from a page opened with `window.open` fires `kiosk-resumed`. Explain the web side will then show the card only for `home` / `crash`.
- [ ] **Step 2:** On-device check (whoever has a kiosk): open YouTube from the launcher, press HOME → card appears; confirm the same for a URL app. Record the result in the PR notes.
