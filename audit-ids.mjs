import fs from "node:fs";
const html = fs.readFileSync("index.html","utf8");
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const walk = (dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const p = dir+"/"+e.name;
  if(e.isDirectory()) return walk(p);
  return p.endsWith(".js")?[p]:[];
});
const files = walk("src");
const missing = {};
for(const f of files){
  const t = fs.readFileSync(f,"utf8");
  const refs = new Set();
  for(const m of t.matchAll(/\$\(\s*["']#([\w-]+)["']\s*\)/g)) refs.add(m[1]);
  for(const m of t.matchAll(/getElementById\(\s*["']([\w-]+)["']\s*\)/g)) refs.add(m[1]);
  for(const m of t.matchAll(/querySelector\(\s*["']#([\w-]+)["']/g)) refs.add(m[1]);
  const bad=[...refs].filter(id=>!ids.has(id));
  if(bad.length) missing[f]=bad;
}
console.log("HTML ids:",ids.size);
console.log(JSON.stringify(missing,null,2));
