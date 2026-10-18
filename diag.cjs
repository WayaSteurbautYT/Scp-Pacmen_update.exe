const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 300)); });
  await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' }).catch(e => errs.push('NAV: ' + e.message));
  await p.waitForTimeout(2500);
  const s = await p.evaluate(() => {
    const r = {};
    r.introHidden = document.getElementById('intro-screen')?.hidden;
    r.setupHidden = document.getElementById('setup-screen')?.hidden;
    r.skillsHidden = document.getElementById('skills-screen')?.hidden;
    const btn = document.getElementById('creation-next');
    if (btn) {
      const bb = btn.getBoundingClientRect();
      r.nextRect = { x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.width), h: Math.round(bb.height) };
      const h = document.elementFromPoint(bb.x + bb.width / 2, bb.y + bb.height / 2);
      r.nextHit = h ? (h.id || (h.className + '<' + h.tagName + '>')) : 'none';
    }
    r.race = document.getElementById('race-picker')?.dataset.team;
    r.stage = document.getElementById('setup-screen')?.dataset.setupStep;
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const el = document.elementFromPoint(cx, cy);
    r.centerHit = el ? (el.id || (el.className + '<' + el.tagName + '>')) : 'none';
    return r;
  });
  console.log(JSON.stringify(s, null, 2));
  console.log('ERRORS:');
  errs.slice(0, 10).forEach(e => console.log(e));
  await b.close();
})();
