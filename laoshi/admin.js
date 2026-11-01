/* ============================================================================
   LAOSHI — administrator: laoshilar, barcha testlar, e'lonlar, qaydlar, korzinka, zaxira, eski bazadan import
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, L = window.L, t = (k,v) => CI.t(k,v), esc = CI.esc, $ = CI.$;
const A = L.admin = {};
const TRASH_DAYS = 90;
const body = () => $('#l-body');

A.render = view => {
  if(view !== 'trash' && view !== 'logins' && !CI.isAdmin()){ L.go('tests'); return; }
  L.app.innerHTML = L.shell(`<p class="muted">${t('c.loading')}</p>`);
  ({ teachers, alltests, announce, logs: logs_, trash, backup, logins })[view]();
};

/* ---------------------------------------------------------------- 👩‍🏫 laoshilar */
let secApp = null;
function secondaryAuth(){ if(!secApp) secApp = firebase.initializeApp(CI.cfg.firebase, 'secondary');
  const a = secApp.auth(); if(CI.cfg.emulator && !a._emu){ a.useEmulator(`http://${CI.cfg.emulator.host}:${CI.cfg.emulator.authPort}`); a._emu = true; } return a; }
async function teachers(){
  const [ts, tests] = await Promise.all([CI.db.ref('teachers').once('value').then(s => s.val() || {}), Promise.resolve(L.tests)]);
  const cnt = {}; Object.values(tests).forEach(x => cnt[x.ownerUid] = (cnt[x.ownerUid]||0) + 1);
  const list = Object.entries(ts).sort((a,b) => (a[1].role === 'admin' ? 0 : 1) - (b[1].role === 'admin' ? 0 : 1) || String(a[1].name).localeCompare(String(b[1].name)));
  body().innerHTML = `<div class="card"><h2>➕ ${t('ad.newTeacher')}</h2><p class="muted">${t('ad.newTeacherHint')}</p>
    <div class="row"><div><label>${t('auth.name')}</label><input id="nt-n"></div><div><label>${t('auth.email')}</label><input id="nt-e" type="email"></div>
      <div style="flex:0 0 150px"><label>${t('auth.pass')}</label><input id="nt-p" value="111111"></div>
      <div style="flex:0 0 auto"><label>&nbsp;</label><button class="btn-brand" onclick="L.admin.create()">➕ ${t('c.add')}</button></div></div><div id="nt-msg"></div></div>
    <div class="card"><h2>👩‍🏫 ${t('l.tab.teachers')} <span class="muted" style="font-family:var(--sans);font-size:14px">${list.length}</span></h2>
    ${list.map(([u,x]) => `<div class="lrow"><div class="lrow-main"><div class="lrow-title">${esc(x.name)} ${x.role === 'admin' ? CI.pill('p-blue','🛡 ' + t('ad.admin')) : ''}
      ${x.active === false ? CI.pill('p-red', '⛔ ' + t('ad.restricted')) : ''} ${u === CI.me() ? CI.pill('p-gray', t('ad.you')) : ''}</div>
      <div class="lrow-sub">${esc(x.email||'')} · ${t('ad.testsN', {n: cnt[u]||0})} · ${CI.fmtD(x.createdAt)}</div></div>
      ${u === CI.me() ? '' : `<div class="lrow-act">
        ${x.active === false ? `<button class="btn-brand btn-sm" onclick="L.admin.setActive('${u}',true)">✓ ${t('ad.allow')}</button>` : `<button class="btn-ghost btn-sm" onclick="L.admin.setActive('${u}',false)">⛔ ${t('ad.restrict')}</button>`}
        ${CI.menuHtml('tu-' + u, [
          {label: '🔑 ' + t('ad.resetLink'), fn: `L.admin.resetLink(${CI.jsq(x.email)})`},
          {label: '🔁 ' + t('ad.force111'), fn: `L.admin.force('${u}')`},
          x.role === 'admin' ? {label: '👤 ' + t('ad.makeTeacher'), fn: `L.admin.role('${u}','teacher')`} : {label: '🛡 ' + t('ad.makeAdmin'), fn: `L.admin.role('${u}','admin')`},
          {label: '🗑 ' + t('c.delete'), fn: `L.admin.delTeacher('${u}')`, danger: true}])}</div>`}</div>`).join('')}</div>`;
  A._ts = ts;
}
A.create = async () => {
  const n = $('#nt-n').value.trim(), e = $('#nt-e').value.trim(), p = $('#nt-p').value;
  const msg = (m, c) => $('#nt-msg').innerHTML = `<div class="note ${c||'red'}">${m}</div>`;
  if(n.length < 2 || !e || p.length < 6) return msg(t('auth.e.fields') + ' ' + t('auth.e.weak'));
  try{
    const sa = secondaryAuth(); const cred = await sa.createUserWithEmailAndPassword(e, p); const u = cred.user.uid; await sa.signOut();
    await CI.db.ref('teachers/' + u).set({ name: n, email: e, role: 'teacher', active: true, createdAt: Date.now(), createdBy: CI.myName() });
    CI.log('teacher.create', { targetName: n, note: e });
    teachers(); CI.modal({ title: '✓ ' + t('ad.created'), html: `<p>${t('ad.createdText')}</p><pre class="code" style="display:block;padding:10px;white-space:pre-wrap">${esc(location.origin + location.pathname)}\n${esc(e)}\n${esc(p)}</pre>` });
  }catch(err){ msg(CI.authErr(err)); }
};
A.setActive = (u, v) => CI.db.ref('teachers/' + u + '/active').set(v).then(() => { CI.log(v ? 'teacher.allow' : 'teacher.restrict', { targetName: A._ts[u].name }); teachers(); }, e => CI.toast(CI.errMsg(e), 'err'));
A.role = async (u, r) => { if(!await CI.confirm(t('ad.roleQ', {name: esc(A._ts[u].name), r: t(r === 'admin' ? 'ad.admin' : 'ad.teacher')}))) return;
  CI.db.ref('teachers/' + u + '/role').set(r).then(() => { CI.log('teacher.role', { targetName: A._ts[u].name, note: r }); teachers(); }, e => CI.toast(CI.errMsg(e), 'err')); };
A.resetLink = email => CI.auth.sendPasswordResetEmail(email).then(() => CI.toast(t('auth.resetSent'), 'ok'), e => CI.toast(CI.authErr(e), 'err'));
A.force = async u => {
  if(!CI.cfg.appsScriptUrl) return CI.modal({ title: '🔁 ' + t('ad.force111'), html: `<p>${t('ad.needGas')}</p>` });
  if(!await CI.confirm(t('ad.forceQ', {name: esc(A._ts[u].name)}))) return;
  try{ const r = await L.gas({ action: 'resetPassword', idToken: await CI.user.getIdToken(), targetUid: u });
    if(!r.ok) throw new Error(r.error); CI.toast(t('ad.forced'), 'ok'); CI.log('teacher.force111', { targetName: A._ts[u].name }); }
  catch(e){ CI.toast(CI.errMsg(e), 'err'); }
};
A.delTeacher = async u => {
  const x = A._ts[u]; if(!await CI.confirm(t('ad.delTeacherQ', {name: esc(x.name)}), {danger: true})) return;
  try{
    await CI.trashPut('teacher', CI.me(), x.name, { uid: u, profile: x }, { refId: u });
    await CI.db.ref('teachers/' + u).remove();
    if(CI.cfg.appsScriptUrl){ L.gas({ action: 'deleteUser', idToken: await CI.user.getIdToken(), targetUid: u }).catch(() => {}); }
    CI.log('teacher.delete', { targetName: x.name, note: x.email }); teachers();
  }catch(e){ CI.toast(CI.errMsg(e), 'err'); }
};

/* ---------------------------------------------------------------- 📋 barcha testlar */
async function alltests(){
  L.showAll = true;
  const list = Object.entries(L.tests).sort((a,b) => (b[1].createdAt||0) - (a[1].createdAt||0));
  const owners = [...new Set(list.map(([,x]) => x.ownerName || '?'))].sort();
  body().innerHTML = `<div class="card"><h2>📋 ${t('l.tab.alltests')} <span class="muted" style="font-family:var(--sans);font-size:14px">${list.length}</span></h2>
    <div class="flex"><select id="at-o" style="max-width:240px" onchange="L.admin.atDraw()"><option value="">${t('c.all')}</option>${owners.map(o => `<option>${esc(o)}</option>`).join('')}</select>
    <select id="at-s" style="max-width:180px" onchange="L.admin.atDraw()"><option value="">${t('c.all')}</option>${['open','draft','closed'].map(s => `<option value="${s}">${t('l.st.' + s)}</option>`).join('')}</select>
    <button class="btn-ghost btn-sm" onclick="L.admin.atCount()">📊 ${t('ad.countResults')}</button></div></div><div id="at-list"></div>`;
  A.atDraw();
}
A.atDraw = () => {
  const o = $('#at-o').value, s = $('#at-s').value;
  const list = Object.entries(L.tests).filter(([,x]) => (!o || x.ownerName === o) && (!s || (x.status||'draft') === s)).sort((a,b) => (b[1].createdAt||0) - (a[1].createdAt||0));
  $('#at-list').innerHTML = `<div class="tbl"><table><tr><th>${t('e.title')}</th><th>${t('ad.owner')}</th><th>❓</th><th>${t('c.status')}</th><th>${t('c.date')}</th><th>👥</th><th></th></tr>
    ${list.map(([id,x]) => `<tr><td><b>${esc(x.title)}</b>${x.shared ? ' 🌐' : ''}</td><td>${esc(x.ownerName||'')}</td><td>${L.qOrder(x).length}</td><td>${L.STATUS_PILL(x.status)}</td>
      <td class="muted">${CI.fmtD(x.createdAt)}</td><td>${A._cnt ? (A._cnt[id] ?? '—') : '…'}</td>
      <td class="nowrap"><button class="btn-ghost btn-xs" onclick="L.go('live','${id}')">📊</button><button class="btn-ghost btn-xs" onclick="L.go('editor','${id}')">✏️</button>
      <button class="btn-ghost btn-xs" onclick="L.delTest('${id}')">🗑</button></td></tr>`).join('')}</table></div>`;
};
A.atCount = async () => { A._cnt = {}; await Promise.all(Object.keys(L.tests).map(id => CI.db.ref('sessions/' + id).once('value').then(s => A._cnt[id] = s.numChildren()).catch(() => {}))); A.atDraw(); };

/* ---------------------------------------------------------------- 📢 e'lonlar */
async function announce(){
  const items = Object.entries((await CI.db.ref('announcements').once('value')).val() || {}).sort((a,b) => (b[1].at||0) - (a[1].at||0));
  body().innerHTML = `<div class="card"><h2>📢 ${t('l.tab.announce')}</h2><p class="muted">${t('ad.annHint')}</p>
    <label>${t('ad.annTitle')}</label><input id="an-t"><label>${t('ad.annText')}</label><textarea id="an-x" rows="3"></textarea>
    <button class="btn-brand mt" onclick="L.admin.post()">📢 ${t('ad.post')}</button></div>
    ${items.map(([id,a]) => `<div class="lrow"><div class="lrow-main"><div class="lrow-title">${esc(a.title)}</div><div class="lrow-sub">${esc(a.text||'')}<br>${CI.fmtDT(a.at)} · ${esc(a.byName||'')}</div></div>
      <div class="lrow-act"><button class="btn-ghost btn-sm" onclick="L.admin.delAnn('${id}')">🗑</button></div></div>`).join('')}`;
}
A.post = () => { const ti = $('#an-t').value.trim(), x = $('#an-x').value.trim(); if(!ti) return;
  CI.db.ref('announcements').push({ title: ti, text: x, at: Date.now(), byName: CI.myName() }).then(() => { CI.log('announce.post', { targetName: ti }); announce(); }); };
A.delAnn = async id => { const s = (await CI.db.ref('announcements/' + id).once('value')).val(); await CI.trashPut('announce', CI.me(), s.title, { id, a: s });
  await CI.db.ref('announcements/' + id).remove(); announce(); };

/* ---------------------------------------------------------------- 🧾 qaydlar */
let logRows = [];
async function logs_(){
  logRows = Object.entries((await CI.db.ref('logs').orderByChild('at').limitToLast(1000).once('value')).val() || {}).map(([id,r]) => Object.assign({ id }, r)).sort((a,b) => (b.at||0) - (a.at||0));
  const acts = [...new Set(logRows.map(r => r.action))].sort();
  body().innerHTML = `<div class="card"><h2>🧾 ${t('l.tab.logs')}</h2><div class="flex">
    <input id="lg-q" placeholder="${esc(t('c.search'))}" style="max-width:240px" oninput="L.admin.lgDraw()">
    <select id="lg-a" style="max-width:220px" onchange="L.admin.lgDraw()"><option value="">${t('c.all')}</option>${acts.map(a => `<option value="${a}">${esc(t('log.' + a))}</option>`).join('')}</select>
    <select id="lg-d" style="max-width:160px" onchange="L.admin.lgDraw()"><option value="0">${t('c.all')}</option><option value="1">24h</option><option value="7">7d</option><option value="30">30d</option></select>
    <button class="btn-ghost btn-sm" onclick="L.admin.lgDl('csv')">⬇ CSV</button><button class="btn-ghost btn-sm" onclick="L.admin.lgDl('json')">⬇ JSON</button></div></div><div id="lg-list"></div>`;
  A.lgDraw();
}
function logsFiltered(){ const q = ($('#lg-q')||{}).value?.toLowerCase() || '', a = ($('#lg-a')||{}).value || '', d = +(($('#lg-d')||{}).value || 0);
  return logRows.filter(r => (!a || r.action === a) && (!d || Date.now() - r.at < d*86400000) && (!q || [r.byName, r.byEmail, r.targetName, r.note].join(' ').toLowerCase().includes(q))); }
A.lgDraw = () => { const list = logsFiltered().slice(0, 400);
  $('#lg-list').innerHTML = `<div class="tbl"><table><tr><th>${t('c.time')}</th><th>${t('ad.who')}</th><th>${t('ad.action')}</th><th>${t('ad.what')}</th></tr>
    ${list.map(r => `<tr><td class="nowrap muted">${CI.fmtDT(r.at)}</td><td>${esc(r.byName||'')}<div class="muted" style="font-size:11.5px">${esc(r.byEmail||'')}</div></td>
      <td>${esc(t('log.' + r.action))}</td><td>${esc(r.targetName||'')}${r.note ? `<div class="muted" style="font-size:12px">${esc(r.note)}</div>` : ''}</td></tr>`).join('')}</table></div>`; };
A.lgDl = fmt => { const list = logsFiltered();
  if(fmt === 'json') return CI.downloadFile('logs-' + CI.dayKey() + '.json', JSON.stringify(list, null, 2), 'application/json');
  CI.downloadFile('logs-' + CI.dayKey() + '.csv', CI.toCsv([[t('c.time'), t('ad.who'), 'Email', t('ad.action'), t('ad.what'), t('a.note')]].concat(list.map(r => [CI.fmtDT(r.at), r.byName, r.byEmail, t('log.' + r.action), r.targetName, r.note]))), 'text/csv;charset=utf-8'); };

/* ---------------------------------------------------------------- 🗑 korzinka */
async function trash(){
  const raw = CI.isAdmin() ? (await CI.db.ref('trash').once('value')).val() || {} : { [CI.me()]: (await CI.db.ref('trash/' + CI.me()).once('value')).val() || {} };
  const list = []; Object.entries(raw).forEach(([o, items]) => Object.entries(items || {}).forEach(([id, r]) => list.push(Object.assign({ _o: o, _id: id }, r))));
  list.sort((a,b) => (b.deletedAt||0) - (a.deletedAt||0)); A._trash = list;
  const K = { test: '📚', session: '👤', teacher: '👩‍🏫', group: '👥', announce: '📢' };
  body().innerHTML = `<div class="card"><h2>🗑 ${t('l.tab.trash')}</h2><p class="muted">${t('ad.trashHint', {d: TRASH_DAYS})}</p></div>
    ${!list.length ? `<div class="card"><div class="empty"><span class="ico">🗑</span>${t('ad.trashEmpty')}</div></div>` : list.map((r, i) => `<div class="lrow"><div class="lrow-main">
      <div class="lrow-title">${K[r.kind] || '•'} ${esc(r.title)}</div><div class="lrow-sub">${t('ad.kind.' + r.kind)} · ${CI.fmtDT(r.deletedAt)} · ${esc(r.deletedByName||'')}
      · ${t('ad.daysLeft', {d: Math.max(0, TRASH_DAYS - Math.floor((Date.now() - r.deletedAt) / 86400000))})}</div></div>
      <div class="lrow-act"><button class="btn-brand btn-sm" onclick="L.admin.restore(${i})">↺ ${t('ad.restore')}</button>
      <button class="btn-ghost btn-sm" onclick="L.admin.purge(${i})">✕ ${t('ad.purge')}</button></div></div>`).join('')}`;
}
A.restore = async i => {
  const r = A._trash[i], p = JSON.parse(r.payload || 'null'); if(!p) return;
  try{
    const up = {};
    if(r.kind === 'test'){ const id = r.refId; up['tests/' + id] = p.test; if(p.keys) up['testKeys/' + id] = p.keys; if(p.sessions) up['sessions/' + id] = p.sessions; if(p.results) up['results/' + id] = p.results; }
    else if(r.kind === 'session'){ up['sessions/' + p.tid + '/' + p.sid] = p.session; if(p.result) up['results/' + p.tid + '/' + p.sid] = p.result; }
    else if(r.kind === 'teacher') up['teachers/' + p.uid] = p.profile;
    else if(r.kind === 'announce') up['announcements/' + p.id] = p.a;
    else if(r.kind === 'group'){ await CI.G.restore(r.refId, p); }
    up['trash/' + r._o + '/' + r._id] = null;
    await CI.db.ref().update(up); CI.log('trash.restore', { targetName: r.title, note: r.kind }); CI.toast(t('ad.restored'), 'ok'); trash();
  }catch(e){ CI.toast(CI.errMsg(e), 'err'); }
};
A.purge = async i => { const r = A._trash[i]; if(!await CI.confirm(t('ad.purgeQ', {name: esc(r.title)}), {danger: true})) return;
  CI.db.ref('trash/' + r._o + '/' + r._id).remove().then(() => { CI.log('trash.purge', { targetName: r.title }); trash(); }); };
A.purgeOldTrash = () => CI.db.ref('trash').once('value').then(s => { const up = {}; Object.entries(s.val() || {}).forEach(([o, items]) =>
  Object.entries(items || {}).forEach(([id, r]) => { if(Date.now() - (r.deletedAt||0) > TRASH_DAYS*86400000) up[o + '/' + id] = null; }));
  if(Object.keys(up).length) CI.db.ref('trash').update(up); }).catch(() => {});

/* ---------------------------------------------------------------- 🔐 kirishlarim */
async function logins(){
  const list = Object.values((await CI.db.ref('logins/' + CI.me()).once('value')).val() || {}).sort((a,b) => (b.at||0) - (a.at||0)).slice(0, 30);
  body().innerHTML = `<div class="card"><h2>🔐 ${t('ad.logins')}</h2><p class="muted">${t('ad.loginsHint')}</p>
    <div class="tbl"><table><tr><th>${t('c.time')}</th><th>${t('ad.device')}</th><th>IP</th></tr>${list.map(r => `<tr><td>${CI.fmtDT(r.at)}</td><td>${r.mobile ? '📱' : '💻'} ${esc(r.os)} · ${esc(r.browser)}</td><td class="muted">${esc(r.ip || '—')}</td></tr>`).join('')}</table></div></div>`;
}

/* ---------------------------------------------------------------- 💾 zaxira */
const NODES = ['system','teachers','groups','groupStudents','roster','codes','tests','testKeys','libKeys','sessions','results','words','attendance','announcements','logs','trash','logins'];
async function backup(){
  body().innerHTML = `<div class="card"><h2>💾 ${t('ad.backup')}</h2><p class="muted">${t('ad.backupHint')}</p>
      <button class="btn-brand mt" onclick="L.admin.download()">⬇ ${t('ad.download')}</button><div id="bk-msg"></div></div>
    <div class="card"><h2>↺ ${t('ad.restoreTitle')}</h2><p class="muted">${t('ad.restoreHint')}</p>
      <input type="file" id="bk-f" accept=".json,application/json"><div id="bk-info"></div></div>
    <div class="card"><h2>📦 ${t('ad.importOld')}</h2><p class="muted">${t('ad.importOldHint')}</p>
      <input type="file" id="old-f" accept=".json,application/json"><div id="old-info"></div></div>`;
  $('#bk-f').onchange = e => readJson(e.target.files[0], d => {
    const st = NODES.filter(n => d[n]).map(n => n + ': ' + Object.keys(d[n]).length).join(' · ');
    $('#bk-info').innerHTML = `<div class="note">${esc(st)}</div><button class="btn-red" onclick="L.admin.doRestore()">↺ ${t('ad.restoreBtn')}</button>`; A._bk = d; });
  $('#old-f').onchange = e => readJson(e.target.files[0], d => {
    if(!d.tests && !d.hanziGroups && !d.hanziWords){ $('#old-info').innerHTML = `<div class="note red">${t('ad.notOld')}</div>`; return; }
    const st = ['tests','hanziGroups','hanziWords','hanziAssignments'].filter(n => d[n]).map(n => n + ': ' + Object.keys(d[n]).length).join(' · ');
    $('#old-info').innerHTML = `<div class="note">${esc(st)}</div><button class="btn-brand" onclick="L.admin.doImportOld()">📦 ${t('ad.importBtn')}</button>`; A._old = d; });
}
function readJson(f, cb){ if(!f) return; const r = new FileReader(); r.onload = () => { try{ cb(JSON.parse(r.result)); }catch(e){ CI.toast('JSON?', 'err'); } }; r.readAsText(f, 'utf-8'); }
A.download = async () => {
  const out = {}; const msg = $('#bk-msg');
  for(const n of NODES){ msg.innerHTML = `<p class="muted">${n}…</p>`; try{ const v = (await CI.db.ref(n).once('value')).val(); if(v != null) out[n] = v; }catch(e){} }
  const d = new Date(); const name = `laoshi-zhuli-${CI.dayKey(d)}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.json`;
  CI.downloadFile(name, JSON.stringify(out), 'application/json'); msg.innerHTML = `<div class="note green">✓ ${esc(name)}</div>`; CI.log('backup.download');
};
A.doRestore = async () => {
  if(!await CI.confirm(t('ad.restoreQ'), {danger: true})) return;
  try{ const up = {}; NODES.forEach(n => { if(A._bk[n]) up[n] = A._bk[n]; }); await CI.db.ref().update(up); CI.log('backup.restore'); CI.toast(t('ad.restored'), 'ok'); }
  catch(e){ CI.toast(CI.errMsg(e), 'err'); }
};
/* Eski "Laoshi Test" zaxirasidan: testlar, Hanzi guruhlari (kodlar saqlanadi), so'zlar, Hanzi topshiriqlari.
   Egalik: emaili mos keluvchi laoshiga, topilmasa — importni bajarayotgan adminga. O'quvchi natijalari ko'chirilmaydi. */
A.doImportOld = async () => {
  const d = A._old; const info = $('#old-info');
  try{
    const ts = (await CI.db.ref('teachers').once('value')).val() || {};
    const byEmail = {}; Object.entries(ts).forEach(([u,x]) => { if(x.email) byEmail[x.email.toLowerCase()] = [u, x.name]; });
    const oldT = d.teachers || {};
    const owner = ou => { const e = ((oldT[ou]||{}).email || '').toLowerCase(); return byEmail[e] || [CI.me(), CI.myName()]; };
    const up = {}; let nT = 0, nG = 0, nS = 0, nW = 0, nA = 0;
    // testlar
    Object.entries(d.tests || {}).forEach(([id, x]) => {
      const qs = {}, keys = {}, order = [];
      (x.questions || []).forEach((q, i) => { const k = 'q' + String(i).padStart(3, '0'); order.push(k); qs[k] = { type: 'single', text: q.q, options: q.options, points: 1 }; keys[k] = { c: q.correct }; });
      const [ou, on] = owner(x.ownerUid);
      up['tests/' + id] = { title: x.title, ownerUid: ou, ownerName: on, createdAt: x.createdAt || Date.now(), status: x.closed ? 'closed' : 'open', startAt: x.startAt || null, endAt: x.endAt || null,
        shared: x.shared || null, order, questions: qs, settings: Object.assign({}, { timeLimit: x.timeLimit || 20, attempts: x.attemptLimit || 1, shuffleQ: !!x.shuffleQ, shuffleOpt: !!x.shuffleO,
          oneByOne: false, allowBack: true, onLeave: 'block', maxWarn: 0, unlockCode: true, fullscreen: false, noCopy: true, showScore: 'now', showAnswers: x.showMistakes ? 'now' : 'never', maxScore: 100,
          criteria: (x.criteria || []).map(c => ({ min: c.min, grade: c.label })) }) };
      up['testKeys/' + id] = { answers: keys, pin: L.newPin() }; if(x.shared) up['libKeys/' + id] = { answers: keys }; nT++;
    });
    // guruhlar
    for(const [oo, gs] of Object.entries(d.hanziGroups || {})) for(const [gid, g] of Object.entries(gs || {})){
      const [ou, on] = owner(g.ownerUid || oo);
      up['groups/' + gid] = { name: g.name, ownerUid: ou, ownerName: on, createdAt: g.createdAt || Date.now() }; up['roster/' + gid + '/_owner'] = ou; nG++;
      for(const [sid, s] of Object.entries(g.students || {})){ up['groupStudents/' + gid + '/' + sid] = { name: s.name, code: s.code, addedAt: s.addedAt || Date.now() };
        up['roster/' + gid + '/' + (await CI.codeHash(gid, s.code))] = { s: sid, n: s.name }; up['codes/' + (await CI.sha('code:' + String(s.code).toUpperCase()))] = { g: gid }; nS++; }
    }
    // so'zlar
    Object.entries(d.hanziWords || {}).forEach(([wid, w]) => { const [ou, on] = owner(w.ownerUid); up['words/' + wid] = Object.assign({}, w, { ownerUid: ou, ownerName: on }); nW++; });
    // hanzi topshiriqlari → test
    Object.entries(d.hanziAssignments || {}).forEach(([aid, a]) => {
      const K = (d.hanziKeys || {})[aid] || {}; const qs = {}, keys = {}, order = Object.keys(a.items || {}).sort();
      order.forEach(k => { const it = a.items[k], kk = K[k] || (a.publicKeys || {})[k] || {};
        const prompt = {}; if(it.showHanzi) prompt.hanzi = it.showHanzi; if(it.showPinyin) prompt.pinyin = it.showPinyin; if(it.showTranslation) prompt.translation = it.showTranslation;
        qs[k] = { type: it.type, charCount: it.charCount, target: it.target || null, prompt: Object.keys(prompt).length ? prompt : null, points: 1, wordId: it.wordId || null };
        keys[k] = { hanzi: kk.hanzi, pinyin: kk.pinyin, translation: kk.translation, accepted: kk.accepted || [] }; });
      const [ou, on] = owner(a.ownerUid);
      up['tests/' + aid] = { title: a.title, desc: a.instructions || null, ownerUid: ou, ownerName: on, createdAt: a.createdAt || Date.now(), groupId: a.groupId || null,
        status: a.status === 'published' ? 'open' : a.status === 'closed' ? 'closed' : 'draft', endAt: a.dueAt || null, order, questions: qs,
        settings: { timeLimit: 0, attempts: a.maxAttempts || 0, onLeave: 'off', unlockCode: false, oneByOne: true, allowBack: true, showScore: 'now', showAnswers: 'now', maxScore: a.maxScore || 10,
          requireTones: a.requireTones !== false, tolerance: a.tolerance ?? 3, grid: a.gridType || 'tian', hintAfter: a.allowHints ? 3 : 0, criteria: L.DEFAULT_CRITERIA, preset: 'hanzi' } };
      up['testKeys/' + aid] = { answers: keys, pin: L.newPin() }; nA++;
    });
    info.innerHTML = `<p class="muted">${t('c.loading')}</p>`;
    await CI.db.ref().update(up);
    CI.log('backup.importOld', { note: `tests ${nT}, groups ${nG}, students ${nS}, words ${nW}, hanzi ${nA}` });
    info.innerHTML = `<div class="note green">✓ ${t('ad.importDone', {t: nT, g: nG, s: nS, w: nW, a: nA})}</div>`;
  }catch(e){ info.innerHTML = `<div class="note red">${CI.errMsg(e)}</div>`; }
};
})();
