// Usage: node shot.mjs <outfile> [jsToEvalBeforeShot]
import { chromium } from 'playwright';

const out = process.argv[2] || '/tmp/shot.png';
const pre = process.argv[3] || '';
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForTimeout(4500);
if (pre) { await page.evaluate(pre); await page.waitForTimeout(1500); }
await page.screenshot({ path: out });
console.log(logs.slice(0, 25).join('\n') || 'no console errors');
await browser.close();
