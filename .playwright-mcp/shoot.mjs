// Visual QA screenshots against the LOCAL dev server (real API, no mocks).
// 1. LOCAL_ONLY=1 bun run dev        (http://localhost:5173)
// 2. bash scripts/seed-local.sh      (fixtures + QA admin qa@zephyron.test; password from $QA_PASSWORD)
// 3. node .playwright-mcp/shoot.mjs [--routes /app/browse ...] [--themes dark light]
//      [--widths 1440 390] [--full] [--prefix p-] [--out DIR] [--wait ms]
//      [--click "css" ...] [--scroll px] [--ls key=value ...] [--base URL] [--relogin]
// Themes: light ink rose_pine_dawn dark darker oled rose_pine kanagawa_dragon (default: dark).
// Default routes: main app pages plus seeded ids qa-art-01, qa-evt-01, qa-set-01.
// Sign-in cookies are cached in .playwright-mcp/qa-storage.json (--relogin refreshes them).
// Consent, onboarding and what's-new are pre-dismissed via localStorage on every page.
// Output: <out>/<prefix><theme>-<width>-<slug>.png and <out>/<prefix>report.json
//   (per shot: console errors, page errors, failed requests, HTTP >= 400 responses).
// Shots, storageState and logs are gitignored; do not commit them. Local dev server only.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PW = '/home/tomas/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core/index.mjs';
const CHROME = '/home/tomas/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell';
const { chromium } = await import(PW);

const THEME_IDS = ['light', 'ink', 'rose_pine_dawn', 'dark', 'darker', 'oled', 'rose_pine', 'kanagawa_dragon'];
const QA = { email: 'qa@zephyron.test', password: process.env.QA_PASSWORD || 'qa-' + createHash('sha256').update('zephyron-local').digest('hex').slice(0, 12) };
const STATE_FILE = '.playwright-mcp/qa-storage.json';

// ---------- args ----------
const argv = process.argv.slice(2);
const opts = {
  base: 'http://localhost:5173', out: '.playwright-mcp/shots/qa-local', prefix: '',
  routes: ['/', '/login', '/app', '/app/browse', '/app/artists', '/app/artists/qa-art-01', '/app/events',
    '/app/events/qa-evt-01', '/app/sets/qa-set-01', '/app/search?q=a', '/app/playlists', '/app/profile',
    '/app/admin', '/app/liked-songs', '/app/history', '/app/activity', '/app/community'],
  themes: ['dark'], widths: [1440], full: false, ls: [], click: [], wait: 900, scroll: 0, relogin: false,
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const many = () => { const v = []; while (argv[i + 1] && !argv[i + 1].startsWith('--')) v.push(argv[++i]); return v; };
  if (a === '--base') opts.base = argv[++i];
  else if (a === '--out') opts.out = argv[++i];
  else if (a === '--prefix') opts.prefix = argv[++i];
  else if (a === '--routes') opts.routes = many();
  else if (a === '--themes') opts.themes = many();
  else if (a === '--widths') opts.widths = many().map(Number);
  else if (a === '--full') opts.full = true;
  else if (a === '--ls') opts.ls.push(...many());
  else if (a === '--click') opts.click.push(...many());
  else if (a === '--wait') opts.wait = Number(argv[++i]);
  else if (a === '--scroll') opts.scroll = Number(argv[++i]);
  else if (a === '--relogin') opts.relogin = true;
  else throw new Error(`unknown arg ${a}`);
}
const badTheme = opts.themes.find((t) => !THEME_IDS.includes(t));
if (badTheme) throw new Error(`unknown theme "${badTheme}". Valid: ${THEME_IDS.join(' ')}`);

const appVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

// ---------- auth: sign in once against the local API, cache cookies as storageState ----------
async function sessionValid(cookieHeader) {
  const r = await fetch(`${opts.base}/api/auth/get-session`, { headers: { cookie: cookieHeader, origin: opts.base } });
  if (!r.ok) return false;
  const j = await r.json().catch(() => null);
  return Boolean(j?.user);
}

async function ensureStorageState() {
  if (!opts.relogin && existsSync(STATE_FILE)) {
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    const header = state.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    if (await sessionValid(header)) return state;
    console.log('stored session expired, signing in again');
  }
  const r = await fetch(`${opts.base}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: opts.base },
    body: JSON.stringify({ email: QA.email, password: QA.password }),
  });
  if (!r.ok) throw new Error(`sign-in failed (HTTP ${r.status}): ${(await r.text()).slice(0, 200)}. Run scripts/seed-local.sh first.`);
  const setCookies = r.headers.getSetCookie();
  const cookies = setCookies.map((sc) => {
    const [pair, ...attrs] = sc.split(';').map((s) => s.trim());
    const eq = pair.indexOf('=');
    const flags = attrs.map((a) => a.toLowerCase());
    return {
      name: pair.slice(0, eq), value: pair.slice(eq + 1), domain: 'localhost', path: '/',
      expires: -1, httpOnly: flags.includes('httponly'), secure: false, sameSite: 'Lax',
    };
  }).filter((c) => c.name.includes('session_token'));
  if (!cookies.length) throw new Error('sign-in returned no session cookie');
  const state = { cookies, origins: [] };
  mkdirSync('.playwright-mcp', { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`signed in as ${QA.email}, saved ${STATE_FILE}`);
  return state;
}

// ---------- run ----------
const slug = (r) => (r === '/' ? 'root' : r.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/_$/, ''));
mkdirSync(opts.out, { recursive: true });
const storageState = await ensureStorageState();
const browser = await chromium.launch({ executablePath: CHROME });
const report = [];

for (const theme of opts.themes) {
  for (const width of opts.widths) {
    const mobile = width < 700;
    const ctx = await browser.newContext({
      viewport: { width, height: mobile ? 844 : 960 },
      deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile,
      reducedMotion: 'no-preference',
      storageState,
    });
    // Pre-dismiss the first-run UI so it never covers screenshots.
    await ctx.addInitScript(({ theme, ls, version }) => {
      localStorage.setItem('zephyron_settings', JSON.stringify({ theme }));
      localStorage.setItem('zephyron_cookie_consent', 'declined');
      localStorage.setItem('zephyron_onboarding_done', '1');
      localStorage.setItem('zephyron_last_seen_version', version);
      for (const kv of ls) { const i = kv.indexOf('='); localStorage.setItem(kv.slice(0, i), kv.slice(i + 1)); }
    }, { theme, ls: opts.ls, version: appVersion });

    const page = await ctx.newPage();
    for (const r of opts.routes) {
      const errors = [];
      const failed = [];
      const onConsole = (m) => { if (m.type() === 'error') errors.push(m.text()); };
      const onPageErr = (e) => errors.push('pageerror: ' + e.message);
      const onFailed = (req) => failed.push(`${req.method()} ${req.url()} ${req.failure()?.errorText ?? ''}`.trim());
      const onResponse = (res) => { if (res.status() >= 400) failed.push(`${res.status()} ${res.request().method()} ${res.url()}`); };
      page.on('console', onConsole);
      page.on('pageerror', onPageErr);
      page.on('requestfailed', onFailed);
      page.on('response', onResponse);

      await page.goto(opts.base + r, { waitUntil: 'networkidle' }).catch((e) => errors.push('goto: ' + e.message));
      for (const sel of opts.click) {
        await page.click(sel, { timeout: 3000 }).catch((e) => errors.push(`click ${sel}: ${e.message.split('\n')[0]}`));
        await page.waitForTimeout(250);
      }
      if (opts.scroll) await page.mouse.wheel(0, opts.scroll);
      await page.waitForTimeout(opts.wait);

      const file = join(opts.out, `${opts.prefix}${theme}-${width}-${slug(r)}.png`);
      await page.screenshot({ path: file, fullPage: opts.full });
      page.off('console', onConsole);
      page.off('pageerror', onPageErr);
      page.off('requestfailed', onFailed);
      page.off('response', onResponse);

      const finalUrl = page.url().replace(opts.base, '');
      report.push({ file, route: r, finalUrl, theme, width, consoleErrors: errors, failedRequests: failed });
      const bad = errors.length + failed.length;
      console.log(`${bad ? '!!' : 'ok'} ${r} -> ${finalUrl}  ${file}${bad ? `  [${errors.length} console, ${failed.length} net]` : ''}`);
    }
    await ctx.close();
  }
}
await browser.close();
writeFileSync(join(opts.out, `${opts.prefix}report.json`), JSON.stringify(report, null, 2));
console.log(`report: ${join(opts.out, `${opts.prefix}report.json`)}`);
