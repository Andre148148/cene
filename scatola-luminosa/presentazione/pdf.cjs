const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + __dirname + '/index.html');
  await p.waitForTimeout(800);
  await p.pdf({ path: __dirname + '/scatola-luminosa-presentazione.pdf', width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  await b.close(); console.log('pdf ok');
})();
