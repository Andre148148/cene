const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + __dirname + '/guida.html'); await p.waitForTimeout(400);
  await p.pdf({ path: __dirname + '/guida-collegamenti-passo-passo.pdf', width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  await b.close(); console.log('pdf ok'); })();
