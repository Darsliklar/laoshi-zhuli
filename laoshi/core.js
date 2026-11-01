/* ============================================================================
   LAOSHI — asos: holat, yo'naltirish, laoshi paneli, topshiriqlar ro'yxati
   Topshiriq (test) — bitta tushuncha: oddiy test, hanzi mashqi yoki aralash.
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, t = (k,v) => CI.t(k,v), esc = CI.esc, $ = CI.$;
const L = window.L = {
  view: 'tests', tests: {}, shared: {}, refs: [], counts: {},
  params: new URLSearchParams(location.search)
};
const app = $('#app');
L.app = app;

/* Savol turlari */
L.TYPES = ['single','multi','tf','text','writing','hanzi_input','pinyin','translation','dictation'];
L.HANZI_TYPES = ['writing','hanzi_input','pinyin','translation','dictation'];
L.TYPE_ICON = { single:'🔘', multi:'☑️', tf:'⚖️', text:'✏️', writing:'✍️', hanzi_input:'⌨️', pinyin:'🔤', translation:'🌐', dictation:'🔊' };
L.typeLabel = ty => L.TYPE_ICON[ty] + ' ' + t('qt.' + ty);
L.LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
L.DEFAULT_CRITERIA = [{min:86, grade:'5'}, {min:71, grade:'4'}, {min:56, grade:'3'}, {min:0, grade:'2'}];
L.STATUS_PILL = st => st === 'open' ? CI.pill('p-green', '● ' + t('l.st.open')) : st === 'closed' ? CI.pill('p-red', '🔒 ' + t('l.st.closed')) : CI.pill('p-gray', t('l.st.draft'));
L.qOrder = test => (test.order && test.order.length) ? test.order.filter(id => test.questions && test.questions[id]) : Object.keys(test.questions || {}).sort();
L.link = tid => CI.here() + '?t=' + tid;
L.gas = (body) => {
  const url = CI.cfg.appsScriptUrl;
  if(!url) return Promise.reject(new Error('no_gas'));
  return fetch(url, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json());
};

/* ---------------------------------------------------------------- yo'naltirish */
const P = L.params;
function route(){
  if(P.get('t')) return L.student.open(P.get('t'));
  if(P.has('portal')) return L.student.portal(P.get('portal'));
  CI.requireTeacher(app, start, { onProfile: () => { if(L.started) draw(); } });
}
document.addEventListener('DOMContentLoaded', route);
document.addEventListener('ci:lang', () => { if(L.started) draw(); });

function start(){
  L.started = true;
  L.view = location.hash.replace('#','') || CI.ls.get('l.view') || 'tests';
  attach();
  CI.G.listen(() => { if(['tests','editor','live'].includes(L.view)) draw(); });
  recordLogin();
  draw();
  if(CI.isAdmin() && L.admin) L.admin.purgeOldTrash();
}
window.addEventListener('hashchange', () => { if(!L.started) return; const v = location.hash.replace('#',''); if(v && v !== L.view){ L.view = v; draw(); } });

function attach(){
  L.refs.forEach(r => r.off()); L.refs = [];
  const ref = CI.isAdmin() ? CI.db.ref('tests') : CI.db.ref('tests').orderByChild('ownerUid').equalTo(CI.me());
  ref.on('value', s => { L.tests = s.val() || {}; L.testsLoaded = true; if(['tests','live','library'].includes(L.view)) draw(); },
    e => { L.testsErr = e; draw(); });
  const sh = CI.db.ref('tests').orderByChild('shared').equalTo(true);
  sh.on('value', s => { L.shared = s.val() || {}; if(L.view === 'library') draw(); });
  const an = CI.db.ref('announcements').limitToLast(5);
  an.on('value', s => { L.ann = s.val() || {}; if(L.view === 'tests') draw(); }, () => {});
  L.refs.push(ref, sh, an);
}
/* Mening (yoki admin uchun barcha) topshiriqlarim */
L.myTests = () => Object.entries(L.tests).filter(([id,x]) => CI.isAdmin() ? (L.showAll || x.ownerUid === CI.me()) : x.ownerUid === CI.me())
  .sort((a,b) => (b[1].createdAt||0) - (a[1].createdAt||0));
L.testById = id => L.tests[id] || L.shared[id];

/* ---------------------------------------------------------------- qobiq (sarlavha + tablar) */
const TABS = [
  ['tests','📚'], ['editor','➕'], ['live','📊'], ['groups','👥'], ['words','📖'], ['library','🌐'],
  null,
  ['teachers','👩‍🏫', 'admin'], ['alltests','📋', 'admin'], ['announce','📢', 'admin'], ['logs','🧾', 'admin'], ['trash','🗑'], ['backup','💾', 'admin']
];
L.go = (v, arg) => {
  if(v === 'editor' && arg === undefined){ L.editId = null; L.editSrc = null; }
  if(arg !== undefined){ if(v === 'editor') L.editId = arg; if(v === 'live') L.liveId = arg; }
  if(L.view === 'live' && v !== 'live' && L.live) L.live.detach();
  L.view = v; CI.ls.set('l.view', v); history.replaceState(null, '', '#' + v); draw(); window.scrollTo(0, 0);
};
L.shell = inner => CI.topbar({ title: t('l.title'), right: CI.userMenu([{label: '🔐 ' + t('ad.logins'), fn: "L.go('logins')"}]) }) + `
  ${annBanner()}
  <div class="tabs no-print">${TABS.map(x => !x ? (CI.isAdmin() ? '<span class="tab-sep"></span>' : '') :
    (x[2] === 'admin' && !CI.isAdmin()) ? '' :
    `<button class="tab ${L.view===x[0]?'on':''}" onclick="L.go('${x[0]}')">${x[1]} ${t('l.tab.'+x[0])}</button>`).join('')}</div>
  <div id="l-body">${inner || ''}</div>`;
function annBanner(){
  const items = Object.entries(L.ann || {}).sort((a,b) => (b[1].at||0) - (a[1].at||0)).filter(([id,a]) => !CI.ls.get('ann.hide.' + id)).slice(0, 2);
  return items.map(([id,a]) => `<div class="note blue flex" style="justify-content:space-between"><div>📢 <b>${esc(a.title||'')}</b> ${esc(a.text||'')}
    <span class="muted"> · ${CI.fmtD(a.at)}</span></div><button class="btn-ghost btn-xs" onclick="CI.ls.set('ann.hide.${id}','1');L.redraw()">✕</button></div>`).join('');
}
L.redraw = () => draw();
function draw(){
  if(!CI.profile) return;
  switch(L.view){
    case 'editor': return L.editor.render();
    case 'live': return L.live.render();
    case 'groups': app.innerHTML = L.shell(); return CI.G.renderManager($('#l-body'));
    case 'words': return L.hz.renderWords();
    case 'library': return drawLibrary();
    case 'teachers': case 'alltests': case 'announce': case 'logs': case 'trash': case 'backup': case 'logins':
      return L.admin.render(L.view);
    default: L.view = 'tests'; return drawTests();
  }
}

/* ---------------------------------------------------------------- 📚 Topshiriqlar ro'yxati */
let q = '', fStatus = '';
function testRow(id, x, opts){
  opts = opts || {};
  const qs = L.qOrder(x); const types = {}; qs.forEach(k => { const ty = x.questions[k].type; types[ty] = (types[ty]||0) + 1; });
  const g = x.groupId ? CI.G.groups[x.groupId] : null; const s = x.settings || {};
  const mine = x.ownerUid === CI.me();
  return `<div class="lrow">
    <div class="lrow-main">
      <div class="lrow-title">${esc(x.title)} ${opts.lib ? '' : L.STATUS_PILL(x.status)} ${x.shared ? CI.pill('p-blue', '🌐 ' + t('l.shared')) : ''}</div>
      <div class="lrow-sub">${Object.entries(types).map(([ty,n]) => `${L.TYPE_ICON[ty]} ${n}`).join(' · ')} · ${t('l.qCount',{n:qs.length})}
        ${s.timeLimit ? ' · ⏱ ' + s.timeLimit + ' ' + t('c.min') : ''}
        · ${g ? '👥 ' + esc(g.name) : x.groupId ? '👥 ?' : '🔗 ' + t('l.openLink')}
        ${!mine ? ' · 👤 ' + esc(x.ownerName || '') : ''} · ${CI.fmtD(x.createdAt)}
        ${s.preset ? ' · ' + CI.pill('p-gray', t('preset.' + s.preset)) : ''}</div>
    </div>
    <div class="lrow-act">${opts.lib ? `
      <button class="btn-ghost btn-sm" onclick="L.preview('${id}')">👁 ${t('l.preview')}</button>
      <button class="btn-brand btn-sm" onclick="L.copyTest('${id}')">⧉ ${t('l.takeCopy')}</button>
      ${CI.isAdmin() ? `<button class="btn-ghost btn-sm" onclick="L.setShared('${id}', false)">🚫 ${t('l.unshare')}</button>` : ''}` : `
      <button class="btn-p btn-sm" onclick="L.go('live','${id}')">📊 ${t('l.results')}</button>
      <button class="btn-ghost btn-sm" onclick="L.share('${id}')">🔗 ${t('l.linkQr')}</button>
      ${CI.menuHtml('tm-' + id, [
        {label:'✏️ ' + t('c.edit'), fn:`L.go('editor','${id}')`},
        {label:'👁 ' + t('l.preview'), fn:`L.preview('${id}')`},
        x.status === 'open' ? {label:'🔒 ' + t('l.close'), fn:`L.setStatus('${id}','closed')`} : {label:'▶ ' + t('l.open'), fn:`L.setStatus('${id}','open')`},
        {label:'⧉ ' + t('l.duplicate'), fn:`L.copyTest('${id}')`},
        qs.some(k => L.HANZI_TYPES.includes(x.questions[k].type)) ? {label:'🖥 ' + t('hz.present'), fn:`L.hz.present('${id}')`} : null,
        {label:'🖨 ' + t('l.printPaper'), fn:`L.printPaper('${id}')`},
        CI.isAdmin() ? {label: x.shared ? '🚫 ' + t('l.unshare') : '🌐 ' + t('l.makeShared'), fn:`L.setShared('${id}', ${!x.shared})`} : null,
        {label:'🗑 ' + t('c.delete'), fn:`L.delTest('${id}')`, danger:true}
      ])}`}
    </div></div>`;
}
function drawTests(){
  if(!L.testsLoaded){ app.innerHTML = L.shell(`<p class="muted">${t('c.loading')}</p>`); return; }
  let list = L.myTests();
  const all = list.length;
  if(q) list = list.filter(([id,x]) => String(x.title).toLowerCase().includes(q) || String(x.ownerName||'').toLowerCase().includes(q));
  if(fStatus) list = list.filter(([id,x]) => (x.status || 'draft') === fStatus);
  const open = L.myTests().filter(([,x]) => x.status === 'open').length;
  app.innerHTML = L.shell(`
    <div class="flex mb">
      <button class="btn-red" onclick="L.go('editor')">➕ ${t('l.newTest')}</button>
      <input placeholder="${esc(t('c.search'))}" value="${esc(q)}" style="max-width:260px" oninput="L.search(this.value)" id="l-q">
      <select style="max-width:170px" onchange="L.filter(this.value)"><option value="">${t('c.all')} (${all})</option>
        ${['open','draft','closed'].map(s => `<option value="${s}" ${fStatus===s?'selected':''}>${t('l.st.'+s)}</option>`).join('')}</select>
      ${CI.isAdmin() ? `<label class="chk" style="margin:0"><input type="checkbox" ${L.showAll?'checked':''} onchange="L.showAll=this.checked;L.redraw()"> ${t('l.showAllTeachers')}</label>` : ''}
      <span class="spacer"></span><span class="muted">${t('l.openNow',{n:open})}</span>
    </div>
    ${L.testsErr ? `<div class="note red">${CI.errMsg(L.testsErr)}</div>` : ''}
    ${!list.length ? `<div class="card"><div class="empty"><span class="ico">📚</span>${all ? t('l.noMatch') : t('l.noTests')}</div>
      ${all ? '' : `<div class="center"><button class="btn-red" onclick="L.go('editor')">➕ ${t('l.newTest')}</button></div>`}</div>` :
      list.map(([id,x]) => testRow(id, x)).join('')}`);
}
L.search = v => { q = v.trim().toLowerCase(); drawTests(); const i = $('#l-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
L.filter = v => { fStatus = v; drawTests(); };

/* ---------------------------------------------------------------- 🌐 Umumiy kutubxona */
function drawLibrary(){
  const list = Object.entries(L.shared).sort((a,b) => (b[1].createdAt||0) - (a[1].createdAt||0));
  app.innerHTML = L.shell(`<div class="card"><h2>🌐 ${t('l.tab.library')}</h2><p class="muted">${t('l.libHint')}</p></div>
    ${!list.length ? `<div class="card"><div class="empty"><span class="ico">🌐</span>${t('l.libEmpty')}</div></div>` : list.map(([id,x]) => testRow(id, x, {lib:true})).join('')}`);
}

/* ---------------------------------------------------------------- amallar */
L.setStatus = (id, st) => CI.db.ref('tests/' + id).update({ status: st, updatedAt: Date.now() })
  .then(() => CI.log('test.' + st, { targetName: L.tests[id].title, testId: id }), e => CI.toast(CI.errMsg(e), 'err'));
/* Umumiy kutubxona: admin testni ulashganda kalitlar "libKeys" ga ko'chiriladi (faqat laoshilar o'qiydi, o'quvchilar emas) */
L.setShared = async (id, v) => {
  try{
    const up = { ['tests/' + id + '/shared']: v ? true : null };
    if(v){ const k = (await CI.db.ref('testKeys/' + id).once('value')).val(); up['libKeys/' + id] = k ? { answers: k.answers || null } : null; }
    else up['libKeys/' + id] = null;
    await CI.db.ref().update(up);
    CI.log(v ? 'test.share' : 'test.unshare', { targetName: (L.testById(id)||{}).title, testId: id });
  }catch(e){ CI.toast(CI.errMsg(e), 'err'); }
};
L.copyTest = async id => {
  const src = L.testById(id); if(!src) return;
  let keys = null;
  try{ keys = (await CI.db.ref('testKeys/' + id).once('value')).val(); }catch(e){ keys = null; }
  if(!keys){ try{ keys = (await CI.db.ref('libKeys/' + id).once('value')).val(); }catch(e){} }
  const nid = CI.rid(10);
  const copy = JSON.parse(JSON.stringify(src));
  delete copy.shared; delete copy.updatedBy;
  Object.assign(copy, { title: src.title + (src.ownerUid === CI.me() ? ' (2)' : ''), ownerUid: CI.me(), ownerName: CI.myName(),
    createdAt: Date.now(), updatedAt: Date.now(), status: 'draft', sourceId: id, groupId: null });
  const up = { ['tests/' + nid]: copy, ['testKeys/' + nid]: { answers: (keys && keys.answers) || {}, pin: L.newPin() } };
  CI.db.ref().update(up).then(() => { CI.log('test.copy', { targetName: src.title, testId: nid }); CI.toast(t('l.copied'), 'ok'); L.go('editor', nid); },
    e => CI.toast(CI.errMsg(e), 'err'));
};
L.newPin = () => String(Math.floor(1000 + Math.random()*9000));
L.delTest = async id => {
  const x = L.tests[id]; if(!x) return;
  if(!await CI.confirm(t('l.delQ', {name: esc(x.title)}), {danger:true})) return;
  try{
    const [k, s, r] = await Promise.all(['testKeys/','sessions/','results/'].map(p => CI.db.ref(p + id).once('value').then(v => v.val()).catch(() => null)));
    await CI.trashPut('test', x.ownerUid, x.title, { test: x, keys: k, sessions: s, results: r }, { refId: id });
    await CI.db.ref().update({ ['tests/' + id]: null, ['testKeys/' + id]: null, ['sessions/' + id]: null, ['results/' + id]: null });
    CI.log('test.delete', { targetName: x.title, testId: id });
    CI.toast(t('l.deleted'), 'ok');
  }catch(e){ CI.toast(CI.errMsg(e), 'err'); }
};
L.share = id => {
  const x = L.testById(id); const link = L.link(id); const g = x.groupId ? CI.G.groups[x.groupId] : null;
  CI.modal({ title: '🔗 ' + esc(x.title), html: `
    <p class="muted">${g ? t('l.shareGroup', {g: esc(g.name)}) : t('l.shareOpen')}</p>
    <div class="center mt"><div class="qrbox" style="width:260px">${CI.qrSvg(link)}</div></div>
    <div class="linkbox mt"><input readonly value="${esc(link)}"><button class="btn-ghost btn-sm" onclick="CI.copy(${CI.jsq(link)}, this)">${t('c.copy')}</button></div>
    ${g ? `<p class="muted mt">💡 ${t('l.sharePortal')}</p><div class="linkbox"><input readonly value="${esc(CI.G.portalLink(x.groupId))}"></div>` : ''}
    ${x.status !== 'open' ? `<div class="note">${t('l.notOpenWarn')}</div>` : ''}`,
    actions: [ x.status !== 'open' ? {label: '▶ ' + t('l.open'), cls:'btn-brand', fn: () => L.setStatus(id, 'open')} : null,
      {label: '⛶ ' + t('l.bigQr'), cls:'btn-ghost', fn: () => L.bigQr(link, x.title)}, {label: t('c.close'), cls:'btn-p'}].filter(Boolean) });
};
L.bigQr = (link, title) => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:250;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;cursor:pointer';
  el.innerHTML = `<h1>${esc(title)}</h1><div style="width:min(80vh,90vw)">${CI.qrSvg(link)}</div><div class="muted" style="font-size:18px">${esc(link)}</div>`;
  el.onclick = () => el.remove(); document.body.appendChild(el);
};
L.preview = id => window.open(L.link(id) + '&preview=1', '_blank');

/* Qog'ozda chop etish (oflayn imtihon uchun) */
L.printPaper = async id => {
  const x = L.testById(id); const qs = L.qOrder(x);
  let keys = null; try{ keys = (await CI.db.ref('testKeys/' + id).once('value')).val(); }catch(e){}
  const w = window.open('', '_blank'); if(!w) return;
  const qHtml = (k, i) => { const qq = x.questions[k];
    let body = '';
    if(qq.type === 'single' || qq.type === 'multi') body = (qq.options||[]).map((o,j) => `<div>${qq.type==='multi'?'☐':'○'} ${L.LETTERS[j]}) ${esc(o)}</div>`).join('');
    else if(qq.type === 'tf') body = `<div>○ ${esc(t('q.true'))} &nbsp; ○ ${esc(t('q.false'))}</div>`;
    else if(qq.type === 'writing') body = `<div style="display:flex;gap:6px">${'<span style="width:60px;height:60px;border:1px solid #c33;display:inline-block"></span>'.repeat(qq.charCount||1)}</div>`;
    else body = '<div style="border-bottom:1px solid #999;height:28px;width:70%"></div>';
    return `<div class="q"><b>${i+1}.</b> ${esc(L.qPromptText(qq))}${body}</div>`; };
  const keyLine = keys && keys.answers ? qs.map((k,i) => { const a = keys.answers[k] || {}, qq = x.questions[k];
    const v = qq.type === 'single' ? L.LETTERS[a.c] : qq.type === 'multi' ? (a.c||[]).map(j => L.LETTERS[j]).join('') : qq.type === 'tf' ? (a.c ? t('q.true') : t('q.false')) : (a.accepted||[])[0] || '';
    return `${i+1}) ${esc(v)}`; }).join(' &nbsp; ') : '';
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(x.title)}</title><style>body{font-family:Inter,system-ui,'PingFang SC',sans-serif;margin:14mm;font-size:13px}
    h1{font-size:18px}.q{margin:10px 0;break-inside:avoid}.q div{margin:3px 0 3px 18px}.key{page-break-before:always}</style>
    <h1>${esc(x.title)}</h1><p>${esc(t('c.name'))}: ______________________ &nbsp; ${esc(t('c.date'))}: ____________</p>
    ${qs.map(qHtml).join('')}${keyLine ? `<div class="key"><h1>${esc(t('l.answerKey'))}</h1><p>${keyLine}</p></div>` : ''}<script>setTimeout(()=>print(),300)<\/script>`);
  w.document.close();
};
/* Savolning o'quvchiga ko'rinadigan matni (chop etish va ro'yxatlar uchun) */
L.qPromptText = qq => {
  if(L.HANZI_TYPES.includes(qq.type)){ const p = qq.prompt || {};
    return [qq.text, p.hanzi, p.pinyin, p.translation].filter(Boolean).join(' · ') || t('qt.' + qq.type); }
  return qq.text || '';
};

/* ---------------------------------------------------------------- kirish tarixi */
function recordLogin(){
  const key = 'l.login.' + CI.me(); const last = +(CI.ls.get(key) || 0);
  if(Date.now() - last < 6*3600*1000) return;    // bir sessiyada qayta-qayta yozmaslik
  CI.ls.set(key, String(Date.now()));
  const ua = navigator.userAgent;
  const os = /Windows NT 10/.test(ua) ? 'Windows 10/11' : /Windows/.test(ua) ? 'Windows' : /Android ([\d.]+)/.test(ua) ? 'Android ' + RegExp.$1 :
    /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '?';
  const br = /Edg\/(\d+)/.test(ua) ? 'Edge ' + RegExp.$1 : /OPR\/(\d+)/.test(ua) ? 'Opera ' + RegExp.$1 : /Chrome\/(\d+)/.test(ua) ? 'Chrome ' + RegExp.$1 :
    /Firefox\/(\d+)/.test(ua) ? 'Firefox ' + RegExp.$1 : /Safari/.test(ua) ? 'Safari' : '?';
  const rec = { at: CI.serverNow(), os, browser: br, mobile: /Mobi|Android/.test(ua) };
  fetch('https://api.ipify.org?format=json', {cache:'no-store'}).then(r => r.json()).then(j => j.ip).catch(() => '')
    .then(ip => { rec.ip = ip || null; return CI.db.ref('logins/' + CI.me()).push(rec); })
    .then(() => CI.log('auth.login', { note: os + ' · ' + br + (rec.ip ? ' · IP ' + rec.ip : '') }))
    .then(() => CI.db.ref('logins/' + CI.me()).once('value')).then(s => {      // eng oxirgi 50 tasi qoladi
      const keys = Object.keys(s.val() || {}); if(keys.length > 50){ const up = {}; keys.slice(0, keys.length - 50).forEach(k => up[k] = null); CI.db.ref('logins/' + CI.me()).update(up); }
    }).catch(() => {});
}
})();
