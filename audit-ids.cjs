const fs = require('fs');
const path = require('path');
function listJs(dir, out=[]) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listJs(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const html = fs.readFileSync('index.html','utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const files = listJs('src');
const missing = {};
for (const f of files) {
  const t = fs.readFileSync(f,'utf8');
  const refs = new Set();
  for (const m of t.matchAll(/\$\("#([^"]+)"\)/g)) refs.add(m[1]);
  for (const m of t.matchAll(/getElementById\("([^"]+)"\)/g)) refs.add(m[1]);
  for (const r of refs) {
    if (!ids.has(r)) { (missing[f] = missing[f] || []).push(r); }
  }
}
console.log('HTML id count: ' + ids.size);
for (const k of Object.keys(missing)) console.log(k + ' MISSING: ' + missing[k].join(','));
console.log('DONE');
