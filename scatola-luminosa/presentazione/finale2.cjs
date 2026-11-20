const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  for (const [k, o] of [['A', 'scatola-luminosa-A-con-traverso.pdf'], ['B', 'scatola-luminosa-B-senza-traverso.pdf']]) {
    await p.goto('file://' + __dirname + '/finale2-' + k + '.html'); await p.waitForTimeout(500);
    await p.pdf({ path: __dirname + '/' + o, width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true }); console.log(o); }
  await b.close(); })();
