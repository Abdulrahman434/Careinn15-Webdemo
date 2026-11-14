// Open the CareInn demo as a hospital, optionally open a screen, measure it and screenshot it.
//
//   node shoot.mjs --hospital burjeel --open Feedback --measure ".sm-card,.sm-hub-row" --out /tmp/x.png
//
// Options
//   --url       dev server (default http://localhost:5173/)
//   --hospital  config id: burjeel | dallah | slh | caremed | dsfh | imc | careinn (default burjeel)
//   --size      WxH (default 1920x1080; portrait e.g. 1080x1920)
//   --lang      en | ar (default en) — taps the language pill in the top bar
//   --dark      dark mode
//   --open      text of the home tile/button to tap, e.g. "Feedback" (regex, matched against button text)
//   --tap       CSS selector to tap after opening (repeatable), e.g. ".sm-card:nth-child(1)"
//   --press     CSS selector to hold down (shows the pressed state) before the shot
//   --mock      path to a JS file run in the page before measuring (for mock-ups); it gets `document`
//   --measure   comma-separated CSS selectors; every match is printed with its box and key styles
//   --out       screenshot path (PNG). Omit to only measure.
//   --wait      ms to wait after each step (default 1500)
//
// Needs puppeteer-core and a Chrome. Install puppeteer-core outside the repo (the repo's
// dependency list is fixed): npm i --prefix "$SCRATCH/pptr" puppeteer-core@23.11.1
// then run with NODE_PATH="$SCRATCH/pptr/node_modules". Chrome is found from $CHROME_PATH,
// ~/.cache/puppeteer, or the installed Google Chrome.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { homedir } from 'node:os';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const args = { tap: [] };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  if (k === 'dark') { args.dark = true; continue; }
  const v = argv[++i];
  if (k === 'tap') args.tap.push(v); else args[k] = v;
}
const url = args.url || 'http://localhost:5173/';
const hospital = args.hospital || 'burjeel';
const [W, H] = (args.size || '1920x1080').split('x').map(Number);
const WAIT = Number(args.wait || 1500);
const wait = (ms = WAIT) => new Promise(r => setTimeout(r, ms));

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cache = join(homedir(), '.cache/puppeteer/chrome');
  if (existsSync(cache)) {
    for (const v of readdirSync(cache).sort().reverse()) {
      for (const rel of [
        'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-linux64/chrome', 'chrome-win64/chrome.exe']) {
        const p = join(cache, v, rel); if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'])
    if (existsSync(p)) return p;
  throw new Error('No Chrome found. Set CHROME_PATH or run: npx @puppeteer/browsers install chrome@stable');
}

const browser = await puppeteer.launch({ executablePath: findChrome(), headless: 'new', defaultViewport: { width: W, height: H, deviceScaleFactor: 1 } });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

// Log in as the hospital and skip first-run tips.
await page.evaluate((hospital, dark) => {
  const full = hospital === 'careinn';
  localStorage.setItem('hbs-auth-v1', JSON.stringify({ isAuthenticated: true, password: hospital, lockedHospitalId: full ? null : hospital, isFullAccess: full, isGuest: false }));
  localStorage.setItem('active-hospital-id', hospital);
  localStorage.setItem('hbs-active-config-id', hospital);
  localStorage.setItem('hbs-tour-seen', '1');
  localStorage.setItem('careinn-onboarding-complete', 'true');
  localStorage.setItem('careinn-has-seen-app-lock-tutorial', 'true');
  localStorage.setItem('hbs-dark-mode', dark ? 'true' : 'false');
}, hospital, !!args.dark);
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await wait(2000);

// Real mouse taps (some tiles ignore synthetic .click()).
async function tapWhere(fn, arg) {
  const pt = await page.evaluate(fn, arg);
  if (!pt) return false;
  await page.mouse.click(pt.x, pt.y);
  await wait();
  return true;
}
const byText = (src) => {
  const rx = new RegExp(src);
  const el = [...document.querySelectorAll('button,[role=button]')]
    .filter(b => b.offsetParent && b.innerText.trim().length < 40 && rx.test(b.innerText.trim()))
    .sort((a, b) => a.innerText.length - b.innerText.length)[0];
  if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};
const bySel = (sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};

if (args.lang === 'ar' && !(await tapWhere(byText, '^AR$'))) console.error('language pill "AR" not found');
if (args.open && !(await tapWhere(byText, args.open))) console.error(`nothing to open matching /${args.open}/`);
for (const sel of args.tap) if (!(await tapWhere(bySel, sel))) console.error(`tap: ${sel} not found`);

if (args.mock) { await page.evaluate(readFileSync(args.mock, 'utf8')); await wait(500); }

if (args.press) {
  const pt = await page.evaluate(bySel, args.press);
  if (pt) { await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await wait(400); }
}

if (args.measure) {
  const out = await page.evaluate((sels) => sels.split(',').map(s => s.trim()).filter(Boolean).map(sel => ({
    sel,
    items: [...document.querySelectorAll(sel)].map(el => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return {
        box: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)}`,
        padding: s.padding, radius: s.borderRadius, bg: s.backgroundColor, border: s.border, shadow: s.boxShadow,
        font: `${s.fontSize} ${s.fontWeight} lh ${s.lineHeight} ${s.color} ${s.fontFamily.split(',')[0]}`,
      };
    }),
  })), args.measure);
  for (const { sel, items } of out) {
    console.log(`\n${sel}  (${items.length})`);
    items.forEach((it, i) => console.log(`  [${i}] ${JSON.stringify(it)}`));
  }
}

if (args.out) { await page.screenshot({ path: args.out }); console.log(`\nsaved ${args.out}`); }
await browser.close();
