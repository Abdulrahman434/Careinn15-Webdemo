/**
 * "Continue where you left off": one record of the patient's last activity,
 * the current-patient key, and the per-patient wipe. Imports nothing so it can
 * be bundled for the node test.
 *
 * localStorage keys:
 *  - careinn-continue-activity  the last-activity record (JSON ContinueActivity)
 *  - careinn-continue-patient   "patient_id|admit_data" of the patient whose
 *                               activity and game/tool saves are on this screen
 */
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

export const RESUMABLE_GAMES: readonly string[] = [
  "memory", "tictactoe", "puzzle", "colormatch", "patternmemory", "emojimatch",
  "wordsearch", "brainmath", "triviaquiz", "picturepuzzle", "wordchain",
];
export const RESUMABLE_TOOLS = ["notes", "whiteboard", "stopwatch"] as const;
export const TOOL_SAVE_KEYS = {
  notes: "careinn-tool-notes",
  whiteboard: "careinn-tool-whiteboard",
  stopwatch: "careinn-tool-stopwatch",
};

/** Game id -> matcher for its in-progress state key(s) (state keys only, not scores). */
const GAME_SAVE: Record<string, RegExp> = {
  memory: /^memory-match-.+-state$/,
  tictactoe: /^tictactoe-game-state$/,
  puzzle: /^sliding-puzzle-.+-state$/,
  colormatch: /^color-match-game-state$/,
  patternmemory: /^pattern-memory-game-state$/,
  emojimatch: /^emoji-match-game-state$/,
  wordsearch: /^word-search-.+-state$/,
  brainmath: /^brain-math-game-state$/,
  triviaquiz: /^trivia-quiz-game-state$/,
  picturepuzzle: /^jigsaw-puzzle-.+-state$/,
  wordchain: /^wordchain-game-state$/,
};

/** Everything a patient leaves behind in games and tools; wiped on a patient change. */
const PATIENT_KEY_PREFIXES = [
  "memory-match-", "memory-best-scores", "tictactoe-game-state", "sliding-puzzle-",
  "color-match-", "pattern-memory-", "pattern-high-score", "emoji-match-", "simon-",
  "word-search-", "reaction-speed-", "reaction-leaderboard", "brain-math-", "trivia-quiz-",
  "jigsaw-puzzle-", "wordchain-", "game-lang-", "careinn-tool-",
];

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => { try { fn(); } catch { /* listener errors must not break a write */ } });

const read = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* quota / private mode */ } };
const remove = (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };
const allKeys = (): string[] => {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
  } catch { /* ignore */ }
  return keys;
};

export function currentPatientKey(): string {
  return read(PATIENT_KEY) || DEMO_PATIENT;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function readRecord(): ContinueActivity | null {
  const raw = read(CONTINUE_KEY);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    return r && typeof r === "object" && typeof r.kind === "string" && typeof r.id === "string" ? r : null;
  } catch { return null; }
}

function saveKeys(gameId: string): string[] {
  const re = GAME_SAVE[gameId];
  if (!re) return [];
  return allKeys().filter(k => {
    if (!re.test(k)) return false;
    if (gameId !== "tictactoe") return true;
    try {
      const sq = JSON.parse(read(k) || "{}").squares;
      return Array.isArray(sq) && sq.some(s => s !== null && s !== undefined);
    } catch { return false; }
  });
}

export function hasResumableSave(kind: "game" | "tool", id: string): boolean {
  if (kind === "tool") {
    const key = (TOOL_SAVE_KEYS as Record<string, string>)[id];
    return !!key && read(key) !== null;
  }
  return saveKeys(id).length > 0;
}

/** The game's most recently saved state key (by stored timestamp), or null. */
export function latestSaveKey(gameId: string): string | null {
  let best: string | null = null;
  let bestTs = -Infinity;
  for (const k of saveKeys(gameId)) {
    let ts = 0;
    try { ts = Number(JSON.parse(read(k) || "{}").timestamp) || 0; } catch { /* no timestamp */ }
    if (ts > bestTs) { best = k; bestTs = ts; }
  }
  return best;
}

export function clearActivity(): void {
  remove(CONTINUE_KEY);
  notify();
}

/** Removes the activity record and every game/tool save and score. Keeps the patient key. */
export function clearPatientActivity(): void {
  remove(CONTINUE_KEY);
  allKeys()
    .filter(k => PATIENT_KEY_PREFIXES.some(p => k.startsWith(p)))
    .forEach(remove);
  notify();
}

/** Call with each patient lookup. null (failed fetch) changes nothing. */
export function applyLocation(loc: { patient_id?: string; admit_data?: string } | null): void {
  if (!loc) return;
  const next = `${loc.patient_id ?? ""}|${loc.admit_data ?? ""}`;
  const stored = read(PATIENT_KEY);
  if (stored && stored !== next) clearPatientActivity();
  write(PATIENT_KEY, next);
}

export function recordLaunch(
  item: { kind: "app" | "url"; id: string; name?: string; nameAr?: string; icon?: string },
  now: number = Date.now(),
): void {
  const rec: ContinueActivity = {
    kind: item.kind, id: item.id, name: item.name, nameAr: item.nameAr, icon: item.icon,
    leftAt: now, patientKey: currentPatientKey(), returned: false,
  };
  write(CONTINUE_KEY, JSON.stringify(rec));
  notify();
}

export function markReturned(now: number = Date.now()): void {
  const rec = readRecord();
  if (!rec || rec.returned) return;
  write(CONTINUE_KEY, JSON.stringify({ ...rec, returned: true, leftAt: now }));
  notify();
}

export function recordBuiltInLeft(kind: "game" | "tool", id: string, now: number = Date.now()): void {
  if (!hasResumableSave(kind, id)) { clearActivity(); return; }
  const rec: ContinueActivity = { kind, id, leftAt: now, patientKey: currentPatientKey(), returned: true };
  write(CONTINUE_KEY, JSON.stringify(rec));
  notify();
}

export function getVisibleActivity(): ContinueActivity | null {
  const rec = readRecord();
  if (!rec || !rec.returned || rec.patientKey !== currentPatientKey()) return null;
  if ((rec.kind === "game" || rec.kind === "tool") && !hasResumableSave(rec.kind, rec.id)) return null;
  return rec;
}
