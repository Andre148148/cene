const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1131 } });
  await p.goto('file://' + __dirname + '/giro.html'); await p.screenshot({ path: __dirname + '/img/giro-strisce.png' }); await b.close(); console.log('png ok'); })();
