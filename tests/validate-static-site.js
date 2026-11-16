const fs=require('node:fs');
const cp=require('node:child_process');

const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script[^>]+src=["']\.\/([^"'?]+\.js)(?:\?[^"']*)?["']/g)].map(match=>match[1]);

const cacheControlCount=(html.match(/<meta http-equiv="Cache-Control"/g)||[]).length;
if(cacheControlCount>1)throw new Error(`index.html has ${cacheControlCount} duplicate Cache-Control meta tags`);

if(!scripts.length)throw new Error('index.html does not load any JavaScript files');

for(const file of scripts){
  if(!fs.existsSync(file))throw new Error(`Missing script referenced by index.html: ${file}`);
  cp.execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
}

const app=scripts.find(file=>/^app(?:-|\.js$)/.test(file));
if(!app)throw new Error('index.html does not load an app script');

const source=fs.readFileSync(app,'utf8');
for(const symbol of ['function nextPlan(','function normalizeBackup','function renderProgress']){
  if(!source.includes(symbol))throw new Error(`${app} is missing ${symbol}`);
}
