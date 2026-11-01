/* ============================================================================
   LAOSHI — 汉字 qismi: so'zlar bazasi, so'zlardan savol yasash, yozish maydoni (HanziWriter),
   ovozli o'qish, taqdimot rejimi. HanziWriter (MIT) faqat kerak bo'lganda yuklanadi.
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, L = window.L, t = (k,v) => CI.t(k,v), esc = CI.esc, $ = CI.$;
const HZ = L.hz = { words: {}, wordsLoaded: false };
const HW_URL = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.7/dist/hanzi-writer.min.js';
const HW_DATA = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

/* ---------------------------------------------------------------- pinyin va ovoz */
const MARKS = {a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù','ü':'ǖǘǚǜ'};
function markSyl(syl, tone){
  const s = syl.replace(/v|u:/g,'ü').replace(/V|U:/g,'Ü'); if(tone < 1 || tone > 4) return s;
  const low = s.toLowerCase(); let i = low.search(/[ae]/); if(i < 0) i = low.indexOf('ou');
  if(i < 0) for(let k = low.length-1; k >= 0; k--) if('iouü'.includes(low[k])){ i = k; break; }
  if(i < 0) return s; const m = MARKS[low[i]][tone-1]; return s.slice(0,i) + (s[i] !== low[i] ? m.toUpperCase() : m) + s.slice(i+1);
}
HZ.toMarks = s => String(s||'').replace(/([a-zA-ZüÜ:]+)([1-5])/g, (_, a, b) => markSyl(a, +b));
HZ.isHan = s => { const c = [...String(s||'').replace(/\s/g,'')]; return c.length > 0 && c.every(x => /\p{Script=Han}/u.test(x)); };
HZ.speak = (text, rate) => {
  if(!('speechSynthesis' in window) || !text) return false;
  const s = speechSynthesis; s.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; u.rate = rate || 0.8;
  const v = s.getVoices().find(x => /^zh(-|_)?cn/i.test(x.lang)) || s.getVoices().find(x => /^zh/i.test(x.lang)); if(v) u.voice = v;
  s.speak(u); return true;
};
if('speechSynthesis' in window) speechSynthesis.getVoices();

/* ---------------------------------------------------------------- HanziWriter yuklash */
let hwP = null; const charCache = {};
HZ.loadHW = () => window.HanziWriter ? Promise.resolve(window.HanziWriter) :
  (hwP = hwP || CI.loadScript(HW_URL).then(() => { if(!window.HanziWriter) throw new Error('HW'); return window.HanziWriter; }).catch(e => { hwP = null; throw e; }));
HZ.loadChar = ch => { if(!charCache[ch]){ charCache[ch] = fetch(HW_DATA + '/' + encodeURIComponent(ch) + '.json').then(r => { if(!r.ok) throw new Error(r.status); return r.json(); });
  charCache[ch].catch(() => delete charCache[ch]); } return charCache[ch]; };
HZ.gridSvg = type => `<svg class="hz-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <rect x=".75" y=".75" width="98.5" height="98.5" fill="none" stroke="#BE3A2B" stroke-opacity=".75" stroke-width="1.5"/>
  <g stroke="#BE3A2B" stroke-opacity=".45" stroke-width=".6" stroke-dasharray="3 2.5" fill="none"><line x1="50" y1="0" x2="50" y2="100"/><line x1="0" y1="50" x2="100" y2="50"/>
  ${type === 'mi' ? '<line x1="0" y1="0" x2="100" y2="100"/><line x1="100" y1="0" x2="0" y2="100"/>' : ''}</g></svg>`;
const ptsToPath = pts => !pts || !pts.length ? '' : pts.map((p,i) => (i ? 'L' : 'M') + Math.round(p.x) + ' ' + Math.round(900 - p.y)).join(' ');
/* Yozilgan ieroglif rasmi (laoshi tekshiruvi uchun) */
HZ.strokesSvg = (c, size, grid) => {
  c = c || {};
  if(c.freehand) return `<div class="hz-grid" style="width:${size}px;height:${size}px">${HZ.gridSvg(grid)}<svg class="hz-draw" viewBox="0 0 1000 1000">
    <path d="${esc(c.freehand)}" fill="none" stroke="#212A33" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
  return `<div class="hz-grid" style="width:${size}px;height:${size}px">${HZ.gridSvg(grid)}<svg class="hz-draw" viewBox="0 0 1024 1024">
    ${c.wrongStrokes ? `<path d="${esc(c.wrongStrokes)}" fill="none" stroke="#BE3A2B" stroke-opacity=".7" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${c.strokes ? `<path d="${esc(c.strokes)}" fill="none" stroke="#212A33" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>` : ''}</svg></div>`;
};

/* Yozish maydoni. host — element; q — savol; prev — oldingi javob; onChange(ans) — har o'zgarishda.
   opts: {grid, hintAfter, size, readOnly} */
HZ.mountWriting = (host, q, prev, onChange, opts) => {
  opts = opts || {}; prev = prev || {};
  const size = opts.size || Math.max(120, Math.min(200, Math.floor((Math.min(window.innerWidth, 720) - 60) / Math.min(3, q.charCount || 1))));
  const chars = [...String(q.target || '')];
  let free = !!prev.freehand && !(prev.writing || []).length;
  const ans = { writing: (prev.writing || []).slice(), freehand: prev.freehand || '' };
  const emit = () => onChange && onChange(JSON.parse(JSON.stringify(ans)));
  function draw(){
    if(free){
      host.innerHTML = `<div class="hz-pad"><div class="hz-grid" style="width:${size*1.3}px;height:${size*1.3}px">${HZ.gridSvg(opts.grid)}
        <svg class="hz-draw" viewBox="0 0 1000 1000"><path class="old" d="${esc(ans.freehand)}" fill="none" stroke="#212A33" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="live" fill="none" stroke="#3D6B8E" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="hz-tools"><button class="btn-ghost btn-sm" data-a="u">↶ ${t('hz.undo')}</button><button class="btn-ghost btn-sm" data-a="c">${t('hz.clear')}</button></div></div>
        <p class="muted" style="font-size:12.5px">${t('hz.freeNote')}</p>
        ${opts.hwFail ? '' : `<a href="#" data-a="m" style="font-size:13px">↩ ${t('hz.backToCheck')}</a>`}`;
      bindFree();
    } else {
      host.innerHTML = `<div class="hz-pads">${chars.map((c,i) => `<div class="hz-pad"><div class="hz-grid" style="width:${size}px;height:${size}px">${HZ.gridSvg(opts.grid)}
        <div class="hz-host"></div><div class="hz-msg">${t('c.loading')}</div></div><div class="hz-tools"></div></div>`).join('')}</div>
        <a href="#" data-a="m" style="font-size:13px;display:inline-block;margin-top:6px">✏️ ${t('hz.toFree')}</a>`;
      HZ.loadHW().then(HW => host.querySelectorAll('.hz-pad').forEach((pad, i) => mountPad(HW, pad, i, chars[i]))).catch(() => { opts.hwFail = true; free = true; draw(); });
    }
    const m = host.querySelector('[data-a="m"]'); if(m) m.onclick = e => { e.preventDefault(); free = !free; draw(); };
  }
  function mountPad(HW, pad, i, ch){
    const box = pad.querySelector('.hz-host'), tools = pad.querySelector('.hz-tools'), msg = pad.querySelector('.hz-msg');
    const old = ans.writing[i];
    const ghost = !!(q.prompt && q.prompt.hanzi);
    const w = HW.create(box, ch, { width: size, height: size, padding: Math.round(size*.06), showCharacter: false, showOutline: ghost,
      strokeColor:'#212A33', outlineColor:'#E3E1DA', drawingColor:'#3D6B8E', highlightColor:'#D08B0B', drawingWidth: Math.max(4, Math.round(size/18)),
      charDataLoader: (c, ok, err) => HZ.loadChar(c).then(ok, err),
      onLoadCharDataSuccess: () => { if(msg) msg.remove(); if(old && old.completed){ w.showCharacter(); setTools(true, old.mistakes); } else start(false); },
      onLoadCharDataError: () => { opts.hwFail = true; free = true; draw(); } });
    function save(v){ for(let j = 0; j < chars.length; j++) if(!ans.writing[j]) ans.writing[j] = { char: chars[j], completed: false, mistakes: 0, strokes: '', wrongStrokes: '' };
      ans.writing[i] = v; ans.freehand = ''; emit(); }
    function setTools(done, mist){
      tools.innerHTML = (done ? `<span style="font-size:12px;font-weight:700;color:${mist ? 'var(--amber)' : 'var(--jade)'}">✓ ${t('hz.mistakes',{n:mist})}</span>`
        : `<span class="muted" style="font-size:12px">${t('hz.strokeByStroke')}</span>`) + (opts.readOnly ? '' : `<button class="btn-ghost btn-xs" data-a="r">${t('hz.rewrite')}</button>`);
      const r = tools.querySelector('[data-a="r"]'); if(r) r.onclick = () => { w.cancelQuiz(); start(true); };
    }
    function start(reset){
      if(opts.readOnly) return;
      const acc = { ok: '', wrong: '', m: 0 }; w.hideCharacter(); ghost ? w.showOutline() : w.hideOutline(); setTools(false);
      const em = done => save({ char: ch, completed: done, mistakes: acc.m, strokes: acc.ok, wrongStrokes: acc.wrong });
      if(reset) em(false);
      w.quiz({ showHintAfterMisses: opts.hintAfter > 0 ? opts.hintAfter : false,
        onCorrectStroke: d => { const p = ptsToPath(d.drawnPath && d.drawnPath.points); acc.ok = acc.ok ? acc.ok + ' ' + p : p; acc.m = d.totalMistakes || 0; em(false); },
        onMistake: d => { const p = ptsToPath(d.drawnPath && d.drawnPath.points); acc.wrong = acc.wrong ? acc.wrong + ' ' + p : p; acc.m = d.totalMistakes || 0; em(false); },
        onComplete: s => { acc.m = s.totalMistakes || 0; em(true); setTools(true, acc.m); } });
    }
  }
  function bindFree(){
    const svg = host.querySelector('svg.hz-draw'), live = svg.querySelector('path.live'), oldP = svg.querySelector('path.old');
    let cur = '', last = null, on = false;
    const pt = e => { const r = svg.getBoundingClientRect(); return { x: Math.max(0, Math.min(1000, (e.clientX - r.left) / r.width * 1000)), y: Math.max(0, Math.min(1000, (e.clientY - r.top) / r.height * 1000)) }; };
    svg.onpointerdown = e => { if(opts.readOnly) return; e.preventDefault(); svg.setPointerCapture(e.pointerId); on = true; const p = pt(e); last = p; cur = `M${Math.round(p.x)} ${Math.round(p.y)}`; live.setAttribute('d', cur); };
    svg.onpointermove = e => { if(!on) return; const p = pt(e); if(last && Math.hypot(p.x - last.x, p.y - last.y) < 6) return; last = p; cur += ` L${Math.round(p.x)} ${Math.round(p.y)}`; live.setAttribute('d', cur); };
    svg.onpointerup = svg.onpointercancel = () => { if(!on) return; on = false; last = null; const s = cur.includes('L') ? cur : cur + ' l1 1'; cur = ''; live.setAttribute('d', '');
      ans.freehand = ans.freehand ? ans.freehand + ' ' + s : s; ans.writing = []; oldP.setAttribute('d', ans.freehand); emit(); };
    host.querySelector('[data-a="u"]').onclick = () => { const p = ans.freehand.split(/(?=M)/).map(x => x.trim()).filter(Boolean); p.pop(); ans.freehand = p.join(' '); oldP.setAttribute('d', ans.freehand); emit(); };
    host.querySelector('[data-a="c"]').onclick = () => { ans.freehand = ''; oldP.setAttribute('d', ''); emit(); };
  }
  draw();
};

/* ---------------------------------------------------------------- muharrirdagi hanzi savoli */
const SHOW_DEF = { writing: {pinyin:true, translation:true, hanzi:false}, hanzi_input: {pinyin:true, translation:true}, pinyin: {hanzi:true, translation:true},
  translation: {hanzi:true, pinyin:true}, dictation: {translation:false} };
const HIDDEN = { writing: 'hanzi', hanzi_input: 'hanzi', dictation: 'hanzi', pinyin: 'pinyin', translation: 'translation' };
HZ.editBody = (qid, q, k) => {
  const show = q.show || SHOW_DEF[q.type];
  const field = (f, ph) => `<div><label>${t('hz.f.' + f)}</label><input value="${esc(k[f]||'')}" placeholder="${esc(ph||'')}"
    oninput="L.hz.kf('${qid}','${f}',this.value)" ${f==='pinyin'?`onchange="this.value=L.hz.toMarks(this.value);L.hz.kf('${qid}','pinyin',this.value)"`:''}></div>`;
  const hid = HIDDEN[q.type];
  const shows = ['hanzi','pinyin','translation'].filter(f => f !== hid || (q.type === 'writing' && f === 'hanzi'));
  return `<div class="row">${field('hanzi','你好')}${field('pinyin','nǐ hǎo / ni3 hao3')}${field('translation', t('hz.f.translationPh'))}</div>
    <div class="flex mt"><span class="muted" style="font-size:12.5px">${t('hz.showToStudent')}:</span>
      ${shows.map(f => `<label class="chk" style="margin:0"><input type="checkbox" ${show[f]?'checked':''} onchange="L.hz.show('${qid}','${f}',this.checked)">
        ${f === 'hanzi' && q.type === 'writing' ? t('hz.ghost') : t('hz.f.' + f)}</label>`).join('')}</div>
    <label>${t('hz.alt')} <span class="muted" style="font-weight:400">— ${t('hz.altHint')}</span></label>
    <input value="${esc((k.alt||[]).join('; '))}" oninput="L.hz.kf('${qid}','alt',this.value)">
    <label>${t('hz.instr')} <span class="muted">(${t('c.optional')})</span></label>
    <input value="${esc(q.text||'')}" placeholder="${esc(t('qt.' + q.type + '.help'))}" oninput="L.editor.qf('${qid}','text',this.value)">`;
};
HZ.kf = (qid, f, v) => { const k = L.editor.state().keys[qid]; if(f === 'alt') k.alt = String(v).split(/[;；]/).map(s => s.trim()).filter(Boolean); else k[f] = String(v).trim(); };
HZ.show = (qid, f, v) => { const q = L.editor.state().test.questions[qid]; q.show = Object.assign({}, q.show || SHOW_DEF[q.type], {[f]: v}); };
HZ.validateQ = (q, k) => {
  if(!k.hanzi) return t('hz.e.hanzi');
  if((q.type === 'writing' || q.type === 'dictation') && !HZ.isHan(k.hanzi)) return t('hz.e.onlyHan');
  if(q.type === 'pinyin' && !k.pinyin) return t('hz.e.pinyin');
  if(q.type === 'translation' && !k.translation) return t('hz.e.translation');
  return null;
};
/* Saqlashdan oldin: o'quvchiga ko'rinadigan qism (prompt) va qabul qilinadigan javoblarni yig'ish */
HZ.build = (q, k) => {
  const show = q.show || SHOW_DEF[q.type], hid = HIDDEN[q.type];
  const hz = String(k.hanzi||'').trim();
  q.prompt = {};
  ['hanzi','pinyin','translation'].forEach(f => { if(show[f] && k[f] && (f !== hid || (q.type === 'writing' && f === 'hanzi'))) q.prompt[f] = k[f]; });
  if(!Object.keys(q.prompt).length) delete q.prompt;
  q.charCount = [...hz.replace(/\s/g,'')].length;
  if(q.type === 'writing' || q.type === 'dictation') q.target = hz.replace(/\s/g,''); else delete q.target;
  const alt = k.alt || [];
  k.accepted = q.type === 'pinyin' ? [k.pinyin].concat(alt) : q.type === 'translation' ? [k.translation].concat(alt) : [hz].concat(alt);
  k.accepted = k.accepted.filter(Boolean);
};
/* So'zdan savol */
HZ.fromWord = (w, type, show) => {
  if(type === 'pinyin' && !w.pinyin) return null;
  if(type === 'translation' && !w.translation) return null;
  if((type === 'writing' || type === 'dictation') && !HZ.isHan(w.hanzi)) return null;
  const q = { type, wordId: w.id, show: Object.assign({}, SHOW_DEF[type], show && type !== 'pinyin' && type !== 'translation' ? show : {}) };
  const k = { hanzi: w.hanzi, pinyin: w.pinyin || '', translation: w.translation || '',
    alt: type === 'pinyin' ? (w.altPinyin||[]) : type === 'translation' ? (w.altTranslations||[]) : [] };
  return { type, q, key: k };
};

/* ---------------------------------------------------------------- so'zlar bazasi */
HZ.listenWords = cb => {
  if(HZ._wref){ cb && cb(); return; }
  HZ._wref = CI.db.ref('words');
  HZ._wref.on('value', s => { HZ.words = s.val() || {}; HZ.wordsLoaded = true; cb && cb(); if(L.view === 'words') HZ.renderWords(); },
    e => { HZ.wordsErr = e; HZ.wordsLoaded = true; if(L.view === 'words') HZ.renderWords(); });
};
const wordMatch = (w, q) => !q || [w.hanzi, w.pinyin, w.translation, (w.tags||[]).join(' ')].join(' ').toLowerCase().includes(q) ||
  LZGrade.normPinyin(w.pinyin, false).includes(LZGrade.normPinyin(q, false) || '\u0000');
let wq = '', whsk = 0, wmine = false;
HZ.filtered = (q, hsk, mine) => Object.entries(HZ.words).filter(([id,w]) => (!hsk || +w.hsk === hsk) && (!mine || w.ownerUid === CI.me()) && wordMatch(w, q))
  .sort((a,b) => (a[1].hsk||99) - (b[1].hsk||99) || String(a[1].pinyin).localeCompare(String(b[1].pinyin)));
const hskChips = (cur, fn) => [0,1,2,3,4,5,6,7,8,9].map(l => `<button class="btn-xs ${cur===l?'btn-p':'btn-ghost'}" onclick="${fn}(${l})">${l ? 'HSK ' + l : t('c.all')}</button>`).join(' ');
HZ.renderWords = () => {
  HZ.listenWords();
  const list = HZ.filtered(wq, whsk, wmine); const shown = list.slice(0, 300);
  L.app.innerHTML = L.shell(`<div class="card"><h2>📖 ${t('hz.words')} <span class="muted" style="font-family:var(--sans);font-size:14px">${Object.keys(HZ.words).length}</span></h2>
    <p class="muted">${t('hz.wordsHint')}</p>
    <div class="flex mt"><button class="btn-brand btn-sm" onclick="L.hz.wordForm()">➕ ${t('hz.addWord')}</button>
      <button class="btn-ghost btn-sm" onclick="L.hz.importWords()">📥 ${t('hz.importCsv')}</button>
      <button class="btn-ghost btn-sm" onclick="L.hz.exportWords()">⬇ CSV</button>
      ${!Object.keys(HZ.words).length ? `<button class="btn-ghost btn-sm" onclick="L.hz.addStarter()">✨ ${t('hz.starter')}</button>` : ''}</div></div>
    <div class="flex mb"><input id="w-q" placeholder="${esc(t('hz.searchPh'))}" value="${esc(wq)}" style="max-width:280px" oninput="L.hz.wSearch(this.value)">
      <label class="chk" style="margin:0"><input type="checkbox" ${wmine?'checked':''} onchange="L.hz.wMine(this.checked)"> ${t('hz.mineOnly')}</label></div>
    <div class="flex mb">${hskChips(whsk, 'L.hz.wHsk')}</div>
    ${!HZ.wordsLoaded ? `<p class="muted">${t('c.loading')}</p>` : HZ.wordsErr ? `<div class="note red">${CI.errMsg(HZ.wordsErr)}</div>` :
      !list.length ? `<div class="card"><div class="empty"><span class="ico">📖</span>${t('hz.noWords')}</div></div>` :
      `<div class="tbl"><table><tr><th>汉字</th><th>Pinyin</th><th>${t('hz.f.translation')}</th><th>HSK</th><th></th></tr>
      ${shown.map(([id,w]) => `<tr><td class="hz-han" style="font-size:22px">${esc(w.hanzi)}</td><td>${esc(w.pinyin||'')}</td><td>${esc(w.translation||'')}
        ${(w.tags||[]).length ? `<div class="muted" style="font-size:11.5px">${(w.tags||[]).map(esc).join(', ')}</div>` : ''}</td><td>${w.hsk||''}</td>
        <td class="nowrap" style="text-align:right"><button class="btn-ghost btn-xs" onclick="L.hz.speak(${CI.jsq(w.hanzi)})">🔊</button>
        ${w.ownerUid === CI.me() || CI.isAdmin() ? `<button class="btn-ghost btn-xs" onclick="L.hz.wordForm('${id}')">✏️</button>
        <button class="btn-ghost btn-xs" onclick="L.hz.delWord('${id}')">🗑</button>` : ''}</td></tr>`).join('')}</table></div>
      ${list.length > shown.length ? `<p class="muted mt">${t('hz.moreWords',{n:list.length - shown.length})}</p>` : ''}`}`);
};
HZ.wSearch = v => { wq = v.trim().toLowerCase(); HZ.renderWords(); const i = $('#w-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
HZ.wHsk = l => { whsk = l; HZ.renderWords(); };
HZ.wMine = v => { wmine = v; HZ.renderWords(); };
HZ.wordForm = id => {
  const w = id ? HZ.words[id] : { hsk: 1 };
  CI.modal({ title: id ? '✏️ ' + esc(w.hanzi) : '➕ ' + t('hz.addWord'), html: `
    <div class="row"><div><label>汉字</label><input id="wf-h" value="${esc(w.hanzi||'')}" class="hz-han" style="font-size:22px"></div>
      <div><label>Pinyin</label><input id="wf-p" value="${esc(w.pinyin||'')}" placeholder="nǐ hǎo / ni3 hao3"></div></div>
    <label>${t('hz.f.translation')}</label><input id="wf-t" value="${esc(w.translation||'')}" placeholder="${esc(t('hz.f.translationPh'))}">
    <div class="row"><div style="flex:0 0 110px"><label>HSK</label><input id="wf-l" type="number" min="0" max="9" value="${w.hsk||''}"></div>
      <div><label>${t('hz.tags')}</label><input id="wf-g" value="${esc((w.tags||[]).join(', '))}" placeholder="${esc(t('hz.tagsPh'))}"></div></div>
    <label>${t('hz.altTr')}</label><input id="wf-at" value="${esc((w.altTranslations||[]).join('; '))}">
    <label>${t('hz.altPy')}</label><input id="wf-ap" value="${esc((w.altPinyin||[]).join('; '))}">`,
    actions: [{label: t('c.cancel'), cls: 'btn-ghost'}, {label: t('c.save'), keep: true, fn: close => {
      const h = $('#wf-h').value.trim(); if(!h) return;
      const sp = v => v.split(/[;；]/).map(s => s.trim()).filter(Boolean);
      const rec = { hanzi: h, pinyin: HZ.toMarks($('#wf-p').value.trim()), translation: $('#wf-t').value.trim(), hsk: +$('#wf-l').value || null,
        tags: $('#wf-g').value.split(',').map(s => s.trim()).filter(Boolean), altTranslations: sp($('#wf-at').value), altPinyin: sp($('#wf-ap').value).map(HZ.toMarks),
        ownerUid: id ? w.ownerUid : CI.me(), ownerName: id ? w.ownerName : CI.myName(), createdAt: id ? w.createdAt : Date.now(), updatedAt: Date.now() };
      CI.db.ref('words/' + (id || CI.rid(10))).set(rec).then(() => { close(); CI.toast(t('c.saved'), 'ok'); }, e => CI.toast(CI.errMsg(e), 'err'));
    }}] });
};
HZ.delWord = async id => { if(await CI.confirm(t('hz.delWordQ', {w: esc(HZ.words[id].hanzi)}), {danger:true})) CI.db.ref('words/' + id).remove().catch(e => CI.toast(CI.errMsg(e), 'err')); };
const W_HEAD = ['hanzi','pinyin','translation','hsk','altTranslations','altPinyin','tags'];
HZ.exportWords = () => CI.downloadFile('hanzi-words.csv', CI.toCsv([W_HEAD].concat(Object.values(HZ.words).map(w =>
  [w.hanzi, w.pinyin, w.translation, w.hsk, (w.altTranslations||[]).join('; '), (w.altPinyin||[]).join('; '), (w.tags||[]).join(', ')]))), 'text/csv;charset=utf-8');
HZ.importWords = () => {
  CI.modal({ title: '📥 ' + t('hz.importCsv'), html: `<p class="muted">${t('hz.importHint')}</p>
    <button class="btn-ghost btn-sm" onclick="CI.downloadFile('hanzi-words-sample.csv', CI.toCsv([${CI.esc(JSON.stringify(W_HEAD))},['你好','ni3 hao3','salom','1','assalomu alaykum','','1-dars'],['谢谢','xièxie','rahmat','1','','','1-dars']]),'text/csv;charset=utf-8')">⬇ ${t('e.imp.sampleCsv')}</button>
    <input type="file" id="wi-f" accept=".csv,text/csv" class="mt"><div id="wi-msg"></div>`,
    actions: [{label: t('c.cancel'), cls: 'btn-ghost'}, {label: t('c.import'), cls: 'btn-brand', keep: true, fn: close => {
      const f = $('#wi-f').files[0]; if(!f) return;
      const rd = new FileReader(); rd.onload = () => {
        const rows = L.editor.parseCsvRows(String(rd.result).replace(/^\uFEFF/, ''));
        const head = (rows[0]||[]).map(h => String(h).trim()); const hasHead = head.includes('hanzi');
        const idx = f => hasHead ? head.indexOf(f) : W_HEAD.indexOf(f);
        const exist = new Set(Object.values(HZ.words).map(w => w.hanzi + '|' + LZGrade.normPinyin(w.pinyin, false)));
        const up = {}; let n = 0, dup = 0;
        (hasHead ? rows.slice(1) : rows).forEach(r => { const g = f => idx(f) >= 0 ? String(r[idx(f)] || '').trim() : '';
          const h = g('hanzi'); if(!h) return; const p = HZ.toMarks(g('pinyin'));
          const key = h + '|' + LZGrade.normPinyin(p, false); if(exist.has(key)){ dup++; return; } exist.add(key);
          const sp = v => v.split(/[;；]/).map(s => s.trim()).filter(Boolean);
          up['words/' + CI.rid(10)] = { hanzi: h, pinyin: p, translation: g('translation'), hsk: +g('hsk') || null, altTranslations: sp(g('altTranslations')),
            altPinyin: sp(g('altPinyin')).map(HZ.toMarks), tags: g('tags').split(',').map(s => s.trim()).filter(Boolean), ownerUid: CI.me(), ownerName: CI.myName(), createdAt: Date.now() }; n++; });
        CI.db.ref().update(up).then(() => { close(); CI.toast(t('hz.imported', {n, d: dup}), 'ok'); }, e => $('#wi-msg').innerHTML = `<div class="note red">${CI.errMsg(e)}</div>`);
      }; rd.readAsText(f, 'utf-8');
    }}] });
};
const STARTER = [['你好','nǐ hǎo','salom'],['谢谢','xièxie','rahmat'],['再见','zàijiàn',"xayr"],['对不起','duìbuqǐ','kechirasiz'],['老师','lǎoshī','o‘qituvchi'],
  ['学生','xuésheng','talaba'],['中国','Zhōngguó','Xitoy'],['朋友','péngyou','do‘st'],['喜欢','xǐhuan','yoqtirmoq'],['学习','xuéxí','o‘qimoq'],
  ['水','shuǐ','suv'],['书','shū','kitob'],['人','rén','odam'],['大','dà','katta'],['小','xiǎo','kichik'],['好','hǎo','yaxshi']];
HZ.addStarter = () => { const up = {}; STARTER.forEach(([h,p,tr]) => up['words/' + CI.rid(10)] = { hanzi: h, pinyin: p, translation: tr, hsk: 1, tags: ['HSK1'], ownerUid: CI.me(), ownerName: CI.myName(), createdAt: Date.now() });
  CI.db.ref().update(up).catch(e => CI.toast(CI.errMsg(e), 'err')); };

/* ---------------------------------------------------------------- so'zlardan savollar (muharrir) */
let pk = null;
HZ.pickWords = () => {
  pk = { sel: [], q: '', hsk: 0, types: ['writing','pinyin','translation'], show: { pinyin: true, translation: true, hanzi: false } };
  HZ.listenWords(() => pkDraw());
  pk.m = CI.modal({ title: '汉字 ' + t('e.fromWords'), wide: true, html: '<div id="pk"></div>',
    actions: [{label: t('c.cancel'), cls: 'btn-ghost'}, {label: t('hz.pk.add'), cls: 'btn-brand', fn: () => pkAdd()}] });
  pkDraw();
};
function pkDraw(){
  const el = $('#pk'); if(!el) return;
  const list = HZ.filtered(pk.q, pk.hsk).slice(0, 200);
  const n = pk.sel.length * pk.types.length;
  el.innerHTML = `<label style="margin-top:0">${t('hz.pk.types')}</label>
    <div class="flex">${L.HANZI_TYPES.map(ty => `<label class="chk" style="margin:0"><input type="checkbox" ${pk.types.includes(ty)?'checked':''} onchange="L.hz.pkType('${ty}',this.checked)"> ${L.typeLabel(ty)}</label>`).join('')}</div>
    <p class="muted" style="font-size:12.5px;margin-top:4px">${t('hz.pk.typesHint')}</p>
    <div class="row mt"><div><input id="pk-q" placeholder="${esc(t('hz.searchPh'))}" value="${esc(pk.q)}" oninput="L.hz.pkQ(this.value)"></div></div>
    <div class="flex mt">${hskChips(pk.hsk, 'L.hz.pkH')}</div>
    <div class="grid2 mt"><div><b class="muted" style="font-size:12.5px">${t('hz.words')}</b>
      <div style="max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:4px">
      ${!HZ.wordsLoaded ? `<p class="muted">${t('c.loading')}</p>` : !list.length ? `<p class="muted" style="padding:8px">${t('hz.noWords')}</p>` :
        list.map(([id,w]) => `<button class="menu-item" onclick="L.hz.pkAdd1('${id}')" ${pk.sel.includes(id)?'style="opacity:.4"':''}>
          <span class="hz-han" style="font-size:18px">${esc(w.hanzi)}</span> <span class="muted">${esc(w.pinyin||'')} · ${esc(w.translation||'')}</span></button>`).join('')}</div>
      <button class="btn-ghost btn-xs mt" onclick="L.hz.pkAll()">+ ${t('hz.pk.addAll')}</button></div>
    <div><b class="muted" style="font-size:12.5px">${t('hz.pk.selected', {n: pk.sel.length})}</b>
      <div style="max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:4px">
      ${pk.sel.map((id,i) => { const w = HZ.words[id]; return `<div class="flex" style="padding:4px 6px"><span class="hz-han" style="font-size:18px">${esc(w.hanzi)}</span>
        <span class="muted spacer">${esc(w.pinyin||'')}</span><button class="btn-ghost btn-xs" onclick="L.hz.pkRm(${i})">✕</button></div>`; }).join('') || `<p class="muted" style="padding:8px">—</p>`}</div></div></div>
    <p class="mt"><b>${t('hz.pk.willAdd', {n})}</b></p>`;
}
HZ.pkType = (ty, on) => { pk.types = on ? [...new Set(pk.types.concat(ty))] : pk.types.filter(x => x !== ty); pkDraw(); };
HZ.pkQ = v => { pk.q = v.trim().toLowerCase(); pkDraw(); const i = $('#pk-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
HZ.pkH = l => { pk.hsk = l; pkDraw(); };
HZ.pkAdd1 = id => { if(!pk.sel.includes(id) && pk.sel.length < 80) pk.sel.push(id); pkDraw(); };
HZ.pkAll = () => { HZ.filtered(pk.q, pk.hsk).slice(0, 80).forEach(([id]) => { if(!pk.sel.includes(id) && pk.sel.length < 80) pk.sel.push(id); }); pkDraw(); };
HZ.pkRm = i => { pk.sel.splice(i, 1); pkDraw(); };
function pkAdd(){
  const out = [];
  pk.types.forEach(ty => pk.sel.forEach(id => { const w = Object.assign({ id }, HZ.words[id]); const r = HZ.fromWord(w, ty); if(r) out.push(r); }));
  if(out.length) L.editor.addMany(out);
}

/* ---------------------------------------------------------------- 🖥 taqdimot (sinfda ko'rsatish) */
let PR = null;
HZ.present = async tid => {
  const x = L.testById(tid); let keys = {};
  try{ keys = ((await CI.db.ref('testKeys/' + tid).once('value')).val() || {}).answers || {}; }catch(e){}
  const seen = new Set(); const list = [];
  L.qOrder(x).forEach(id => { const q = x.questions[id], k = keys[id] || {}; if(!L.HANZI_TYPES.includes(q.type) || !k.hanzi || seen.has(k.hanzi)) return; seen.add(k.hanzi); list.push(k); });
  if(!list.length) return CI.toast(t('hz.noWords'), 'err');
  PR = { list, i: 0, hide: false };
  const el = document.createElement('div'); el.id = 'hz-pres'; el.className = 'hz-present'; document.body.appendChild(el);
  document.addEventListener('keydown', prKey); prDraw();
};
function prKey(e){ if(!PR) return; if(e.key === 'ArrowRight' || e.key === ' ') HZ.prGo(1); else if(e.key === 'ArrowLeft') HZ.prGo(-1); else if(e.key === 'Escape') HZ.prClose(); }
function prDraw(){
  const k = PR.list[PR.i], el = $('#hz-pres');
  el.innerHTML = `<div class="hp-top"><b>${PR.i+1} / ${PR.list.length}</b><span class="spacer"></span>
      <label class="chk" style="margin:0"><input type="checkbox" ${PR.hide?'checked':''} onchange="L.hz.prHide(this.checked)"> ${t('hz.pr.hide')}</label>
      <button class="btn-ghost btn-sm" onclick="L.hz.prClose()">✕ ${t('c.close')}</button></div>
    <div class="hp-mid" onclick="L.hz.prReveal()">
      <div class="hp-han hz-han" id="hp-han" style="${PR.hide && !PR.rev ? 'visibility:hidden' : ''}">${esc(k.hanzi)}</div>
      <div class="hp-pin">${esc(k.pinyin||'')}</div><div class="hp-tr">${esc(k.translation||'')}</div>
      <div id="hp-anim" style="width:180px;height:180px"></div></div>
    <div class="hp-bot"><button class="btn-ghost" onclick="L.hz.prGo(-1)">← ${t('c.back')}</button>
      <button class="btn-ghost" onclick="L.hz.speak(${CI.jsq(k.hanzi)})">🔊 ${t('hz.pr.say')}</button>
      <button class="btn-ghost" onclick="L.hz.prAnim()">✍️ ${t('hz.pr.strokes')}</button>
      <button class="btn-p" onclick="L.hz.prGo(1)">${t('hz.pr.next')} →</button></div>`;
}
HZ.prGo = d => { const j = PR.i + d; if(j < 0 || j >= PR.list.length) return; PR.i = j; PR.rev = false; prDraw(); };
HZ.prHide = v => { PR.hide = v; PR.rev = false; prDraw(); };
HZ.prReveal = () => { PR.rev = true; const h = $('#hp-han'); if(h) h.style.visibility = ''; };
HZ.prAnim = () => { const box = $('#hp-anim'); const ch = [...PR.list[PR.i].hanzi][0]; box.innerHTML = '';
  HZ.loadHW().then(HW => { const w = HW.create(box, ch, { width: 180, height: 180, padding: 8, showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 250,
    charDataLoader: (c, ok, err) => HZ.loadChar(c).then(ok, err) }); w.animateCharacter(); }).catch(() => {}); };
HZ.prClose = () => { document.removeEventListener('keydown', prKey); const el = $('#hz-pres'); if(el) el.remove(); PR = null; };

/* ---------------------------------------------------------------- uslublar */
document.head.insertAdjacentHTML('beforeend', `<style>
.hz-han{font-family:"KaiTi","STKaiti","Kaiti SC",var(--serif)}
.hz-grid{position:relative;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px var(--line);touch-action:none;flex:none}
.hz-grid>svg.hz-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.hz-grid>.hz-host,.hz-grid>svg.hz-draw{position:absolute;inset:0;width:100%;height:100%}
.hz-grid .hz-msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--ink-soft)}
.hz-pads{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}
.hz-pad{display:flex;flex-direction:column;align-items:center;gap:6px}
.hz-tools{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center}
.hz-present{position:fixed;inset:0;z-index:300;background:#FBFAF6;display:flex;flex-direction:column}
.hz-present .hp-top{display:flex;gap:8px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line)}
.hz-present .hp-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:16px;cursor:pointer;user-select:none}
.hz-present .hp-han{font-size:clamp(80px,22vw,230px);line-height:1.05}
.hz-present .hp-pin{font-size:clamp(22px,5vw,46px)}
.hz-present .hp-tr{font-size:clamp(16px,3.5vw,28px);color:var(--ink-soft)}
.hz-present .hp-bot{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line)}
</style>`);
})();
