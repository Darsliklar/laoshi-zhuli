/* ============================================================================
   LAOSHI — 📊 natijalar: jonli kuzatuv, blokdan chiqarish, baholash, tekshirish, tahlil, Excel
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, L = window.L, t = (k,v) => CI.t(k,v), esc = CI.esc, $ = CI.$;
const V = L.live = {};
let D = null;    // {tid, ses, res, keys, refs, sub}

V.detach = () => { if(D){ D.refs.forEach(r => r.off()); clearInterval(D.timer); } D = null; };
V.render = () => {
  const tid = L.liveId;
  if(!tid || !L.testById(tid)) return pick();
  if(!D || D.tid !== tid){
    V.detach();
    D = { tid, ses: {}, res: {}, keys: null, refs: [], sub: 'live', loaded: false };
    const s = CI.db.ref('sessions/' + tid), r = CI.db.ref('results/' + tid);
    s.on('value', v => { D.ses = v.val() || {}; D.loaded = true; autoGrade(); draw(); }, e => { D.err = e; draw(); });
    r.on('value', v => { D.res = v.val() || {}; draw(); }, () => {});
    D.refs.push(s, r);
    CI.db.ref('testKeys/' + tid).once('value').then(v => { D.keys = v.val() || {}; autoGrade(); draw(); }, () => {});
    D.timer = setInterval(() => { if(D && D.sub === 'live') drawTable(); }, 15000);
  }
  draw();
};
function pick(){
  const list = L.myTests();
  L.app.innerHTML = L.shell(`<div class="card"><h2>📊 ${t('l.tab.live')}</h2><p class="muted">${t('lv.pick')}</p>
    ${!list.length ? `<div class="empty">${t('l.noTests')}</div>` : list.map(([id,x]) => `<div class="lrow"><div class="lrow-main"><div class="lrow-title">${esc(x.title)} ${L.STATUS_PILL(x.status)}</div>
      <div class="lrow-sub">${CI.fmtD(x.createdAt)}${x.ownerUid !== CI.me() ? ' · 👤 ' + esc(x.ownerName||'') : ''}</div></div>
      <div class="lrow-act"><button class="btn-p btn-sm" onclick="L.go('live','${id}')">${t('c.open')}</button></div></div>`).join('')}</div>`);
}

/* ---------------------------------------------------------------- yordamchilar */
const test = () => L.testById(D.tid);
const qids = () => L.qOrder(test());
function stateOf(s){
  if(s.status === 'done') return 'done';
  if(s.status === 'locked') return 'locked';
  if(s.deadline && Date.now() > s.deadline + 60000) return 'timeup';
  if(s.status === 'active' && s.lastSeen && Date.now() - s.lastSeen > 5*60000) return 'idle';
  return 'active';
}
const ST_PILL = { active: ['p-green','● '], locked: ['p-red','🔒 '], done: ['p-blue','✓ '], timeup: ['p-yellow','⏰ '], idle: ['p-gray','… '] };
const stPill = k => CI.pill(ST_PILL[k][0], ST_PILL[k][1] + t('lv.s.' + k));
const ansCount = s => Object.keys(s.answers || {}).length;
function dur(a, b){ if(!a || !b) return '—'; const m = Math.round((b - a) / 60000); return m < 60 ? m + ' ' + t('c.min') : Math.floor(m/60) + ':' + String(m%60).padStart(2,'0'); }

/* ---------------------------------------------------------------- chizish */
function draw(){
  if(!D || L.view !== 'live') return;
  const x = test(); if(!x) return pick();
  const arr = Object.values(D.ses); const c = { active:0, locked:0, done:0, timeup:0, idle:0 }; arr.forEach(s => c[stateOf(s)]++);
  const graded = Object.values(D.res); const avg = graded.length ? Math.round(graded.reduce((a,r) => a + (r.percent||0), 0) / graded.length) : null;
  const st = x.settings || {};
  L.app.innerHTML = L.shell(`
    <div class="card">
      <div class="flex" style="justify-content:space-between"><h2 style="margin:0">${esc(x.title)} ${L.STATUS_PILL(x.status)}</h2>
        <div class="flex">
          <select style="max-width:240px" onchange="L.go('live', this.value)">${L.myTests().map(([id,y]) => `<option value="${id}" ${id===D.tid?'selected':''}>${esc(y.title)}</option>`).join('')}</select>
          <button class="btn-ghost btn-sm" onclick="L.share('${D.tid}')">🔗 ${t('l.linkQr')}</button>
          ${x.status === 'open' ? `<button class="btn-ghost btn-sm" onclick="L.setStatus('${D.tid}','closed')">🔒 ${t('l.close')}</button>` : `<button class="btn-ghost btn-sm" onclick="L.setStatus('${D.tid}','open')">▶ ${t('l.open')}</button>`}
          <button class="btn-ghost btn-sm" onclick="L.go('editor','${D.tid}')">✏️</button></div></div>
      ${st.unlockCode && st.onLeave !== 'off' && D.keys && D.keys.pin ? `<div class="note blue flex mt" style="justify-content:space-between">
        <span>🔓 ${t('lv.pinHint')}</span><b class="code" style="font-size:24px;letter-spacing:4px">${esc(D.keys.pin)}</b></div>` : ''}
      <div class="stats mt">
        <div class="stat"><b>${arr.length}</b><span>${t('lv.total')}</span></div>
        <div class="stat"><b style="color:var(--jade)">${c.active + c.idle}</b><span>${t('lv.s.active')}</span></div>
        <div class="stat"><b style="color:var(--red)">${c.locked}</b><span>${t('lv.s.locked')}</span></div>
        <div class="stat"><b style="color:var(--blue)">${c.done}</b><span>${t('lv.s.done')}</span></div>
        <div class="stat"><b>${avg == null ? '—' : avg + '%'}</b><span>${t('lv.avg')}</span></div>
      </div>
      <div class="flex">
        <button class="btn-p btn-sm" onclick="L.live.gradeAll(true)">🧮 ${t('lv.gradeAll')}</button>
        <button class="btn-ghost btn-sm" onclick="L.live.excel()">⬇ Excel</button>
        ${c.locked ? `<button class="btn-ghost btn-sm" onclick="L.live.unlockAll()">🔓 ${t('lv.unlockAll', {n: c.locked})}</button>` : ''}
        <span class="spacer"></span>
        <div class="seg">${['live','analysis','review'].map(v => `<button class="${D.sub===v?'on':''}" onclick="L.live.sub('${v}')">${t('lv.sub.' + v)}</button>`).join('')}</div>
      </div>
    </div>
    ${D.err ? `<div class="note red">${CI.errMsg(D.err)}</div>` : ''}
    <div id="lv-body"></div>
    <style>.seg{display:inline-flex;border:1.5px solid var(--line);border-radius:9px;overflow:hidden}.seg button{border-radius:0;background:#fff;color:var(--ink-soft);font-size:13px;padding:7px 11px}
      .seg button.on{background:var(--ink);color:#fff}.lv-ans{font-size:12.5px;color:var(--ink-soft)}</style>`);
  if(D.sub === 'analysis') drawAnalysis(); else if(D.sub === 'review') drawReviewQueue(); else drawTable();
}
V.sub = v => { D.sub = v; draw(); };
function drawTable(){
  const el = $('#lv-body'); if(!el) return;
  if(!D.loaded){ el.innerHTML = `<p class="muted">${t('c.loading')}</p>`; return; }
  const list = Object.entries(D.ses).sort((a,b) => { const o = { locked:0, active:1, idle:2, timeup:3, done:4 };
    return o[stateOf(a[1])] - o[stateOf(b[1])] || String(a[1].name).localeCompare(String(b[1].name)); });
  const n = qids().length;
  if(!list.length){ el.innerHTML = `<div class="card"><div class="empty"><span class="ico">⏳</span>${t('lv.empty')}</div></div>`; return; }
  el.innerHTML = `<div class="tbl"><table><tr><th>${t('g.student')}</th><th>${t('c.status')}</th><th>${t('lv.progress')}</th><th>⚠️</th><th>${t('c.time')}</th><th>${t('lv.score')}</th><th></th></tr>
    ${list.map(([sid,s]) => { const k = stateOf(s), r = D.res[sid], a = ansCount(s);
      const left = s.deadline && k !== 'done' ? Math.max(0, Math.round((s.deadline - Date.now()) / 60000)) : null;
      return `<tr><td><b>${esc(s.name)}</b>${s.attempt > 1 ? ` <span class="muted">#${s.attempt}</span>` : ''}${s.review && s.review.status === 'needs_revision' ? ' ' + CI.pill('p-yellow', '✍️') : ''}</td>
        <td>${stPill(k)}</td>
        <td><div class="flex" style="gap:6px;flex-wrap:nowrap"><div class="bar" style="width:80px"><i style="width:${n ? a*100/n : 0}%"></i></div><span class="muted">${a}/${n}</span></div></td>
        <td>${s.violations ? `<b style="color:var(--red)">${s.violations}</b>` : '<span class="muted">0</span>'}</td>
        <td class="muted nowrap" style="font-size:12.5px">${CI.fmtHM(s.startedAt)}${s.finishedAt ? ' → ' + CI.fmtHM(s.finishedAt) + ' (' + dur(s.startedAt, s.finishedAt) + ')' : left != null ? ' · ⏳ ' + left + ' ' + t('c.min') : ''}</td>
        <td class="nowrap">${r ? `<b>${r.score}/${r.maxScore}</b> <span class="muted">${r.percent}%${r.grade != null ? ' · ' + esc(r.grade) : ''}</span>${r.pending ? ' ' + CI.pill('p-yellow', '✍️ ' + r.pending) : ''}`
          : k === 'done' || k === 'timeup' ? `<span class="muted">${t('lv.notGraded')}</span>` : `<span class="muted">—</span>`}</td>
        <td class="nowrap" style="text-align:right">
          ${k === 'locked' ? `<button class="btn-brand btn-xs" onclick="L.live.unlock('${sid}')">🔓 ${t('lv.unlock')}</button>` : ''}
          <button class="btn-ghost btn-xs" onclick="L.live.detail('${sid}')">🔍</button>
          ${CI.menuHtml('lm-' + sid, [
            k !== 'done' ? {label: '⏹ ' + t('lv.forceFinish'), fn: `L.live.forceFinish('${sid}')`} : null,
            {label: '↺ ' + t('lv.allowRetake'), fn: `L.live.retake('${sid}')`},
            {label: '+5 ' + t('c.min'), fn: `L.live.addTime('${sid}',5)`},
            {label: '🗑 ' + t('c.delete'), fn: `L.live.delSes('${sid}')`, danger: true}])}</td></tr>`; }).join('')}
  </table></div>`;
}

/* ---------------------------------------------------------------- amallar */
V.unlock = sid => CI.db.ref('sessions/' + D.tid + '/' + sid).update({ status: 'active' })
  .then(() => CI.log('test.unlock', { targetName: D.ses[sid].name, testId: D.tid, note: test().title }), e => CI.toast(CI.errMsg(e), 'err'));
V.unlockAll = () => { const up = {}; Object.entries(D.ses).forEach(([sid,s]) => { if(s.status === 'locked') up[sid + '/status'] = 'active'; });
  CI.db.ref('sessions/' + D.tid).update(up).catch(e => CI.toast(CI.errMsg(e), 'err')); };
V.forceFinish = sid => CI.db.ref('sessions/' + D.tid + '/' + sid).update({ status: 'done', finishedAt: Date.now() }).catch(e => CI.toast(CI.errMsg(e), 'err'));
V.addTime = (sid, m) => { const s = D.ses[sid]; const base = Math.max(s.deadline || Date.now(), Date.now());
  CI.db.ref('sessions/' + D.tid + '/' + sid).update({ deadline: base + m*60000, status: s.status === 'done' ? 'done' : 'active' }).catch(e => CI.toast(CI.errMsg(e), 'err')); };
V.retake = async sid => {
  const s = D.ses[sid]; if(!await CI.confirm(t('lv.retakeQ', {name: esc(s.name)}))) return;
  await CI.trashPut('session', test().ownerUid, s.name + ' — ' + test().title, { tid: D.tid, sid, session: s, result: D.res[sid] || null });
  CI.db.ref().update({ ['sessions/' + D.tid + '/' + sid]: null, ['results/' + D.tid + '/' + sid]: null })
    .then(() => CI.log('test.retake', { targetName: s.name, testId: D.tid, note: test().title }), e => CI.toast(CI.errMsg(e), 'err'));
};
V.delSes = async sid => {
  const s = D.ses[sid]; if(!await CI.confirm(t('lv.delQ', {name: esc(s.name)}), {danger: true})) return;
  await CI.trashPut('session', test().ownerUid, s.name + ' — ' + test().title, { tid: D.tid, sid, session: s, result: D.res[sid] || null });
  CI.db.ref().update({ ['sessions/' + D.tid + '/' + sid]: null, ['results/' + D.tid + '/' + sid]: null })
    .then(() => CI.log('test.sessionDelete', { targetName: s.name, testId: D.tid }), e => CI.toast(CI.errMsg(e), 'err'));
};

/* ---------------------------------------------------------------- baholash (laoshi brauzerida) */
function gradeOne(sid){
  const s = D.ses[sid]; if(!s || !D.keys) return null;
  const r = LZGrade.gradeSession(test(), D.keys, s, s.review && s.review.overrides);
  r.gradedAt = Date.now(); r.by = 'teacher';
  return r;
}
V.gradeAll = (force) => {
  if(!D.keys) return CI.toast(t('c.loading'), 'err');
  const up = {}; let n = 0;
  Object.entries(D.ses).forEach(([sid,s]) => { const k = stateOf(s);
    if(k !== 'done' && k !== 'timeup') return;
    if(!force && D.res[sid]) return;
    up['results/' + D.tid + '/' + sid] = gradeOne(sid); n++;
    if(k === 'timeup') { up['sessions/' + D.tid + '/' + sid + '/status'] = 'done'; up['sessions/' + D.tid + '/' + sid + '/finishedAt'] = s.deadline; }
  });
  if(!n){ if(force) CI.toast(t('lv.nothingToGrade')); return; }
  CI.db.ref().update(up).then(() => { if(force) CI.toast(t('lv.graded', {n}), 'ok'); }, e => CI.toast(CI.errMsg(e), 'err'));
};
/* Yangi tugatganlar avtomatik baholanadi (server bo'lmasa ham, laoshi paneli ochiq turganda) */
let agT = null;
function autoGrade(){ clearTimeout(agT); agT = setTimeout(() => { if(D && D.keys) V.gradeAll(false); }, 1200); }

/* ---------------------------------------------------------------- batafsil va tekshirish */
function ansText(q, a){
  a = a || {};
  if(q.type === 'single') return a.v == null ? '' : L.LETTERS[a.v] + ') ' + (q.options||[])[a.v];
  if(q.type === 'multi') return (a.v||[]).map(j => L.LETTERS[j] + ') ' + q.options[j]).join('; ');
  if(q.type === 'tf') return a.v == null ? '' : a.v ? t('q.true') : t('q.false');
  if(q.type === 'writing') return '';
  return a.text || '';
}
function keyText(q, k){
  k = k || {};
  if(q.type === 'single') return k.c == null ? '' : L.LETTERS[k.c] + ') ' + (q.options||[])[k.c];
  if(q.type === 'multi') return (k.c||[]).map(j => L.LETTERS[j] + ') ' + q.options[j]).join('; ');
  if(q.type === 'tf') return k.c ? t('q.true') : t('q.false');
  return (k.accepted||[]).join(' / ');
}
V.detail = sid => {
  const s = D.ses[sid], x = test(), K = (D.keys||{}).answers || {};
  const ov = Object.assign({}, (s.review||{}).overrides || {});
  const r0 = LZGrade.gradeSession(x, D.keys || {}, s, null);
  const body = () => qids().map((id, i) => { const q = x.questions[id], a = (s.answers||{})[id], auto = r0.verdicts[id], cur = ov[id] || auto;
    const col = cur === 'correct' ? 'var(--jade)' : cur === 'incorrect' ? 'var(--red)' : typeof cur === 'number' ? 'var(--amber)' : '#B9BFC6';
    return `<div class="lrow" style="border-left:4px solid ${col};display:block"><div><b>${i+1}.</b> ${L.TYPE_ICON[q.type]} ${esc(L.qPromptText(q))}</div>
      ${q.type === 'writing' ? `<div class="flex mt">${((a||{}).writing||[]).map(c => `<div class="center">${L.hz.strokesSvg(c, 90, (x.settings||{}).grid)}
        <div class="muted" style="font-size:11px">${esc(c.char)} · ${t('hz.mistakes',{n:c.mistakes||0})}${c.completed?'':' · …'}</div></div>`).join('')}
        ${a && a.freehand ? L.hz.strokesSvg({freehand: a.freehand}, 120, (x.settings||{}).grid) : ''}${!a ? '<span class="muted">—</span>' : ''}</div>`
        : `<div class="lv-ans">${t('st.yourAns')}: <b style="color:var(--ink)">${esc(ansText(q, a)) || '—'}</b></div>`}
      <div class="lv-ans">${t('st.rightAns')}: ${esc(keyText(q, K[id]))}</div>
      <div class="flex mt" style="gap:6px"><span class="muted" style="font-size:12px">${t('lv.auto')}: ${t('lv.v.' + (typeof auto === 'number' ? 'partial' : auto))}</span><span class="spacer"></span>
        <button class="btn-xs ${ov[id]==='correct'?'btn-jade':'btn-ghost'}" onclick="L.live._ov('${id}','correct')">✓</button>
        <button class="btn-xs ${ov[id]==='incorrect'?'btn-red':'btn-ghost'}" onclick="L.live._ov('${id}','incorrect')">✗</button>
        ${ov[id] ? `<button class="btn-ghost btn-xs" onclick="L.live._ov('${id}',null)">↺</button>` : ''}</div></div>`; }).join('');
  const m = CI.modal({ title: '🔍 ' + esc(s.name), wide: true, html: `
    <p class="muted">${CI.fmtDT(s.startedAt)} → ${s.finishedAt ? CI.fmtDT(s.finishedAt) : '…'} · ⚠️ ${s.violations || 0}
      ${(s.events ? Object.values(s.events) : []).slice(-8).map(e => `<span class="pill p-gray">${CI.fmtHM(e.at)} ${esc(e.k)}</span>`).join(' ')}</p>
    <div id="dt-body">${body()}</div>
    <label>${t('lv.comment')}</label><input id="dt-c" value="${esc((s.review||{}).comment||'')}">`,
    actions: [{label: t('c.close'), cls: 'btn-ghost'},
      {label: '✍️ ' + t('lv.needsRevision'), cls: 'btn-amber', fn: () => saveReview(sid, ov, 'needs_revision')},
      {label: '✓ ' + t('lv.saveReview'), cls: 'btn-brand', fn: () => saveReview(sid, ov, 'reviewed')}] });
  V._ov = (id, v) => { if(v) ov[id] = v; else delete ov[id]; const b = m.el.querySelector('#dt-body'); if(b) b.innerHTML = body(); };
};
function saveReview(sid, ov, status){
  const s = D.ses[sid]; const comment = ($('#dt-c') || {}).value || '';
  const review = { overrides: Object.keys(ov).length ? ov : null, comment: comment.trim() || null, status, by: CI.myName(), at: Date.now() };
  const r = LZGrade.gradeSession(test(), D.keys || {}, s, ov); r.gradedAt = Date.now(); r.by = 'teacher'; r.reviewed = status === 'reviewed';
  const up = { ['sessions/' + D.tid + '/' + sid + '/review']: review, ['results/' + D.tid + '/' + sid]: r };
  if(status === 'needs_revision'){ up['sessions/' + D.tid + '/' + sid + '/status'] = 'active'; up['sessions/' + D.tid + '/' + sid + '/deadline'] = null; }
  CI.db.ref().update(up).then(() => CI.toast(t('c.saved'), 'ok'), e => CI.toast(CI.errMsg(e), 'err'));
}
function drawReviewQueue(){
  const el = $('#lv-body'); const x = test();
  const list = Object.entries(D.ses).filter(([sid,s]) => s.status === 'done' && (!s.review || s.review.status !== 'reviewed') &&
    qids().some(id => x.questions[id].type === 'writing' || (D.res[sid] && D.res[sid].pending)));
  el.innerHTML = `<div class="card"><p class="muted">${t('lv.reviewHint')}</p>${!list.length ? `<div class="empty">✓ ${t('lv.reviewEmpty')}</div>` :
    list.map(([sid,s]) => `<div class="lrow"><div class="lrow-main"><b>${esc(s.name)}</b><div class="lrow-sub">${CI.fmtDT(s.finishedAt)}${D.res[sid] ? ' · ' + D.res[sid].percent + '%' : ''}</div></div>
      <div class="lrow-act"><button class="btn-p btn-sm" onclick="L.live.detail('${sid}')">🔍 ${t('lv.check')}</button></div></div>`).join('')}</div>`;
}

/* ---------------------------------------------------------------- tahlil */
function drawAnalysis(){
  const el = $('#lv-body'); const x = test(); const done = Object.entries(D.ses).filter(([,s]) => s.status === 'done');
  if(!done.length || !D.keys){ el.innerHTML = `<div class="card"><div class="empty">${t('lv.noDone')}</div></div>`; return; }
  const rows = qids().map((id, i) => { const q = x.questions[id]; let ok = 0, ans = 0; const wrong = {};
    done.forEach(([sid,s]) => { const v = LZGrade.gradeSession({ settings: x.settings, order: [id], questions: { [id]: q } }, D.keys, s, (s.review||{}).overrides).verdicts[id];
      if(v !== 'unanswered') ans++; if(v === 'correct') ok++; else if(v === 'incorrect'){ const a = ansText(q, (s.answers||{})[id]); if(a) wrong[a] = (wrong[a]||0) + 1; } });
    const p = done.length ? Math.round(ok * 100 / done.length) : 0;
    const top = Object.entries(wrong).sort((a,b) => b[1] - a[1]).slice(0, 2);
    return { i, q, p, ans, top }; });
  el.innerHTML = `<div class="card"><p class="muted">${t('lv.analysisHint', {n: done.length})}</p><div class="tbl"><table>
    <tr><th>#</th><th>${t('e.questions')}</th><th>${t('lv.correctPct')}</th><th>${t('lv.commonWrong')}</th></tr>
    ${rows.sort((a,b) => a.p - b.p).map(r => `<tr><td>${r.i+1}</td><td>${L.TYPE_ICON[r.q.type]} ${esc(L.qPromptText(r.q)).slice(0, 120)}</td>
      <td><div class="flex" style="flex-wrap:nowrap"><div class="bar" style="width:90px"><i style="width:${r.p}%;background:${r.p<40?'var(--red)':r.p<70?'var(--amber)':'var(--jade)'}"></i></div><b>${r.p}%</b></div></td>
      <td class="muted" style="font-size:12.5px">${r.top.map(([a,n]) => esc(a) + ' (' + n + ')').join('<br>')}</td></tr>`).join('')}</table></div></div>`;
}

/* ---------------------------------------------------------------- Excel */
V.excel = () => {
  const x = test(), ids = qids(), K = (D.keys||{}).answers || {};
  const head = [t('g.student'), '#', t('c.status'), t('lv.start'), t('lv.end'), t('lv.duration'), '⚠️', t('lv.answered'), t('lv.correct'), t('lv.score'), '%', t('st.grade')];
  const list = Object.entries(D.ses).sort((a,b) => String(a[1].name).localeCompare(String(b[1].name)));
  const rows = [head].concat(list.map(([sid,s]) => { const r = D.res[sid] || gradeOne(sid) || {};
    return [s.name, s.attempt || 1, t('lv.s.' + stateOf(s)), CI.fmtDT(s.startedAt), s.finishedAt ? CI.fmtDT(s.finishedAt) : '', dur(s.startedAt, s.finishedAt),
      s.violations || 0, ansCount(s) + '/' + ids.length, r.correct ?? '', r.score ?? '', r.percent ?? '', r.grade ?? '']; }));
  const qhead = [t('g.student')].concat(ids.map((id, i) => (i+1) + '. ' + L.qPromptText(x.questions[id]).slice(0, 40)));
  const keyRow = [t('st.rightAns')].concat(ids.map(id => keyText(x.questions[id], K[id])));
  const qrows = [qhead, keyRow].concat(list.map(([sid,s]) => { const v = (D.res[sid] || gradeOne(sid) || {}).verdicts || {};
    return [s.name].concat(ids.map(id => { const q = x.questions[id]; const a = ansText(q, (s.answers||{})[id]) || (q.type === 'writing' && (s.answers||{})[id] ? '✍️' : '');
      const m = v[id] === 'correct' ? '✓ ' : v[id] === 'incorrect' ? '✗ ' : typeof v[id] === 'number' ? '½ ' : ''; return m + a; })); }));
  CI.downloadXlsx(CI.safeName(x.title) + '-' + CI.dayKey() + '.xlsx', [
    { name: t('lv.score'), rows, cols: [28,4,12,17,17,9,5,10,9,9,7,7] },
    { name: t('e.questions'), rows: qrows, cols: [28].concat(ids.map(() => 18)) }]);
};
})();
