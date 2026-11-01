/* ============================================================================
   DAVOMAT — laoshi paneli va o'quvchi sahifasi
   Baza:
     attendance/{gid}/{k}/meta       {open, startedAt, ownerUid, lateMin, closeAt, topic, closedAt}   (hamma o'qiydi)
     attendance/{gid}/{k}/rec/{sid}  {st:'p'|'l'|'a'|'e', at, via:'qr'|'hand', n, h, tk, dev, by, note}
     attTokens/{gid}/{k}             {cur, prev, at}       — faqat laoshi o'qiydi; QR har 15 s da almashadi
     attTickets/{gid}/{k}/{tid}      {t, at}               — o'quvchi QR'ni ochganda oladigan 5 daqiqalik chipta
   k = "YYYY-MM-DD" yoki "YYYY-MM-DD_2" (kunning 2-darsi)
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, G = CI.G, t = (k,v) => CI.t(k,v), esc = CI.esc, $ = CI.$;
const ROTATE = 15;                       // QR necha soniyada almashadi
const ST = ['p','l','a','e'];
const ST_CLS = { p:'p-green', l:'p-yellow', a:'p-red', e:'p-blue' };
const ST_BG = { p:'#E3F3EB', l:'#FBF1DC', a:'#F7E8E5', e:'#E7EFF5' };
const ST_FG = { p:'#00865A', l:'#96650a', a:'#BE3A2B', e:'#3D6B8E' };
const params = new URLSearchParams(location.search);
const A = window.ATT = { view: CI.ls.get('att.view') || 'lesson', gid: CI.ls.get('att.gid') || '', date: CI.dayKey(), lesson: 1,
  meta: null, rec: {}, refs: [], month: CI.dayKey().slice(0,7) };
const keyOf = () => A.date + (A.lesson > 1 ? '_' + A.lesson : '');
const app = $('#app');

/* ======================================================================= O'QUVCHI */
if(params.get('g') && params.get('k')){ studentPage(); return; }

/* ======================================================================= LAOSHI */
CI.requireTeacher(app, () => { G.listen(() => { if(A.view !== 'groups') draw(); }); draw(); }, { onProfile: () => draw() });
document.addEventListener('ci:lang', () => { if(CI.user && CI.profile) draw(); });

function shell(inner){
  return CI.topbar({ title: t('a.title'), right: CI.userMenu() }) + `
    <div class="tabs no-print">
      ${[['lesson','✅'],['journal','📒'],['report','📊'],['groups','👥']].map(([v,i]) =>
        `<button class="tab ${A.view===v?'on':''}" onclick="ATT.go('${v}')">${i} ${t('a.tab.'+v)}</button>`).join('')}
    </div><div id="att-body">${inner||''}</div>`;
}
A.go = v => { A.view = v; CI.ls.set('att.view', v); draw(); };
function detach(){ A.refs.forEach(r => r.off()); A.refs = []; }

function draw(){
  if(!CI.profile) return;
  if(A.view === 'groups'){ detach(); app.innerHTML = shell(); G.renderManager($('#att-body')); return; }
  if(A.view === 'journal') return drawJournal();
  if(A.view === 'report') return drawReport();
  drawLesson();
}

/* ---------------------------------------------------------------- DARS (bugungi davomat) */
function lessonPicker(){
  return `<div class="card no-print"><div class="row">
    <div style="flex:2"><label>${t('a.group')}</label>${G.selectHtml('a-g', A.gid, {onchange:'ATT.setG(this.value)'})}</div>
    <div><label>${t('a.date')}</label><input type="date" id="a-d" value="${A.date}" onchange="ATT.setD(this.value)"></div>
    <div style="flex:0 0 120px"><label>${t('a.lesson')}</label><select onchange="ATT.setL(+this.value)">
      ${[1,2,3,4].map(n => `<option value="${n}" ${n===A.lesson?'selected':''}>${t('a.lessonN',{n})}</option>`).join('')}</select></div>
  </div></div>`;
}
A.setG = v => { A.gid = v; CI.ls.set('att.gid', v); attachLesson(); };
A.setD = v => { if(v){ A.date = v; attachLesson(); } };
A.setL = v => { A.lesson = v; attachLesson(); };

function attachLesson(){
  detach(); A.meta = null; A.rec = {}; A.loaded = false;
  if(!A.gid || !G.groups[A.gid] || !G.canManage(G.groups[A.gid])){ drawLesson(); return; }
  G.listenStudents(A.gid, () => { if(A.view === 'lesson') drawLesson(); });
  const base = 'attendance/' + A.gid + '/' + keyOf();
  const m = CI.db.ref(base + '/meta'), r = CI.db.ref(base + '/rec');
  m.on('value', s => { A.meta = s.val(); A.loaded = true; drawLesson(); });
  r.on('value', s => { A.rec = s.val() || {}; drawLesson(); if(P) presDraw(); });
  A.refs.push(m, r); A.attachedFor = A.gid + '|' + keyOf();
}

function drawLesson(){
  if(!CI.profile) return;
  if(A.attachedFor !== A.gid + '|' + keyOf() && A.gid && G.groups[A.gid]){ A.attachedFor = A.gid + '|' + keyOf(); attachLesson(); return; }
  const mine = G.mine(false);
  if(!G.loaded){ app.innerHTML = shell(`<p class="muted">${t('c.loading')}</p>`); return; }
  if(!mine.length){ app.innerHTML = shell(`<div class="card"><div class="empty"><span class="ico">👥</span>${t('a.noGroups')}</div>
    <div class="center"><button class="btn-brand" onclick="ATT.go('groups')">👥 ${t('a.tab.groups')}</button></div></div>`); return; }
  if(!A.gid || !G.groups[A.gid]){ app.innerHTML = shell(lessonPicker() + `<div class="card"><div class="empty"><span class="ico">✅</span>${t('a.pickGroup')}</div></div>`); return; }
  const students = G.sortedStudents(A.gid);
  const meta = A.meta || {};
  const cnt = { p:0, l:0, a:0, e:0, none:0 };
  students.forEach(([sid]) => { const r = A.rec[sid]; cnt[r ? r.st : 'none']++; });
  const devs = {}; Object.values(A.rec).forEach(r => { if(r.dev) devs[r.dev] = (devs[r.dev]||0) + 1; });
  const status = meta.open ? CI.pill('p-green', '● ' + t('a.open')) : meta.closedAt ? CI.pill('p-gray', t('a.closed')) : CI.pill('p-gray', t('a.notStarted'));
  app.innerHTML = shell(lessonPicker() + `
    <div class="card">
      <div class="flex" style="justify-content:space-between">
        <h2 style="margin:0">${esc(G.groups[A.gid].name)} · ${CI.fmtKey(A.date)} <span class="muted" style="font-family:var(--sans);font-size:14px">${CI.weekday(A.date)}${A.lesson>1?' · '+t('a.lessonN',{n:A.lesson}):''}</span></h2>
        ${status}</div>
      ${meta.topic ? `<p class="muted mt">📖 ${esc(meta.topic)}</p>` : ''}
      <div class="stats mt">
        ${ST.map(s => `<div class="stat"><b style="color:${ST_FG[s]}">${cnt[s]}</b><span>${t('a.st.'+s)}</span></div>`).join('')}
        <div class="stat"><b>${cnt.none}</b><span>${t('a.st.none')}</span></div>
      </div>
      <div class="flex">
        <button class="btn-brand" onclick="ATT.qrSetup()">📱 ${t('a.qrStart')}</button>
        <button class="btn-ghost" onclick="ATT.allPresent()">✓ ${t('a.allPresent')}</button>
        <span class="spacer"></span>
        ${meta.open ? `<button class="btn-red" onclick="ATT.finish()">⏹ ${t('a.finish')}</button>` :
          meta.closedAt ? `<button class="btn-ghost btn-sm" onclick="ATT.reopen()">↺ ${t('a.reopen')}</button>` : ''}
      </div>
    </div>
    ${!A.loaded ? `<p class="muted">${t('c.loading')}</p>` : !students.length ? `<div class="card"><p class="muted">${t('g.noStudents')}</p></div>` : `
    <div class="tbl"><table>
      <tr><th>#</th><th>${t('g.student')}</th><th>${t('c.status')}</th><th>${t('c.time')}</th><th></th></tr>
      ${students.map(([sid,s],i) => { const r = A.rec[sid] || {};
        return `<tr><td class="muted">${i+1}</td>
          <td><b>${esc(s.name)}</b>${r.note?`<div class="muted" style="font-size:12px">📝 ${esc(r.note)}</div>`:''}
            ${r.dev && devs[r.dev] > 1 ? `<div style="font-size:12px;color:var(--red)">⚠️ ${t('a.devWarn',{n:devs[r.dev]})}</div>`:''}</td>
          <td class="nowrap">${ST.map(st => `<button class="btn-xs ${r.st===st?'':'btn-ghost'}" style="${r.st===st?`background:${ST_FG[st]};color:#fff`:''};margin:1px"
             title="${esc(t('a.st.'+st))}" onclick="ATT.mark('${sid}','${st}')">${t('a.st.'+st+'1')} <span class="hide-sm">${t('a.st.'+st)}</span></button>`).join('')}</td>
          <td class="muted nowrap" style="font-size:12.5px">${r.at ? CI.fmtHM(r.at) + ' · ' + (r.via==='qr'?'📱':'✋') : ''}</td>
          <td class="nowrap"><button class="btn-ghost btn-xs" title="${esc(t('a.note'))}" onclick="ATT.note('${sid}')">📝</button>
            ${r.st ? `<button class="btn-ghost btn-xs" title="${esc(t('a.clear'))}" onclick="ATT.mark('${sid}',null)">⌫</button>` : ''}</td></tr>`; }).join('')}
    </table></div>`}
    <style>@media(max-width:700px){.hide-sm{display:none}}</style>`);
}

function recPath(sid){ return 'attendance/' + A.gid + '/' + keyOf() + '/rec/' + sid; }
function ensureMeta(extra){
  const m = A.meta || {};
  const base = { ownerUid: m.ownerUid || CI.me(), date: A.date, lesson: A.lesson, lateMin: m.lateMin != null ? m.lateMin : 10 };
  if(!m.startedAt) base.startedAt = Date.now();
  return CI.db.ref('attendance/' + A.gid + '/' + keyOf() + '/meta').update(Object.assign(base, extra || {}));
}
A.mark = (sid, st) => {
  const s = G.students[A.gid][sid];
  const p = st ? ensureMeta().then(() => CI.db.ref(recPath(sid)).update({ st, at: CI.serverNow(), via: 'hand', n: s.name, by: CI.me() }))
               : CI.db.ref(recPath(sid)).remove();
  p.catch(e => CI.toast(CI.errMsg(e), 'err'));
};
A.note = async sid => {
  const r = A.rec[sid] || {}; const v = await CI.prompt(t('a.noteQ'), r.note || ''); if(v == null) return;
  const s = G.students[A.gid][sid];
  ensureMeta().then(() => CI.db.ref(recPath(sid)).update(Object.assign({ note: v.trim() || null, n: s.name }, r.st ? {} : { st: 'e', at: CI.serverNow(), via: 'hand', by: CI.me() })))
    .catch(e => CI.toast(CI.errMsg(e), 'err'));
};
A.allPresent = () => {
  const up = {}; const base = 'attendance/' + A.gid + '/' + keyOf() + '/rec/';
  G.sortedStudents(A.gid).forEach(([sid,s]) => { if(!A.rec[sid]) up[base + sid] = { st: 'p', at: CI.serverNow(), via: 'hand', n: s.name, by: CI.me() }; });
  ensureMeta().then(() => CI.db.ref().update(up)).catch(e => CI.toast(CI.errMsg(e), 'err'));
};
A.finish = async () => {
  const unmarked = G.sortedStudents(A.gid).filter(([sid]) => !A.rec[sid]);
  let markAbs = true;
  const ok = await new Promise(res => CI.modal({ title: '⏹ ' + t('a.finish'), html: `<p>${t('a.finishQ')}</p>
    ${unmarked.length ? `<label class="chk"><input type="checkbox" id="fin-abs" checked> ${t('a.finishMark',{n:unmarked.length})}</label>` : ''}`,
    onClose: () => res(false),
    actions: [{label:t('c.cancel'), cls:'btn-ghost'}, {label:t('a.finish'), cls:'btn-red', fn: () => { const c = $('#fin-abs'); markAbs = !c || c.checked; res(true); }}] }));
  if(!ok) return;
  const k = keyOf(), up = {};
  up['attendance/' + A.gid + '/' + k + '/meta/open'] = false;
  up['attendance/' + A.gid + '/' + k + '/meta/closedAt'] = Date.now();
  up['attTokens/' + A.gid + '/' + k] = null;
  up['attTickets/' + A.gid + '/' + k] = null;
  if(markAbs) unmarked.forEach(([sid,s]) => up['attendance/' + A.gid + '/' + k + '/rec/' + sid] = { st: 'a', at: Date.now(), via: 'hand', n: s.name, by: CI.me() });
  presClose();
  CI.db.ref().update(up).then(() => CI.log('att.finish', { targetName: G.groups[A.gid].name, groupId: A.gid, note: k }), e => CI.toast(CI.errMsg(e), 'err'));
};
A.reopen = () => CI.db.ref('attendance/' + A.gid + '/' + keyOf() + '/meta').update({ closedAt: null }).then(() => A.qrSetup());

/* ---------------------------------------------------------------- QR taqdimot rejimi */
let P = null;   // {timer, tick, tok, left, wake}
A.qrSetup = () => {
  const m = A.meta || {};
  CI.modal({ title: '📱 ' + t('a.qrStart'), html: `<p class="muted">${t('a.qrHint',{s:ROTATE})}</p>
    <label>${t('a.topic')} <span class="muted">(${t('c.optional')})</span></label><input id="q-topic" value="${esc(m.topic||'')}">
    <div class="row"><div><label>${t('a.lateMin')}</label><input id="q-late" type="number" min="0" max="240" value="${m.lateMin != null ? m.lateMin : 10}"></div>
    <div><label>${t('a.closeMin')}</label><input id="q-close" type="number" min="0" max="600" value="0"></div></div>`,
    actions: [{label:t('c.cancel'), cls:'btn-ghost'}, {label:'▶ '+t('a.start'), cls:'btn-brand', fn: () => {
      const late = Math.max(0, +$('#q-late').value || 0), cl = Math.max(0, +$('#q-close').value || 0);
      const extra = { open: true, lateMin: late, topic: $('#q-topic').value.trim() || null, closedAt: null,
        closeAt: cl ? Date.now() + cl*60000 : null, startedAt: (A.meta && A.meta.startedAt) || Date.now() };
      ensureMeta(extra).then(presOpen, e => CI.toast(CI.errMsg(e), 'err'));
    }}] });
};
function presOpen(){
  presClose();
  P = { left: 0, tok: null };
  const el = document.createElement('div'); el.id = 'att-pres';
  el.innerHTML = `<div class="ap-top"><b id="ap-title"></b><span class="spacer"></span>
    <button class="btn-ghost btn-sm" onclick="ATT.full()">⛶ ${t('a.present.full')}</button>
    <button class="btn-ghost btn-sm" onclick="ATT.presHide()">✕ ${t('a.present.close')}</button>
    <button class="btn-red btn-sm" onclick="ATT.finish()">⏹ ${t('a.finish')}</button></div>
    <div class="ap-main"><div class="ap-qr"><div id="ap-qr"></div><div class="ap-bar"><i id="ap-bar"></i></div>
      <div class="muted" id="ap-left"></div><div class="ap-scan">${t('a.present.scan')}</div></div>
    <div class="ap-side"><div class="ap-count" id="ap-count"></div><div class="muted" id="ap-late"></div>
      <h3 class="mt2">${t('a.present.last')}</h3><div id="ap-list"></div><p class="muted mt2" style="font-size:12px">💡 ${t('a.wake')}</p></div></div>`;
  document.body.appendChild(el);
  rotate(); P.timer = setInterval(() => { P.left--; if(P.left <= 0) rotate(); else presTick(); }, 1000);
  presDraw();
  if(navigator.wakeLock) navigator.wakeLock.request('screen').then(w => P && (P.wake = w)).catch(() => {});
  document.addEventListener('keydown', presKey);
}
function presKey(e){ if(e.key === 'Escape') A.presHide(); }
function rotate(){
  if(!P) return;
  const m = A.meta || {};
  if(m.closeAt && Date.now() > m.closeAt){ A.presHide(); CI.db.ref('attendance/' + A.gid + '/' + keyOf() + '/meta/open').set(false); return; }
  const prev = P.tok; P.tok = CI.rid(8); P.left = ROTATE;
  CI.db.ref('attTokens/' + A.gid + '/' + keyOf()).set({ cur: P.tok, prev: prev || P.tok, at: CI.serverNow() })
    .catch(e => CI.toast(CI.errMsg(e), 'err'));
  const url = CI.here() + '?g=' + A.gid + '&k=' + encodeURIComponent(keyOf()) + '&t=' + P.tok;
  const box = $('#ap-qr'); if(box) box.innerHTML = CI.qrSvg(url, { margin: 2, ecc: 'L' });
  presTick();
}
function presTick(){
  const b = $('#ap-bar'), l = $('#ap-left');
  if(b) b.style.width = (P.left / ROTATE * 100) + '%';
  if(l) l.textContent = t('a.present.left', {s: P.left});
}
function presDraw(){
  if(!P || !$('#att-pres')) return;
  const total = G.sortedStudents(A.gid).length;
  const recs = Object.entries(A.rec).filter(([,r]) => r.st === 'p' || r.st === 'l');
  $('#ap-title').textContent = (G.groups[A.gid]||{}).name + ' · ' + CI.fmtKey(A.date);
  $('#ap-count').innerHTML = `<b>${recs.length}</b> / ${total}<div class="muted" style="font-size:14px">${t('a.present.count',{n:recs.length,total})}</div>`;
  const m = A.meta || {}; $('#ap-late').textContent = m.lateMin ? t('a.present.late', {m: m.lateMin}) : '';
  $('#ap-list').innerHTML = recs.sort((a,b) => (b[1].at||0) - (a[1].at||0)).slice(0, 14)
    .map(([sid,r]) => `<div class="ap-item"><span>${esc(r.n || '')}</span>${CI.pill(ST_CLS[r.st], t('a.st.'+r.st))}<span class="muted">${CI.fmtHM(r.at)}</span></div>`).join('');
}
A.presHide = () => presClose();
function presClose(){
  if(!P) return;
  clearInterval(P.timer); if(P.wake) P.wake.release().catch(() => {});
  document.removeEventListener('keydown', presKey);
  const el = $('#att-pres'); if(el) el.remove();
  if(document.fullscreenElement) document.exitFullscreen().catch(() => {});
  P = null;
}
A.full = () => { const el = $('#att-pres'); if(!document.fullscreenElement && el && el.requestFullscreen) el.requestFullscreen().catch(() => {}); else if(document.exitFullscreen) document.exitFullscreen(); };

/* ---------------------------------------------------------------- JURNAL (oylik jadval) */
function drawJournal(){
  detach();
  const mine = G.mine(false);
  app.innerHTML = shell(`<div class="card no-print"><div class="row">
      <div style="flex:2"><label>${t('a.group')}</label>${G.selectHtml('j-g', A.gid, {onchange:'ATT.jG(this.value)'})}</div>
      <div><label>${t('a.month')}</label><input type="month" value="${A.month}" onchange="ATT.jM(this.value)"></div>
      <div style="flex:0 0 auto"><label>&nbsp;</label><button class="btn-ghost" onclick="ATT.jExport()">⬇ ${t('a.export')}</button></div></div></div>
    <div id="j-body">${!mine.length ? `<div class="card"><div class="empty">${t('a.noGroups')}</div></div>` : `<p class="muted">${t('c.loading')}</p>`}</div>`);
  if(!A.gid || !G.groups[A.gid]){ if(mine.length) $('#j-body').innerHTML = `<div class="card"><div class="empty">${t('a.pickGroup')}</div></div>`; return; }
  G.listenStudents(A.gid, () => { if(A.view === 'journal') renderJournal(); });
  const ref = CI.db.ref('attendance/' + A.gid).orderByKey().startAt(A.month).endAt(A.month + '');
  ref.on('value', s => { A.jData = s.val() || {}; renderJournal(); }, e => { $('#j-body').innerHTML = `<div class="note red">${CI.errMsg(e)}</div>`; });
  A.refs.push(ref);
}
A.jG = v => { A.gid = v; CI.ls.set('att.gid', v); drawJournal(); };
A.jM = v => { if(v){ A.month = v; drawJournal(); } };
function journalModel(data, studentsMap){
  const keys = Object.keys(data || {}).sort();
  const rows = {};   // sid -> {name, removed, cells:{k:rec}}
  Object.entries(studentsMap || {}).forEach(([sid,s]) => rows[sid] = { name: s.name, removed: false, cells: {} });
  keys.forEach(k => Object.entries((data[k] || {}).rec || {}).forEach(([sid,r]) => {
    if(!rows[sid]) rows[sid] = { name: r.n || sid, removed: true, cells: {} };
    rows[sid].cells[k] = r;
  }));
  Object.values(rows).forEach(r => {
    const c = { p:0, l:0, a:0, e:0 }; Object.values(r.cells).forEach(x => c[x.st] = (c[x.st]||0) + 1);
    const base = c.p + c.l + c.a; r.cnt = c; r.rate = base ? Math.round((c.p + c.l) * 100 / base) : null;
  });
  const list = Object.entries(rows).sort((a,b) => (a[1].removed - b[1].removed) || String(a[1].name).localeCompare(String(b[1].name)));
  return { keys, list };
}
function renderJournal(){
  const body = $('#j-body'); if(!body || A.view !== 'journal') return;
  const { keys, list } = journalModel(A.jData, G.students[A.gid]);
  if(!keys.length){ body.innerHTML = `<div class="card"><div class="empty"><span class="ico">📒</span>${t('a.noData')}</div></div>`; return; }
  const colTot = keys.map(k => list.filter(([,r]) => r.cells[k] && (r.cells[k].st === 'p' || r.cells[k].st === 'l')).length);
  body.innerHTML = `<div class="tbl jtbl"><table>
    <tr><th>${t('g.student')}</th>${keys.map(k => { const [d, n] = k.split('_');
      return `<th class="center" style="cursor:pointer;padding:6px 4px" title="${esc(CI.weekday(d))}" onclick="ATT.openDay('${k}')">${d.slice(8)}<div style="font-weight:500">${CI.weekday(d,true)}${n?'·'+n:''}</div></th>`; }).join('')}
      <th>${t('a.rate')}</th></tr>
    ${list.map(([sid,r]) => `<tr><td class="nowrap"><b>${esc(r.name)}</b> ${r.removed?`<span class="muted" style="font-size:11px">${t('a.removed')}</span>`:''}</td>
      ${keys.map(k => { const c = r.cells[k];
        return `<td class="center jc" style="${c?`background:${ST_BG[c.st]};color:${ST_FG[c.st]}`:''}" title="${c?esc(t('a.st.'+c.st)+(c.note?' — '+c.note:'')):''}"
          ${r.removed?'':`onclick="ATT.cell('${sid}','${k}')"`}>${c ? t('a.st.'+c.st+'1') + (c.note?'*':'') : '·'}</td>`; }).join('')}
      <td class="nowrap"><b style="color:${r.rate==null?'inherit':r.rate>=85?ST_FG.p:r.rate>=70?ST_FG.l:ST_FG.a}">${r.rate==null?'—':r.rate+'%'}</b>
        <span class="muted" style="font-size:11.5px">${r.cnt.p}/${r.cnt.l}/${r.cnt.a}/${r.cnt.e}</span></td></tr>`).join('')}
    <tr><td class="muted">${t('c.total')}</td>${colTot.map(n => `<td class="center muted">${n}</td>`).join('')}<td></td></tr>
  </table></div><p class="muted mt">${t('a.legend')}</p>
  <style>.jtbl td.jc{cursor:pointer;font-weight:700;padding:8px 4px;min-width:34px}.jtbl td.jc:hover{outline:2px solid var(--ink-soft);outline-offset:-2px}</style>`;
}
A.openDay = k => { const [d, n] = k.split('_'); A.date = d; A.lesson = +(n||1); A.go('lesson'); };
A.cell = (sid, k) => {
  const s = (G.students[A.gid]||{})[sid]; if(!s) return;
  const cur = (((A.jData[k]||{}).rec||{})[sid]) || {};
  const [d] = k.split('_');
  const m = CI.modal({ title: esc(t('a.cellEdit',{name:s.name, date:CI.fmtKey(d)})), html: `<div class="flex">${ST.map(st =>
    `<button class="${cur.st===st?'':'btn-ghost'}" style="${cur.st===st?`background:${ST_FG[st]};color:#fff`:''}" onclick="ATT.setCell('${sid}','${k}','${st}')">${t('a.st.'+st+'1')} ${t('a.st.'+st)}</button>`).join('')}
    <button class="btn-ghost" onclick="ATT.setCell('${sid}','${k}','')">⌫ ${t('a.clear')}</button></div>
    <label>${t('a.note')}</label><input id="cell-note" value="${esc(cur.note||'')}">`,
    actions: [{label:t('c.close'), cls:'btn-ghost'}, {label:t('c.save'), fn: () => {
      const v = $('#cell-note').value.trim(); if(cur.st) CI.db.ref('attendance/'+A.gid+'/'+k+'/rec/'+sid+'/note').set(v || null);
    }}] });
  A._cellModal = m;
};
A.setCell = (sid, k, st) => {
  const s = G.students[A.gid][sid]; const p = 'attendance/' + A.gid + '/' + k + '/rec/' + sid;
  const pr = st ? CI.db.ref(p).update({ st, n: s.name, via: 'hand', by: CI.me(), at: (((A.jData[k]||{}).rec||{})[sid]||{}).at || Date.now() }) : CI.db.ref(p).remove();
  pr.then(() => A._cellModal && A._cellModal.close(), e => CI.toast(CI.errMsg(e), 'err'));
};
A.jExport = () => {
  if(!A.gid || !A.jData) return;
  const g = G.groups[A.gid]; const { keys, list } = journalModel(A.jData, G.students[A.gid]);
  const head = [t('g.student')].concat(keys.map(k => CI.fmtKey(k.split('_')[0]) + (k.includes('_')?' #'+k.split('_')[1]:'')),
    [t('a.st.p'), t('a.st.l'), t('a.st.a'), t('a.st.e'), t('a.rate') + ' %']);
  const rows = [head].concat(list.map(([sid,r]) => [r.name + (r.removed?' '+t('a.removed'):'')].concat(keys.map(k => r.cells[k] ? t('a.st.'+r.cells[k].st+'1') : ''),
    [r.cnt.p, r.cnt.l, r.cnt.a, r.cnt.e, r.rate == null ? '' : r.rate])));
  const notes = [[t('g.student'), t('c.date'), t('c.status'), t('a.note')]];
  list.forEach(([sid,r]) => keys.forEach(k => { const c = r.cells[k]; if(c && c.note) notes.push([r.name, CI.fmtKey(k.split('_')[0]), t('a.st.'+c.st), c.note]); }));
  rows.push([], [t('a.legend')]);
  CI.downloadXlsx(CI.safeName(g.name + '-' + A.month) + '.xlsx', [{ name: A.month, rows, cols: [28].concat(keys.map(() => 6), [8,8,8,8,10]) },
    { name: t('a.note'), rows: notes, cols: [28, 12, 14, 40] }]);
};

/* ---------------------------------------------------------------- HISOBOT (guruhlar bo'yicha) */
function drawReport(){
  detach();
  const today = CI.dayKey(); const from = A.rFrom || today.slice(0,8) + '01';
  app.innerHTML = shell(`<div class="card no-print"><h2>📊 ${t('a.report.title')}</h2><div class="row">
      <div><label>${t('c.from')}</label><input type="date" id="r-from" value="${from}"></div>
      <div><label>${t('c.to')}</label><input type="date" id="r-to" value="${A.rTo || today}"></div>
      <div style="flex:0 0 auto"><label>&nbsp;</label><button class="btn-p" onclick="ATT.report()">${t('a.report.load')}</button></div></div></div>
    <div id="r-body"></div>`);
}
A.report = async () => {
  A.rFrom = $('#r-from').value; A.rTo = $('#r-to').value;
  const body = $('#r-body'); body.innerHTML = `<p class="muted">${t('c.loading')}</p>`;
  const groups = G.mine(false); const out = []; const low = [];
  for(const [gid,g] of groups){
    const [snap] = await Promise.all([CI.db.ref('attendance/' + gid).orderByKey().startAt(A.rFrom).endAt(A.rTo + '_9').once('value'), G.loadStudents(gid)]);
    const { keys, list } = journalModel(snap.val(), G.students[gid]);
    const c = { p:0, l:0, a:0, e:0 }; list.forEach(([,r]) => ST.forEach(s => c[s] += r.cnt[s] || 0));
    const base = c.p + c.l + c.a;
    out.push({ g, n: list.filter(([,r]) => !r.removed).length, lessons: keys.length, c, rate: base ? Math.round((c.p+c.l)*100/base) : null });
    list.forEach(([,r]) => { if(!r.removed && r.rate != null && r.rate < 75) low.push([g.name, r.name, r.rate, r.cnt.a]); });
  }
  A.rOut = { out, low };
  body.innerHTML = `<div class="tbl"><table><tr><th>${t('a.group')}</th><th>${t('g.student')}</th><th>${t('a.lessons')}</th>
    ${ST.map(s => `<th>${t('a.st.'+s)}</th>`).join('')}<th>${t('a.rate')}</th></tr>
    ${out.map(o => `<tr><td><b>${esc(o.g.name)}</b></td><td>${o.n}</td><td>${o.lessons}</td>${ST.map(s => `<td>${o.c[s]}</td>`).join('')}
      <td><div class="flex"><div class="bar" style="flex:1"><i style="width:${o.rate||0}%"></i></div><b>${o.rate==null?'—':o.rate+'%'}</b></div></td></tr>`).join('')}
  </table></div>
  <div class="card mt2"><h3>⚠️ ${t('a.report.low',{p:75})}</h3>${low.length ? `<div class="tbl"><table>
    <tr><th>${t('a.group')}</th><th>${t('g.student')}</th><th>${t('a.rate')}</th><th>${t('a.st.a')}</th></tr>
    ${low.sort((a,b) => a[2]-b[2]).map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td><b style="color:var(--red)">${r[2]}%</b></td><td>${r[3]}</td></tr>`).join('')}</table></div>`
    : `<p class="muted">${t('a.report.none')}</p>`}</div>
  <button class="btn-ghost mt" onclick="ATT.rExport()">⬇ ${t('a.export')}</button>`;
};
A.rExport = () => { if(!A.rOut) return;
  const rows = [[t('a.group'), t('g.student'), t('a.lessons')].concat(ST.map(s => t('a.st.'+s)), [t('a.rate') + ' %'])]
    .concat(A.rOut.out.map(o => [o.g.name, o.n, o.lessons].concat(ST.map(s => o.c[s]), [o.rate == null ? '' : o.rate])));
  const low = [[t('a.group'), t('g.student'), t('a.rate') + ' %', t('a.st.a')]].concat(A.rOut.low);
  CI.downloadXlsx('davomat-' + A.rFrom + '_' + A.rTo + '.xlsx', [{ name: t('a.report.title'), rows, cols: [24,10,10,10,10,10,10,12] }, { name: '<75%', rows: low, cols: [24,28,10,10] }]);
};

/* ======================================================================= O'QUVCHI SAHIFASI */
function studentPage(){
  const gid = params.get('g'), k = params.get('k'), tok = params.get('t');
  // Tokenni darhol chiptaga almashtiramiz — kod kiritish uzoq cho'zilsa ham chipta 5 daqiqa amal qiladi
  if(!CI.fbReady){ app.innerHTML = CI.setupScreen(); return; }
  CI.initFirebase();
  const tkKey = 'att.tk.' + gid + '.' + k;
  const codeKey = 'ci.code.' + gid;
  let ticket = null, meta = null, who = null, busy = false;
  const S = (inner) => {
    app.innerHTML = `<div class="ptop" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
      <div class="flex"><img src="../shared/logo.svg" width="36" height="36" alt=""><b style="font-family:var(--serif)">${t('s.title')}</b></div>${CI.langSwitcher()}</div>
      <div class="card narrow" style="max-width:440px">${inner}</div>`;
  };
  /* Ish tugagach bazadan uziladi: Firebase bepul rejasida bir vaqtdagi ulanishlar soni cheklangan (100) */
  const release = () => { try{ CI.db.goOffline(); }catch(e){} };
  const fail = (msg) => { S(`<div class="center"><div style="font-size:52px">⚠️</div><p style="font-size:16px">${msg}</p></div>`); release(); };
  const stName = st => t('a.st.' + st);
  document.addEventListener('ci:lang', () => render());
  let last = null; const render = () => last && last();

  async function getTicket(){
    const saved = CI.ls.json(tkKey, null);
    if(saved && Date.now() - saved.at < 4.5*60000) return saved.id;
    if(!tok) throw new Error('expired');
    const id = CI.rid(12);
    await CI.db.ref('attTickets/' + gid + '/' + k + '/' + id).set({ t: tok, at: CI.serverNow() });
    CI.ls.set(tkKey, JSON.stringify({ id, at: Date.now() }));
    return id;
  }
  function askCode(err){
    last = () => askCode(err);
    S(`<label>${t('s.code')}</label><input id="s-code" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false"
        style="font-family:ui-monospace,monospace;font-size:26px;letter-spacing:4px;text-align:center;text-transform:uppercase" value="${esc(CI.ls.get(codeKey)||'')}">
      <p class="muted mt">${t('s.codeHint')}</p>${err?`<div class="note red">${err}</div>`:''}
      <button class="btn-brand btn-block btn-lg mt" id="s-go">${t('s.send')}</button>
      <p class="muted mt" style="font-size:12px">${t('s.devNote')}</p>`);
    const go = () => checkCode($('#s-code').value);
    $('#s-go').onclick = go; $('#s-code').addEventListener('keydown', e => { if(e.key === 'Enter') go(); });
  }
  async function checkCode(code){
    code = String(code||'').trim().toUpperCase(); if(code.length < 4) return askCode(t('s.badCode'));
    if(busy) return; busy = true; S(`<p class="center muted">${t('s.wait')}</p>`);
    try{
      const h = await CI.codeHash(gid, code);
      const r = (await CI.db.ref('roster/' + gid + '/' + h).once('value')).val();
      busy = false;
      if(!r || !r.s){ CI.ls.del(codeKey); return askCode(t('s.badCode')); }
      who = { sid: r.s, name: r.n || '', h, code }; CI.ls.set(codeKey, code);
      const ex = (await CI.db.ref('attendance/' + gid + '/' + k + '/rec/' + r.s).once('value')).val();
      ex ? done(ex, true) : confirmWho();
    }catch(e){ busy = false; askCode(CI.errMsg(e)); }
  }
  function confirmWho(){
    last = confirmWho;
    S(`<div class="center"><div style="font-size:44px">🙋</div><h2 style="justify-content:center">${esc(t('s.isYou',{name:who.name}))}</h2></div>
      <button class="btn-brand btn-block btn-lg mt" id="s-yes">✓ ${t('s.send')}</button>
      <button class="btn-ghost btn-block mt" id="s-no">${t('s.notMe')}</button>`);
    $('#s-yes').onclick = submit; $('#s-no').onclick = () => { CI.ls.del(codeKey); who = null; askCode(); };
  }
  async function submit(){
    if(busy) return; busy = true; S(`<p class="center muted">${t('s.wait')}</p>`);
    try{
      const ex = (await CI.db.ref('attendance/' + gid + '/' + k + '/rec/' + who.sid).once('value')).val();
      if(ex){ busy = false; return done(ex, true); }
      meta = (await CI.db.ref('attendance/' + gid + '/' + k + '/meta').once('value')).val();
      if(!meta || !meta.open || (meta.closeAt && Date.now() > meta.closeAt)){ busy = false; return fail(t('s.closed')); }
      ticket = ticket || await getTicket();
      const late = meta.lateMin != null && Date.now() > (meta.startedAt||0) + meta.lateMin*60000;
      const rec = { st: late ? 'l' : 'p', at: CI.serverNow(), via: 'qr', n: who.name, h: who.h, tk: ticket, dev: CI.deviceId() };
      await CI.db.ref('attendance/' + gid + '/' + k + '/rec/' + who.sid).set(rec);
      busy = false; done(Object.assign(rec, { at: Date.now() }), false);
    }catch(e){
      busy = false;
      if(/PERMISSION/i.test(e.code || e.message)){
        // Kechikish chegarasida "keldi" rad etilgan bo'lishi mumkin — "kechikdi" bilan bir marta qayta urinamiz
        try{
          await CI.db.ref('attendance/' + gid + '/' + k + '/rec/' + who.sid).set({ st: 'l', at: CI.serverNow(), via: 'qr', n: who.name, h: who.h, tk: ticket, dev: CI.deviceId() });
          return done({ st: 'l', at: Date.now() }, false);
        }catch(e2){ CI.ls.del(tkKey); ticket = null; return fail(t('s.expired')); }
      }
      fail(t('s.err', {e: esc(CI.errMsg(e))}));
    }
  }
  function done(r, already){
    last = () => done(r, already); release();
    const ok = r.st === 'p' || r.st === 'l';
    S(`<div class="center"><div style="font-size:72px;line-height:1;color:${ST_FG[r.st]||'inherit'}">${ok?'✓':'•'}</div>
      <h2 style="justify-content:center;margin-top:10px">${already ? esc(t('s.already',{st:stName(r.st)})) : r.st==='l' ? t('s.okLate') : t('s.ok')}</h2>
      <p style="font-size:18px"><b>${esc(who.name)}</b></p><p class="muted">${CI.fmtKey(k.split('_')[0])} · ${t('s.time')}: ${CI.fmtHM(r.at)}</p></div>`);
  }
  // Boshlash: chiptani darhol olamiz (QR hali yangi paytda)
  S(`<p class="center muted">${t('s.wait')}</p>`);
  getTicket().then(id => { ticket = id; }, () => {}).finally(() => {
    const saved = CI.ls.get(codeKey);
    if(!ticket && !CI.ls.json(tkKey, null)){
      // Chipta olinmadi — QR eskirgan yoki dars yopiq. Kod bo'lsa, balki allaqachon belgilangandir.
      if(saved) return checkCodeThen(saved, () => fail(t('s.expired')));
      return fail(t('s.expired'));
    }
    if(saved) checkCode(saved); else askCode();
  });
  async function checkCodeThen(code, orElse){
    try{
      const h = await CI.codeHash(gid, code); const r = (await CI.db.ref('roster/' + gid + '/' + h).once('value')).val();
      if(!r) return orElse();
      who = { sid: r.s, name: r.n, h, code };
      const ex = (await CI.db.ref('attendance/' + gid + '/' + k + '/rec/' + r.s).once('value')).val();
      ex ? done(ex, true) : orElse();
    }catch(e){ orElse(); }
  }
}
})();
