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
  CONTINUE_KEY, applyLocation, recordLaunch, markReturned, recordBuiltInLeft,
  hasResumableSave, latestSaveKey, getVisibleActivity, clearActivity,
  clearPatientActivity, currentPatientKey, subscribe,
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

console.log("\n— patients —");
reset(); applyLocation(A); localStorage.setItem("brain-math-game-state", "{}"); recordBuiltInLeft("game", "brainmath");
for (const k of ["brain-math-high-score", "memory-best-scores", "game-lang-memory-match", "careinn-tool-notes", "wordchain-highscore", "careinn-api-config"])
  localStorage.setItem(k, "1");
applyLocation(B);
ok("patient change wipes card", getVisibleActivity() === null);
ok("patient change wipes game/tool keys",
  !["brain-math-game-state", "brain-math-high-score", "memory-best-scores", "game-lang-memory-match", "careinn-tool-notes", "wordchain-highscore"].some(has));
ok("patient change keeps unrelated keys and sets new patient", has("careinn-api-config") && currentPatientKey() === "P2|R2");

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
ok("subscribe notifies on launch, clear, patient clear", counted >= 3);
ok("unsubscribe stops notifications", n === counted);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
