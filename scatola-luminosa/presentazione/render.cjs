const { chromium } = require('playwright');
const out = __dirname + '/img/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await p.goto('file://' + __dirname + '/../scatola-luminosa.html');
  await p.addStyleTag({ content: '#panel,#switchbar{display:none!important} .lbl{font-size:15px!important}' });
  await p.waitForTimeout(1500);
  const cam = async (pos, tgt) => p.evaluate(([pos, tgt]) => { const {camera, controls} = window.__cam; camera.position.set(...pos); controls.target.set(...tgt); controls.update(); }, [pos, tgt]);
  const wait = ms => p.waitForTimeout(ms);
  const setOn = async on => p.evaluate(on => { window.__state.on = on; }, on);

  await cam([-760, 430, 1450], [0, 0, 40]);
  await setOn(true); await wait(2500); await p.screenshot({ path: out + 'acceso.png' });
  await setOn(false); await wait(2500); await p.screenshot({ path: out + 'spento.png' });
  await setOn(true);
  await p.evaluate(() => { document.getElementById('inside').checked = true; document.getElementById('inside').dispatchEvent(new Event('change')); });
  await cam([-900, 700, 1500], [0, 120, 60]); await wait(3500); await p.screenshot({ path: out + 'interno.png' });
  await p.evaluate(() => { document.getElementById('inside').checked = false; document.getElementById('inside').dispatchEvent(new Event('change')); });
  await wait(500);
  await p.evaluate(() => { document.getElementById('section').checked = true; document.getElementById('section').dispatchEvent(new Event('change')); });
  await wait(5000);
  await cam([330, 60, 225], [0, 40, 225]); await wait(1500); await p.screenshot({ path: out + 'sezione.png' });
  await b.close(); console.log('done');
})();
