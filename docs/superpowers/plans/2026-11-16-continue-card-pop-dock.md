# Continue Card "Pop, then dock" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Continue card impossible to miss: it pops as a large brand-coloured floating card when a new record appears, then docks into a brand-coloured top-bar card after ~10 s or on any touch outside it.

**Architecture:** `ContinueCard.tsx` gains a `mode: "popped" | "docked"` state keyed to the record's `leftAt`. Popped renders at canvas level (absolute, bottom centre; Kids above its action bar); docked keeps today's portal into the top-bar slot with new brand styling. Visibility/patient/lock logic in `continueActivity.ts` and App is unchanged.

**Tech Stack:** React 18 + TS, theme tokens from `ThemeContext.tsx`, i18n `i18n.ts`, `careinn-shoot` for verification.

**Spec:** `docs/superpowers/specs/2026-11-16-continue-card-design.md` — §6b is the binding section for this plan; §3–§5 unchanged.

## Global Constraints

- Load `careinn-ui-change` before editing UI; theme tokens only (`theme.primary`, `theme.brandOnPrimary`, `primaryLight`, `SHADOW`, `SPACE`, `TYPE_SCALE`, `WEIGHT`); missing token → flag, don't inline a colour.
- New strings in en, ar AND ur (e.g. "Continue {0}").
- Never cover Call / Call Nurse / I Need Something, CareMe or the top bar. Service tiles may be covered only while popped.
- **Screenshots must be whole screens (1920×1080 or full portrait), never crops or zooms** (Sara's standing preference).
- Work in /Users/sara/Careinn15-Webdemo/.worktrees/continue-card on branch `continue-card`. Sara's test server runs from this worktree on port 5180 and will hot-reload your edits — keep the app runnable between saves; use a different port for your own screenshot server.
- `npm run typecheck` no new errors (baseline 87), `npm run build` ok, `npm run test:continue` 40/40.

## Review Focus

1. A touch outside the popped card must dock it AND still reach what was under the finger (no swallowed first tap).
2. Popped card must never cover Kids' Call Nurse / I Need Something bar, nor portrait call controls.
3. Dark mode: docked and popped cards clearly visible (≥ 3:1 against their background).
4. The popped card must respect every existing hidden state (overlay open, lock, guest, onboarding) — no pop over an open game or modal; a pop that is pending when an overlay opens must not appear on top of it.
5. Pops once per record: docking then re-rendering (60 s tick, subscribe, patient re-check) must not re-pop.

---

### Task 1: Pop-then-dock card

**Files:**
- Modify: `src/app/components/ContinueCard.tsx`
- Modify: `src/app/App.tsx` only if the popped card needs a canvas-level mount point (keep minimal)
- Modify: `src/app/components/KidsHomescreen.tsx` only if a measured anchor for "above the action bar" is needed
- Modify: `src/app/components/i18n.ts`

**Interfaces:**
- Consumes (unchanged): `getVisibleActivity`, `subscribe`, `markReturned`, `applyLocation`, `recordLaunch`, `clearActivity`, `clearPendingLaunch` from `src/app/lib/continueActivity.ts`; `ContinueCard` props `{ hidden; onOpenGame; onOpenTool }`.
- Produces: no new exports required.

- [ ] **Step 1:** Add `mode` state. A record pops when its `leftAt` differs from the last popped `leftAt` (in-memory ref). After 10 000 ms, or on a `pointerdown` anywhere outside the popped card (capture phase, without `preventDefault`/`stopPropagation`, so the tap still reaches its target), switch to `docked`. If `hidden` becomes true while popped, switch to docked (no pop over overlays).
- [ ] **Step 2: Popped look** — canvas-level absolute card, bottom centre, `SPACE[3]` above the bottom edge (Kids: above the action bar; portrait: above call controls), filled `theme.primary`, `brandOnPrimary` text, strongest `SHADOW` token, `theme.radiusLg`; big icon tile, title `t("continue.titleWithName", name)` ("Continue {0}"), existing time text, large inverted Continue button, ×. Slide-up on appear; ≤ 400 ms shrink toward the top bar on dock; no motion under `prefers-reduced-motion`.
- [ ] **Step 3: Docked look** — same slot and fit rules as today, restyled per mock-up A: `theme.primary` fill, `brandOnPrimary` text, inverted Continue pill, soft ring. Dark mode: use a lighter brand tint (`primaryLight` or another existing token) giving ≥ 3:1 against the dark top bar; flag if none exists.
- [ ] **Step 4: Strings** — add `continue.titleWithName` (en "Continue {0}", ar, ur). Reuse existing time/dismiss keys.
- [ ] **Step 5: Verify behaviour** (headless via `careinn-shoot`, CareInn hospital, own port): (a) close Brain Math with progress → popped card visible; (b) after 10 s → docked in top bar; (c) new record → pops again; tap a visible tile outside the card while popped → card docks AND that tile opens; (d) Continue from popped resumes the game without prompt; (e) × from popped → no card at all; (f) open a game while popped → card hidden, no pop on top; close it without progress → no re-pop; (g) docked state survives 60 s tick / reload without re-popping in the same session — reload may pop once (acceptable). Report each result.
- [ ] **Step 6: Screenshots (whole screens only)** into `.superpowers/sdd/2026-11-16-continue-card/shots/popdock/`: popped + docked for Classic v1 EN light, v1 AR light, v1 EN dark, Kids EN, portrait EN, Spotlight EN, CI EN; plus Burjeel v1 EN popped + docked (second brand). Confirm in the report what the popped card covers in each and that Call/Call Nurse/CareMe are never covered.
- [ ] **Step 7:** `npm run typecheck` (87, none new), `npm run build`, `npm run test:continue` (40/40).
- [ ] **Step 8: Commit**

```bash
git add src/app/components/ContinueCard.tsx src/app/components/i18n.ts src/app/App.tsx src/app/components/KidsHomescreen.tsx
git commit -m "feat(home): Continue card pops as a floating card, then docks in the top bar"
```
