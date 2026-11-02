/**
 * Patient PIN — logic tests (policy, service, client wrapper).
 *
 * Run with: npm run test:pin
 *
 * Same approach as test:reload: esbuild bundles this file, node runs it, a
 * non-zero exit means something regressed. Covers acceptance tests 4, 6, 9,
 * 10, 11 (service side) and 13 (storage / console) at the logic level; the
 * UI-level checks run separately in the browser harness.
 */
import { testLocalStorage, testSessionStorage, consoleRecord } from "./pinTestSetup";
import { isWeakPin, validateNewPin } from "../pinPolicy";
import { MockPinService } from "../MockPinService";
import {
  getPinService, setPinServiceImpl, setPinRequestTimeoutForTests,
  isPinOnline, retryPinConnection, purgeLegacyPinHash, bindPinPatient,
} from "../pinClient";
import { pinSession } from "../pinSession";
import { PIN_LENGTH, PIN_STORAGE_KEYS, LEGACY_PIN_HASH_KEY } from "../pinConfig";

let pass = 0, fail = 0;
const out = (s: string) => process.stdout.write(s + "\n");
const ok = (name: string, cond: boolean) => {
  if (cond) { pass++; out("  PASS  " + name); }
  else { fail++; out("  FAIL  " + name); }
};

const GOOD_PIN = "739204";
const OTHER_GOOD = "285714";
const usedPins = new Set<string>([GOOD_PIN, OTHER_GOOD]);

let clock = 1_000_000;
const newMock = () => new MockPinService({ latencyMs: 0, now: () => clock, storage: testLocalStorage });
const svc = getPinService();

async function main() {
  out("\n— PIN format and strength —");
  ok("PIN_LENGTH is 6", PIN_LENGTH === 6);
  for (const weak of ["000000", "111111", "123456", "654321", "121212", "123123", "112233", "901234", "998877"]) {
    ok(`${weak} is rejected as weak`, isWeakPin(weak) && validateNewPin(weak) === "weak");
  }
  for (const fine of [GOOD_PIN, OTHER_GOOD, "130927"]) {
    ok(`${fine} is accepted`, validateNewPin(fine) === null);
  }
  ok("5 digits rejected (length)", validateNewPin("73920") === "length");
  ok("7 digits rejected (length)", validateNewPin("7392041") === "length");
  ok("letters rejected", validateNewPin("73a204") === "non-numeric");

  out("\n— setup saves only on service success —");
  let mock = newMock();
  setPinServiceImpl(mock);
  let r = await svc.setPin("123456");
  ok("weak PIN: service refuses", !r.ok && r.error === "invalid");
  r = await svc.setPin("12345");
  ok("short PIN: service refuses", !r.ok && r.error === "invalid");
  let ls = await svc.getLockState();
  ok("nothing saved after refusals", ls.ok && !ls.value.hasPin);

  mock.failNext("network");
  r = await svc.setPin(GOOD_PIN);
  ok("network drop on save → error, not success", !r.ok && r.error === "network");
  ok("network drop marks PIN service offline", !isPinOnline());
  r = await svc.setPin(GOOD_PIN);
  ok("while offline, setPin is refused without calling the service", !r.ok && r.error === "offline");
  await retryPinConnection();
  ok("retry recovers once the service answers", isPinOnline());
  ls = await svc.getLockState();
  ok("no PIN exists after the failed save", ls.ok && !ls.value.hasPin);

  setPinRequestTimeoutForTests(30);
  mock.failNext("hang");
  r = await svc.setPin(GOOD_PIN);
  ok("hung save → timeout, not success", !r.ok && r.error === "timeout");
  setPinRequestTimeoutForTests(10_000);

  r = await svc.setPin(GOOD_PIN);
  ok("good PIN saves", r.ok);
  ok("session learns hasPin", pinSession.get().hasPin === true);
  ok("session still locked after setup", pinSession.get().unlocked === false);

  out("\n— verify —");
  r = await svc.verifyPin(GOOD_PIN);
  ok("correct PIN unlocks", r.ok && pinSession.get().unlocked);
  pinSession.lock();

  mock.failNext("network");
  r = await svc.verifyPin(GOOD_PIN);
  ok("network drop on verify → error, still locked", !r.ok && !pinSession.get().unlocked);
  r = await svc.verifyPin(GOOD_PIN);
  ok("offline → no PIN check at all", !r.ok && r.error === "offline" && !pinSession.get().unlocked);
  await retryPinConnection();

  out("\n— lockout —");
  for (let i = 1; i <= 4; i++) {
    r = await svc.verifyPin(OTHER_GOOD);
    ok(`wrong attempt ${i} → generic "wrong"`, !r.ok && r.error === "wrong");
  }
  r = await svc.verifyPin(OTHER_GOOD);
  const firstLock = !r.ok ? r.lock?.lockedUntil ?? 0 : 0;
  ok("5th wrong attempt → locked", !r.ok && r.error === "locked");
  ok("first lock is 30 s", firstLock - clock === 30_000);
  r = await svc.verifyPin(GOOD_PIN);
  ok("correct PIN refused while locked", !r.ok && r.error === "locked");

  // Simulate a page refresh: new service instance, same storage.
  mock = newMock();
  setPinServiceImpl(mock);
  ls = await svc.getLockState();
  ok("lock survives a refresh", ls.ok && ls.value.lockedUntil === firstLock);
  r = await svc.verifyPin(GOOD_PIN);
  ok("still refused after refresh", !r.ok && r.error === "locked");

  clock += 30_000;
  r = await svc.verifyPin(GOOD_PIN);
  ok("mock lost its in-memory PIN on refresh → 'unavailable', never success", !r.ok && r.error === "unavailable");

  // Progressive delays on one instance that keeps its record.
  mock = newMock();
  setPinServiceImpl(mock);
  await svc.setPin(GOOD_PIN);
  const lockFor = async () => {
    let last: any;
    for (let i = 0; i < 5; i++) last = await svc.verifyPin(OTHER_GOOD);
    const ms = (last.lock?.lockedUntil ?? 0) - clock;
    clock += ms;
    return ms;
  };
  ok("lock 1 = 30 s", (await lockFor()) === 30_000);
  ok("lock 2 = 1 min", (await lockFor()) === 60_000);
  ok("lock 3 = 5 min", (await lockFor()) === 300_000);
  ok("lock 4 = 5 min (no permanent lock)", (await lockFor()) === 300_000);
  r = await svc.verifyPin(GOOD_PIN);
  ok("correct PIN works after the lock expires", r.ok);
  ls = await svc.getLockState();
  ok("success resets the counter", ls.ok && ls.value.failedAttempts === 0 && ls.value.lockedUntil === null);

  out("\n— forgot PIN / discharge —");
  r = await svc.requestReset();
  ok("reset removes the PIN and relocks", r.ok && pinSession.get().hasPin === false && !pinSession.get().unlocked);
  await svc.setPin(GOOD_PIN);
  await svc.verifyPin(GOOD_PIN);
  window.dispatchEvent(new Event("offline"));
  await svc.clearOnDischarge();
  ok("discharge works offline", true);
  ok("discharge clears PIN-related storage", testLocalStorage.getItem(PIN_STORAGE_KEYS.mockServerState) === null);
  ok("discharge resets the session", !pinSession.get().unlocked && pinSession.get().hasPin === null);
  window.dispatchEvent(new Event("online"));
  await retryPinConnection();
  ls = await svc.getLockState();
  ok("new patient starts with no PIN", ls.ok && !ls.value.hasPin);

  out("\n— patient binding (logout / room change / new patient) —");
  const settle = () => new Promise(r => setTimeout(r, 0));
  mock = newMock();
  setPinServiceImpl(mock);
  bindPinPatient("00-284619");
  await settle();
  await svc.setPin(GOOD_PIN);
  await svc.verifyPin(GOOD_PIN);
  const owner = testLocalStorage.getItem(PIN_STORAGE_KEYS.owner) ?? "";
  ok("owner recorded", owner.length > 0);
  ok("owner key does not contain the MRN", !owner.includes("284619"));

  pinSession.lock(); // what logout() does
  bindPinPatient("00-284619"); // same patient signs back in
  await settle();
  ls = await svc.getLockState();
  ok("same patient after logout: PIN kept", ls.ok && ls.value.hasPin);
  ok("same patient after logout: starts locked", !pinSession.get().unlocked);
  bindPinPatient("284619"); // same MRN, different formatting (room/bed change refresh)
  await settle();
  ls = await svc.getLockState();
  ok("same MRN written differently: PIN kept", ls.ok && ls.value.hasPin);
  r = await svc.verifyPin(GOOD_PIN);
  ok("same patient can still unlock", r.ok);

  bindPinPatient("55-000111"); // a different patient on this screen
  await settle();
  ok("new patient: session reset", !pinSession.get().unlocked && pinSession.get().hasPin === null);
  ls = await svc.getLockState();
  ok("new patient: inherits no PIN", ls.ok && !ls.value.hasPin);
  r = await svc.verifyPin(GOOD_PIN);
  ok("new patient: old patient's PIN does not unlock", !r.ok);
  ok("new patient: now owns the PIN state", testLocalStorage.getItem(PIN_STORAGE_KEYS.owner) !== owner);

  testLocalStorage.setItem(LEGACY_PIN_HASH_KEY, JSON.stringify({ pinHash: "x", pinSalt: "y" }));
  purgeLegacyPinHash();
  ok("legacy 4-digit PIN hash is purged", testLocalStorage.getItem(LEGACY_PIN_HASH_KEY) === null);

  out("\n— the PIN never leaks —");
  await svc.setPin(GOOD_PIN);
  await svc.verifyPin(GOOD_PIN);
  await svc.verifyPin(OTHER_GOOD);
  const stored = [...testLocalStorage.entries(), ...testSessionStorage.entries()].map(([k, v]) => k + "=" + v).join("\n");
  const logged = consoleRecord.join("\n");
  for (const p of usedPins) {
    ok(`${p} not in localStorage/sessionStorage`, !stored.includes(p));
    ok(`${p} not in console output`, !logged.includes(p));
  }

  out(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { out("CRASH " + (e?.stack || e)); process.exit(1); });
