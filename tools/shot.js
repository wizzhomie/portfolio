// Screenshot helper: node tools/shot.js [width] [outfile] [full]
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const width = Number(process.argv[2] || 1536);
  const out = process.argv[3] || `shots/desktop-${width}.png`;
  const full = process.argv[4] !== 'viewport';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: Math.round(width * 0.67) }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(process.env.URL || 'http://127.0.0.1:8790/index.html', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
  const clip = process.env.CLIP ? process.env.CLIP.split(',').map(Number) : null;
  if (clip) await page.screenshot({ path: out, clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3] } });
  else await page.screenshot({ path: out, fullPage: full });
  await browser.close();
  if (errs.length) console.log(errs.join('\n')); else console.log('ok', out);
})();
