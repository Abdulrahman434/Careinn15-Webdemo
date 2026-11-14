---
name: careinn-release
description: Push named CareInn changes from the sara branch to main as a numbered UI version (cherry-pick in a worktree, version bump, release notes, keep sara in step), and optionally deploy. Use ONLY when Sara explicitly asks to push or release something to main or to deploy — never on your own initiative.
---

# CareInn: release to main

`sara` and `main` differ on purpose: sara keeps work that main doesn't have. **Main gets only the commits Sara names.** Every push to main is a numbered version that shows as "UI V…" at the bottom of Settings, with its release notes.

Only do this when Sara has said, for this change, to push to main or deploy.

## Steps

1. **Commit on sara** if the change isn't committed yet. Use a clear `feat(area): …` or `fix(area): …` message.
2. **Worktree on origin/main:**
   ```bash
   git fetch origin
   git worktree add "$SCRATCH/main-wt" origin/main
   cd "$SCRATCH/main-wt"
   git cherry-pick <the sara commit(s) Sara named>
   ```
   Never `git push origin sara:main`, never merge sara into main, and never bring main's reverts onto sara. If a cherry-pick conflicts, stop and ask.
3. **Version** (in the worktree):
   ```bash
   npm version <x.y.z> --no-git-tag-version --allow-same-version
   ```
   This updates package.json and package-lock.json. Use a minor bump (1.17.0 → 1.18.0) when the push adds or changes something visible, and a patch bump (1.17.0 → 1.17.1) when it only fixes.
4. **Release notes:** add an entry at the top of `RELEASES` in `src/app/data/releaseNotes.ts`:
   ```ts
   {
     version: "x.y.z",
     date: "YYYY-MM-DD",
     changes: [
       { type: "improved", area: "Feedback", text: "One plain sentence a nurse would understand." },
     ],
   },
   ```
   Types are `new`, `improved` or `fixed`. `area` is named the way staff would say it. Cover everything that reaches main in this push, including earlier commits on main that have no entry yet.
5. **Commit and push main:**
   ```bash
   git add -A
   git commit -m "release: UI Vx.y.z"
   git push origin HEAD:main
   ```
6. **Keep sara in step:** in the main repo, run `git cherry-pick <release commit>` on sara, so both branches carry the same notes and version. Then `git push origin sara`.
7. **Clean up:** `git worktree remove "$SCRATCH/main-wt"`.

## Deploy

- Vercel auto-deploys `main` to demo.careinn.com in about 1 minute. No extra step is needed.
- Run `npm run deploy` (rsync to the Plesk server, see `scripts/deploy-static.sh`) only if Sara asks for it.
- Tell Sara to hard-reload: the PWA service worker caches the old build. A local dev server needs a restart to show the new version number.

## Report

Give a short report:
- the version number
- the commits that went to main
- what's in the release notes
- whether you deployed
