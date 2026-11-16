/**
 * The "Continue where you left off" record: what is remembered, when it is
 * shown, and that a new patient never inherits the previous one's activity.
 *
 * Run with: npm run test:continue
 */
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
};

import {
  CONTINUE_KEY, PATIENT_KEY, applyLocation, recordLaunch, markReturned, recordBuiltInLeft,
  hasResumableSave, latestSaveKey, getVisibleActivity, clearActivity, clearPendingLaunch,
  clearPatientActivity, currentPatientKey, subscribe, usableSave,
} from "../continueActivity";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name); }
};
const reset = () => localStorage.clear();
const A = { patient_id: "P1", admit_data: "R1" };
const B = { patient_id: "P2", admit_data: "R2" };
const YT = { kind: "app" as const, id: "com.google.android.youtube", name: "YouTube" };
const has = (k: string) => localStorage.getItem(k) !== null;

console.log("\n— outside apps —");
reset(); applyLocation(A); recordLaunch(YT);
ok("app hidden until returned", getVisibleActivity() === null);
markReturned();
ok("app visible after return", getVisibleActivity()?.id === YT.id && getVisibleActivity()?.returned === true);

reset(); localStorage.setItem("brain-math-game-state", "{}");
recordBuiltInLeft("game", "brainmath", 1000);
markReturned(5000);
ok("markReturned ignores records already returned",
  JSON.parse(localStorage.getItem(CONTINUE_KEY)!).leftAt === 1000);

reset(); recordLaunch(YT); recordLaunch({ kind: "url", id: "https://www.netflix.com/" }); markReturned();
ok("new launch replaces previous", getVisibleActivity()?.kind === "url");

reset(); recordLaunch(YT); clearPendingLaunch();
ok("clearPendingLaunch clears a pending app", !has(CONTINUE_KEY));
reset(); recordLaunch({ kind: "url", id: "https://www.netflix.com/" }); clearPendingLaunch();
ok("clearPendingLaunch clears a pending link", !has(CONTINUE_KEY));
reset(); localStorage.setItem("brain-math-game-state", "{}"); recordBuiltInLeft("game", "brainmath"); clearPendingLaunch();
ok("clearPendingLaunch leaves a returned game record", getVisibleActivity()?.kind === "game");
reset(); recordLaunch(YT); markReturned(); clearPendingLaunch();
ok("clearPendingLaunch leaves an app the patient came back from", getVisibleActivity()?.id === YT.id);

console.log("\n— games and tools —");
reset();
recordBuiltInLeft("game", "brainmath");
ok("game not recorded without a save", getVisibleActivity() === null);
localStorage.setItem("brain-math-game-state", "{}");
recordBuiltInLeft("game", "brainmath");
ok("game recorded with a save", getVisibleActivity()?.kind === "game");

reset(); localStorage.setItem("simon-game-state", "{}"); recordBuiltInLeft("game", "simonsays");
localStorage.setItem("reaction-speed-classic-state", "{}"); recordBuiltInLeft("game", "reactiontime");
ok("excluded games never recorded", getVisibleActivity() === null);

reset(); localStorage.setItem("memory-match-hard-state", "{}");
ok("multi-difficulty save detected", hasResumableSave("game", "memory") === true);

reset(); localStorage.setItem("tictactoe-game-state", JSON.stringify({ squares: Array(9).fill(null) }));
const empty = hasResumableSave("game", "tictactoe");
localStorage.setItem("tictactoe-game-state", JSON.stringify({ squares: ["X", ...Array(8).fill(null)] }));
ok("tictactoe empty board not resumable, played board is", empty === false && hasResumableSave("game", "tictactoe") === true);

reset(); localStorage.setItem("tictactoe-game-state", JSON.stringify({ squares: ["X", "X", "X", "O", "O", null, null, null, null] }));
recordBuiltInLeft("game", "tictactoe");
ok("tictactoe won board not resumable", hasResumableSave("game", "tictactoe") === false && getVisibleActivity() === null);
reset(); localStorage.setItem("tictactoe-game-state", JSON.stringify({ squares: ["X", "O", "X", "X", "O", "O", "O", "X", "X"] }));
recordBuiltInLeft("game", "tictactoe");
ok("tictactoe full drawn board not resumable", hasResumableSave("game", "tictactoe") === false && getVisibleActivity() === null);

reset(); localStorage.setItem("brain-math-game-state", "{}"); recordBuiltInLeft("game", "brainmath");
localStorage.removeItem("brain-math-game-state");
ok("finished game hides card", getVisibleActivity() === null);

reset();
localStorage.setItem("word-search-easy-en-state", JSON.stringify({ timestamp: 1 }));
localStorage.setItem("word-search-hard-ar-state", JSON.stringify({ timestamp: 5 }));
ok("latestSaveKey picks newest", latestSaveKey("wordsearch") === "word-search-hard-ar-state");
ok("latestSaveKey unknown game is null", latestSaveKey("nope") === null);

reset(); localStorage.setItem("careinn-tool-notes", "x");
ok("tool resumable when key exists", hasResumableSave("tool", "notes") && !hasResumableSave("tool", "stopwatch"));

console.log("\n— autoResume save guard —");
const hasCards = (s: any) => Array.isArray(s.cards);
reset(); localStorage.setItem("memory-match-hard-state", JSON.stringify({ cards: [] })); localStorage.setItem("memory-match-easy-state", "{oops");
ok("usableSave keeps a good save", usableSave("memory-match-hard-state", hasCards) && has("memory-match-hard-state"));
ok("usableSave removes a corrupt save, only that key", !usableSave("memory-match-easy-state", hasCards) && !has("memory-match-easy-state") && has("memory-match-hard-state"));
reset(); localStorage.setItem("emoji-match-game-state", JSON.stringify({ score: 3 }));
ok("usableSave removes a partial save", !usableSave("emoji-match-game-state", (s) => Array.isArray(s.leftEmojis)) && !has("emoji-match-game-state"));
reset(); localStorage.setItem("brain-math-game-state", "null");
let guardThrew = false, guardOk = true;
try { guardOk = usableSave("brain-math-game-state", (s) => Array.isArray(s.equation.options)); } catch { guardThrew = true; }
ok("usableSave survives a check that throws", !guardThrew && !guardOk && !has("brain-math-game-state"));
reset();
ok("usableSave with no save is false", !usableSave("wordchain-game-state", () => true));

console.log("\n— app lock —");
reset(); recordLaunch({ ...YT, lockId: "youtube" }); markReturned();
ok("app lockId recorded and returned", getVisibleActivity()?.lockId === "youtube");
reset(); recordLaunch({ kind: "url", id: "https://www.bbc.com/", lockId: "shortcut.news" }); markReturned();
ok("url lockId recorded and returned", getVisibleActivity()?.lockId === "shortcut.news");
reset(); recordLaunch(YT); markReturned();
ok("no lockId when the launch has none", getVisibleActivity() !== null && getVisibleActivity()?.lockId === undefined);
reset(); localStorage.setItem("careinn-tool-notes", "x"); recordBuiltInLeft("tool", "notes");
ok("tool lock id is its own id", getVisibleActivity()?.lockId === "notes");
reset(); localStorage.setItem("brain-math-game-state", "{}"); recordBuiltInLeft("game", "brainmath");
ok("game lock id is its own id", getVisibleActivity()?.lockId === "brainmath");

console.log("\n— patients —");
/* One real key per wipe prefix, as the games and tools write them. */
const PATIENT_DATA_KEYS = [
  "memory-match-hard-state", "memory-best-scores", "tictactoe-game-state", "sliding-puzzle-easy-state",
  "color-match-game-state", "color-match-high-score", "pattern-memory-game-state", "pattern-high-score",
  "emoji-match-game-state", "simon-game-state", "simon-high-score", "word-search-hard-ar-state",
  "reaction-speed-classic-state", "reaction-leaderboard", "brain-math-game-state", "brain-math-high-level",
  "trivia-quiz-game-state", "jigsaw-puzzle-hard-state", "wordchain-game-state", "wordchain-highscore",
  "game-lang-memory-match", "careinn-tool-notes", "careinn-tool-whiteboard", "careinn-tool-stopwatch",
];
reset(); applyLocation(A);
for (const k of [...PATIENT_DATA_KEYS, "careinn-api-config"]) localStorage.setItem(k, "{}");
recordBuiltInLeft("game", "brainmath");
const seeded = getVisibleActivity() !== null && PATIENT_DATA_KEYS.every(has);
applyLocation(B);
ok("patient change wipes card", seeded && getVisibleActivity() === null && !has(CONTINUE_KEY));
ok("patient change wipes every game/tool key",
  PATIENT_DATA_KEYS.filter(has).length === 0);
ok("patient change keeps unrelated keys and sets new patient",
  has("careinn-api-config") && has(PATIENT_KEY) && currentPatientKey() === "P2|R2");

reset(); applyLocation(A); localStorage.setItem("brain-math-game-state", "{}"); recordBuiltInLeft("game", "brainmath");
applyLocation({ patient_id: "", admit_data: "" });
ok("discharge to empty bed wipes", getVisibleActivity() === null && !has("brain-math-game-state"));

reset(); applyLocation(A); localStorage.setItem("brain-math-game-state", "{}"); recordBuiltInLeft("game", "brainmath");
applyLocation(null);
ok("failed fetch keeps state", getVisibleActivity() !== null);

reset(); localStorage.setItem("brain-math-game-state", "{}"); applyLocation(A);
ok("first location does not wipe", has("brain-math-game-state"));

reset(); recordLaunch(YT); markReturned();
ok("browser demo patient", getVisibleActivity()?.patientKey === "demo");

reset(); localStorage.setItem(CONTINUE_KEY, JSON.stringify({ kind: "app", id: "x", leftAt: 1, patientKey: "X|Y", returned: true }));
ok("other patient's record hidden", getVisibleActivity() === null);

reset(); localStorage.setItem(CONTINUE_KEY, "{oops");
let threw = false, v: unknown = 1;
try { v = getVisibleActivity(); } catch { threw = true; }
ok("corrupt record ignored", !threw && v === null);

console.log("\n— subscribe —");
reset(); let n = 0; const off = subscribe(() => { n++; });
recordLaunch(YT); clearActivity(); clearPatientActivity();
const counted = n; off(); recordLaunch(YT);
ok("subscribe notifies on launch, clear, patient clear", counted === 3);
ok("unsubscribe stops notifications", n === counted);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
