/**
 * The gate that decides whether a waiting update may take the page.
 *
 * Run with: npm run test:reload
 *
 * No test runner in this project, so this is a script: esbuild bundles it,
 * node runs it, a non-zero exit means something regressed. The one thing it
 * has to keep proving is that a half-built meal order or an open form is
 * never thrown away by an update arriving behind it — including when the tab
 * is switched away from, which used to be treated as permission.
 */
import {
  holdReload, releaseReload, isSafeToReload, reloadBlockers, subscribeHolds,
} from "../reloadSafety";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name); }
};

/* The gate as updateCheck applies it: an update is installed and waiting, and
   the page reloads only when nothing is holding it. */
let reloads = 0;
let updateReady = false;
const applyOrWait = () => {
  if (!updateReady) return;
  if (!isSafeToReload()) return;   // held: stays pending, nothing is lost
  reloads++;
};
subscribeHolds(applyOrWait);

console.log("\n— an idle screen —");
ok("safe with no holds", isSafeToReload());
updateReady = true; applyOrWait();
ok("a waiting update is taken immediately", reloads === 1);

console.log("\n— a half-built meal order —");
reloads = 0; updateReady = true;
holdReload("food-ordering", "meal order in progress");
ok("not safe while the order is open", !isSafeToReload());
applyOrWait();
ok("the update does NOT reload the page", reloads === 0);
ok("it can say what it is waiting for", reloadBlockers().includes("meal order in progress"));

console.log("\n— switching tabs while that order is open —");
// visibilitychange only asks the worker for an update; it never reloads.
// Nothing here changes the holds, so nothing changes the outcome.
applyOrWait(); applyOrWait();
ok("still no reload after tab switches", reloads === 0);
ok("the order is still holding", !isSafeToReload());

console.log("\n— the patient sends the order —");
releaseReload("food-ordering");
ok("safe once the order is gone", isSafeToReload());
ok("the update is taken at that moment", reloads === 1);

console.log("\n— a form open on top of an order —");
reloads = 0; updateReady = true;
holdReload("food-ordering", "meal order in progress");
holdReload("preference-form", "preferences form open");
applyOrWait();
ok("two holds, no reload", reloads === 0);
releaseReload("preference-form");
applyOrWait();
ok("one hold left, still no reload", reloads === 0);
releaseReload("food-ordering");
ok("reloads only when the last hold goes", reloads === 1);

console.log("\n— a hold released twice, or never taken —");
reloads = 0; updateReady = true;
releaseReload("never-held");
ok("releasing an unknown id is harmless", isSafeToReload());
holdReload("x", "a"); holdReload("x", "a");
ok("the same hold twice is still one hold", !isSafeToReload());
releaseReload("x");
ok("and one release clears it", isSafeToReload());

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
