/**
 * Screenshots the app at phone size so mobile/PWA layout can be inspected
 * rather than guessed at, and reports any element overflowing the viewport
 * horizontally — the failure mode that is easiest to ship by accident.
 *
 * Requires the dev server running with the auth bypass enabled:
 *
 *   AUTH_DEV_BYPASS=true NEXT_PUBLIC_AUTH_DEV_BYPASS=true bun run dev
 *   node scripts/ui-screenshots.mjs shots                      # all pages
 *   node scripts/ui-screenshots.mjs shots templates            # one page
 *   THEME=light node scripts/ui-screenshots.mjs shots-light    # light mode
 *   DEVICE=tablet node scripts/ui-screenshots.mjs shots-tablet # iPad
 *   DEVICE=desktop node scripts/ui-screenshots.mjs shots-wide
 *
 * Console errors (including hydration mismatches) are printed at the end.
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://localhost:3000';
const OUT = process.argv[2] ?? 'shots';
const ONLY = process.argv[3];

const THEME = process.env.THEME === 'light' ? 'light' : 'dark';

/** Phone is the primary target; the others catch breakpoint regressions. */
const VIEWPORTS = {
  phone: { ...devices['iPhone 13 Pro'], isMobile: true, hasTouch: true },
  tablet: { ...devices['iPad Mini'], isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
};

const DEVICE = VIEWPORTS[process.env.DEVICE ?? 'phone'] ?? VIEWPORTS.phone;

const PAGES = [
  ['dashboard', '/'],
  ['templates', '/templates'],
  ['progress', '/progress'],
  ['profile', '/profile'],
  ['personal-records', '/personal-records'],
  ['leaderboard', '/leaderboard'],
  ['session-log', '/session/log'],
  ['template-create', '/template/create'],
  ['profile-edit', '/profile/edit'],
];

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...DEVICE,
    colorScheme: THEME,
    locale: 'en-US',
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`.slice(0, 200)));

  // Sign in via the credentials dev-bypass provider.
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const bypass = page.getByRole('button', { name: /dev|bypass|sign in as/i }).first();
  if (await bypass.count()) {
    await bypass.click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {});
  }
  await page.waitForTimeout(2500);

  console.log(`after login → ${page.url()}  [${process.env.DEVICE ?? 'phone'} / ${THEME}]`);

  // next-themes defaults to `system`, which follows the emulated colorScheme.
  // Assert the class actually landed so a "light mode" run isn't silently dark.
  const rootClass = await page.evaluate(() => document.documentElement.className);
  console.log('html class:', rootClass || '(none)');

  for (const [name, route] of PAGES) {
    if (ONLY && !name.includes(ONLY)) continue;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      // Let entry animations and data settle.
      await page.waitForTimeout(2200);

      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      await page.screenshot({
        path: path.join(OUT, `${name}-full.png`),
        fullPage: true,
      });

      // Report anything overflowing the viewport horizontally — the classic
      // mobile layout failure.
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const bad = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > docWidth + 1 || r.left < -1) {
            bad.push(
              `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ` +
                `left:${Math.round(r.left)} right:${Math.round(r.right)} (vw ${docWidth})`
            );
          }
          if (bad.length > 6) break;
        }
        return {
          scrollW: document.documentElement.scrollWidth,
          clientW: docWidth,
          bad,
        };
      });

      const flag = overflow.scrollW > overflow.clientW ? ' ⚠ H-OVERFLOW' : '';
      console.log(`${name}: ${overflow.scrollW}/${overflow.clientW}${flag}`);
      overflow.bad.forEach((b) => console.log(`    ${b}`));
    } catch (err) {
      console.log(`${name}: FAILED ${err.message.slice(0, 120)}`);
    }
  }

  if (consoleErrors.length) {
    console.log('\n--- console errors ---');
    [...new Set(consoleErrors)].slice(0, 15).forEach((e) => console.log('  ' + e));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
