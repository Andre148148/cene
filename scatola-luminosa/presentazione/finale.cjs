const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  for (const [h, o] of [['finale-progetto', 'scatola-luminosa-progetto-finale.pdf'], ['finale-tutorial', 'tutorial-montaggio-passo-passo.pdf']]) {
    await p.goto('file://' + __dirname + '/' + h + '.html'); await p.waitForTimeout(500);
    await p.pdf({ path: __dirname + '/' + o, width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true }); console.log(o); }
  await b.close(); })();
