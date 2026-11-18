const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + __dirname + '/../installazione-3d.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => window.__install.hide(true));
  for (const [i, t] of [[9, 6], [10, 9], [11, 9], [14, 4]]) {
    await p.evaluate(([i, t]) => { window.__install.goto(i); window.__install.setTime(t); }, [i, t]);
    await p.waitForTimeout(2600);
    await p.screenshot({ path: process.argv[2] + `/hid-${i}.png` });
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
