// Barcha t('...') kalitlari 4 tilda borligini tekshiradi:  node tools/check-i18n.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {}, document: { readyState: 'complete', addEventListener(){}, documentElement: { dataset: {} }, querySelectorAll: () => [], dispatchEvent(){} },
  localStorage: { getItem(){ return null; }, setItem(){} }, location: { search: '' }, navigator: { language: 'uz' }, URLSearchParams, CustomEvent: function(){} , console };
ctx.window = ctx; ctx.addEventListener = () => {}; vm.createContext(ctx);
const files = ['shared/i18n.js','shared/modules.js','shared/groups.js','davomat/i18n.js','laoshi/i18n-uz-ru.js','laoshi/i18n-en-zh.js'];
vm.runInContext(fs.readFileSync(path.join(root,'shared/i18n.js'),'utf8'), ctx);
ctx.CI = ctx.window.CI;
// app.js lug'ati
const app = fs.readFileSync(path.join(root,'shared/app.js'),'utf8'); const m = app.match(/CI\.add\(\{[\s\S]*?\n\}\);/); vm.runInContext(m[0], ctx);
for(const f of files.slice(1)){ const src = fs.readFileSync(path.join(root,f),'utf8'); const mm = src.match(/CI\.add\(\{[\s\S]*?\n\}\);/g) || []; mm.forEach(x => vm.runInContext(x, ctx)); }
const D = ctx.CI.D;
const used = new Set();
const dyn = { 'l.tab.': ['tests','editor','live','groups','words','library','teachers','alltests','announce','logs','trash','backup'], 'l.st.': ['open','draft','closed'],
  'qt.': ['single','multi','tf','text','writing','hanzi_input','pinyin','translation','dictation'].flatMap(x => [x, x + '.help']),
  'preset.': ['simple','exam','practice','homework','hanzi'].flatMap(x => [x, x + '.d']),
  'set.': ['onLeave.off','onLeave.warn','onLeave.block','onLeave.off.d','onLeave.warn.d','onLeave.block.d','showScore.now','showScore.end','showScore.never','showAnswers.now','showAnswers.end','showAnswers.never','grid.tian','grid.mi'],
  'lv.s.': ['active','locked','done','timeup','idle'], 'lv.sub.': ['live','analysis','review'], 'lv.v.': ['correct','incorrect','unanswered','partial'],
  'ad.kind.': ['test','session','teacher','group','announce'], 'hz.f.': ['hanzi','pinyin','translation'],
  'a.st.': ['p','l','a','e','none','p1','l1','a1','e1'], 'a.tab.': ['lesson','journal','report','groups'], 'mod.': ['laoshi.t','laoshi.d','davomat.t','davomat.d','doska.t','doska.d','jadval.t','jadval.d'],
  'tag.': ['test','hanzi','online','qr','offline','board','schedule'] };
for(const dir of ['shared','davomat','laoshi','index.html']){
  const p = path.join(root, dir); const fl = fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(x => /\.(js|html)$/.test(x)).map(x => path.join(p,x)) : [p];
  fl.forEach(f => { const s = fs.readFileSync(f,'utf8'); for(const mm of s.matchAll(/\bt\('([a-z][a-zA-Z0-9_.]*[a-zA-Z0-9_])'/g)) used.add(mm[1]); });
}
Object.entries(dyn).forEach(([p, arr]) => arr.forEach(x => used.add(p + x)));
// log.* — CI.log('...') chaqiruvlaridan
for(const dir of ['shared','davomat','laoshi']) fs.readdirSync(path.join(root,dir)).filter(x => x.endsWith('.js')).forEach(f => {
  const s = fs.readFileSync(path.join(root,dir,f),'utf8'); for(const mm of s.matchAll(/CI\.log\('([a-zA-Z0-9_.]*[a-zA-Z0-9_])'/g)) used.add('log.' + mm[1]);
  for(const mm of s.matchAll(/'test\.' \+ st/g)) ['open','closed','draft'].forEach(x => used.add('log.test.' + x)); });
let bad = 0;
for(const l of ['uz','ru','en','zh']){ const miss = [...used].filter(k => D[l][k] == null && !/^(ann\.hide|l\.att|l\.sid|ci\.|div|portal|preview|session|teacher|test|t|locked|announce|l\.view|l\.name)/.test(k));
  if(miss.length){ bad++; console.log(l, 'MISSING', miss.length, miss.join(' ')); } }
const extra = Object.keys(D.uz).filter(k => !used.has(k) && !/^(wd|wds|m)\./.test(k)); if(extra.length) console.log('unused uz keys:', extra.length, extra.slice(0,40).join(' '));
console.log(bad ? 'I18N: muammo bor' : 'I18N OK — ' + used.size + ' kalit, 4 til');
