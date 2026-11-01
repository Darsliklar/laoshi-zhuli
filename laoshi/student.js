/* ============================================================================
   LAOSHI — o'quvchi sahifalari: test topshirish (?t=), guruh portali (?portal=)
   Himoya: chiqib ketsa — o'chiq / ogohlantirish (N martadan keyin blok) / darhol blok;
   blokdan chiqish — laoshi ruxsati yoki laoshi aytgan 4 xonali kod (sozlamada yoqilgan bo'lsa).
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, L = window.L, t = (k,v) => CI.t(k,v), esc = CI.esc, $ = CI.$;
const S = L.student = {};
let R = null;          // joriy ishlash holati
let srvOff = 0;        // server vaqti farqi
const app = () => L.app;
const now = () => Date.now() + srvOff;
const codeKey = gid => 'ci.code.' + gid;

function page(inner, sub){
  app().innerHTML = `<div class="ptop" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;gap:8px">
    <a href="${CI.root}index.html" class="flex" style="text-decoration:none;color:inherit"><img src="${CI.root}shared/logo.svg" width="36" height="36" alt="">
    <b style="font-family:var(--serif)">${sub || t('st.title')}</b></a>${CI.langSwitcher()}</div><div class="narrow" style="max-width:760px">${inner}</div>`;
}
function fail(msg){ page(`<div class="card center"><div style="font-size:48px">⚠️</div><p style="font-size:16px">${msg}</p></div>`); }
function shuffle(a){ a = a.slice(); for(let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
document.addEventListener('ci:lang', () => { if(S._redraw) S._redraw(); });

/* ======================================================================= TEST */
S.open = async tid => {
  if(!CI.fbReady){ app().innerHTML = CI.setupScreen(); return; }
  CI.initFirebase();
  CI.db.ref('.info/serverTimeOffset').on('value', s => { srvOff = s.val() || 0; });
  page(`<p class="muted center">${t('c.loading')}</p>`);
  let test;
  try{ test = (await CI.db.ref('tests/' + tid).once('value')).val(); }catch(e){ return fail(CI.errMsg(e)); }
  if(!test) return fail(t('st.notFound'));
  const preview = L.params.get('preview') === '1';
  R = { tid, test, st: Object.assign({ onLeave: 'warn', maxWarn: 3, attempts: 1, showScore: 'now' }, test.settings || {}), preview, answers: {} };
  if(!preview){
    const v = availability(test); if(v) return S._redraw = () => fail(v), fail(v);
  }
  // Davom ettirish (shu qurilmada boshlangan bo'lsa)
  const savedSid = CI.ls.get('l.sid.' + tid);
  if(savedSid && !preview){
    try{
      const ses = (await CI.db.ref('sessions/' + tid + '/' + savedSid).once('value')).val();
      if(ses && ses.status !== 'reset'){ R.sid = savedSid; R.ses = ses; return ses.status === 'done' ? showResult() : resume(); }
    }catch(e){}
  }
  identify();
};
function availability(test){
  const st = test.status;
  if(st === 'closed') return t('st.closed');
  if(st !== 'open') return t('st.notOpen');
  if(test.startAt && now() < test.startAt - 60000) return t('st.notYet', { d: CI.fmtDT(test.startAt) });
  if(test.endAt && now() > test.endAt) return t('st.ended');
  return null;
}
function rulesList(){
  const s = R.st, li = [];
  li.push(L.qOrder(R.test).length + ' ' + t('st.r.questions'));
  li.push(s.timeLimit ? t('st.r.time', {m: s.timeLimit}) : t('st.r.noTime'));
  if(s.attempts > 0) li.push(t('st.r.attempts', {n: s.attempts}));
  if(s.onLeave === 'block') li.push('⛔ ' + t('st.r.block'));
  else if(s.onLeave === 'warn') li.push('⚠️ ' + (s.maxWarn > 0 ? t('st.r.warnN', {n: s.maxWarn}) : t('st.r.warn')));
  if(s.fullscreen) li.push('⛶ ' + t('st.r.full'));
  if(s.noCopy) li.push('🚫 ' + t('st.r.noCopy'));
  return `<ul class="muted" style="padding-left:18px;line-height:1.8">${li.map(x => `<li>${x}</li>`).join('')}</ul>`;
}
function identify(err){
  S._redraw = () => identify(err);
  const x = R.test, gid = x.groupId;
  const intro = `<div class="card"><h2>${esc(x.title)}</h2>${x.desc ? `<p class="muted">${esc(x.desc)}</p>` : ''}${rulesList()}
    ${R.preview ? `<div class="note blue">👁 ${t('st.previewNote')}</div>` : ''}</div>`;
  if(gid && !R.preview){
    page(intro + `<div class="card"><label style="margin-top:0">${t('st.code')}</label>
      <input id="s-code" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(CI.ls.get(codeKey(gid))||'')}"
        style="font-family:ui-monospace,monospace;font-size:24px;letter-spacing:4px;text-align:center;text-transform:uppercase">
      <p class="muted mt">${t('st.codeHint')}</p>${err ? `<div class="note red">${err}</div>` : ''}
      <button class="btn-red btn-block btn-lg mt" id="s-go">${t('st.start')}</button></div>`);
    const go = () => byCode($('#s-code').value); $('#s-go').onclick = go; $('#s-code').onkeydown = e => { if(e.key === 'Enter') go(); };
  } else {
    page(intro + `<div class="card"><label style="margin-top:0">${t('st.name')}</label><input id="s-name" maxlength="60" value="${esc(CI.ls.get('l.name')||'')}" placeholder="${esc(t('st.namePh'))}">
      ${err ? `<div class="note red">${err}</div>` : ''}<button class="btn-red btn-block btn-lg mt" id="s-go">${t('st.start')}</button></div>`);
    const go = () => { const n = $('#s-name').value.trim().replace(/\s+/g, ' '); if(n.length < 3) return identify(t('st.e.name')); CI.ls.set('l.name', n); create({ name: n }); };
    $('#s-go').onclick = go; $('#s-name').onkeydown = e => { if(e.key === 'Enter') go(); };
  }
}
async function byCode(code){
  code = String(code||'').trim().toUpperCase(); const gid = R.test.groupId;
  if(code.length < 4) return identify(t('st.e.code'));
  try{
    const h = await CI.codeHash(gid, code);
    const r = (await CI.db.ref('roster/' + gid + '/' + h).once('value')).val();
    if(!r) return identify(t('st.e.code'));
    CI.ls.set(codeKey(gid), code);
    // Oldingi urinishlarni topish
    const max = R.st.attempts > 0 ? R.st.attempts : 30; let last = null, n = 0;
    for(let i = 1; i <= max; i++){
      const s = (await CI.db.ref('sessions/' + R.tid + '/' + r.s + '-' + i).once('value')).val();
      if(!s){ break; } last = s; n = i;
    }
    if(last && last.status !== 'done' && last.status !== 'reset'){ R.sid = r.s + '-' + n; R.ses = last; CI.ls.set('l.sid.' + R.tid, R.sid); return resume(); }
    if(last && last.status === 'done' && R.st.attempts > 0 && n >= R.st.attempts){ R.sid = r.s + '-' + n; R.ses = last; return showResult(); }
    create({ name: r.n, studentId: r.s, h, attempt: n + 1 });
  }catch(e){ identify(CI.errMsg(e)); }
}
async function create(who){
  const x = R.test, qs = L.qOrder(x);
  const order = R.st.shuffleQ ? shuffle(qs) : qs;
  const optOrder = {};
  qs.forEach(id => { const q = x.questions[id]; if(R.st.shuffleOpt && (q.type === 'single' || q.type === 'multi')) optOrder[id] = shuffle((q.options||[]).map((_, i) => i)); });
  const attempt = who.attempt || (+(CI.ls.get('l.att.' + R.tid) || 0) + 1);
  if(!x.groupId && R.st.attempts > 0 && attempt > R.st.attempts && !R.preview) return fail(t('st.noAttempts'));
  const ses = { name: who.name, status: 'active', attempt, startedAt: CI.serverNow(), violations: 0, order, optOrder: Object.keys(optOrder).length ? optOrder : null,
    studentId: who.studentId || null, gid: x.groupId || null, h: who.h || null, dev: CI.deviceId(), ua: navigator.userAgent.slice(0, 120) };
  let dl = R.st.timeLimit > 0 ? now() + R.st.timeLimit * 60000 - 3000 : null;
  if(x.endAt && (!dl || dl > x.endAt)) dl = R.st.timeLimit > 0 ? Math.min(dl, x.endAt) : null;
  if(dl) ses.deadline = dl;
  const sid = who.studentId ? who.studentId + '-' + attempt : CI.rid(12);
  if(R.preview){ R.sid = sid; R.ses = Object.assign(ses, { startedAt: Date.now(), answers: {} }); return run(); }
  try{
    await CI.db.ref('sessions/' + R.tid + '/' + sid).set(ses);
    CI.ls.set('l.sid.' + R.tid, sid); if(!x.groupId) CI.ls.set('l.att.' + R.tid, String(attempt));
    R.sid = sid; R.ses = (await CI.db.ref('sessions/' + R.tid + '/' + sid).once('value')).val();
    run();
  }catch(e){ identify(/PERMISSION/i.test(e.code || e.message) ? t('st.e.denied') : CI.errMsg(e)); }
}
function resume(){ R.answers = R.ses.answers || {}; run(); }

/* ---------------------------------------------------------------- ishlash ekrani */
function run(){
  R.answers = R.answers || {}; R.pos = R.ses.pos || 0; R.warns = R.ses.violations || 0;
  R.order = (R.ses.order || L.qOrder(R.test)).filter(id => R.test.questions[id]);
  R.optOrder = R.ses.optOrder || {};
  if(!R.preview){
    R.ref = CI.db.ref('sessions/' + R.tid + '/' + R.sid);
    R.ref.child('status').on('value', s => {
      const v = s.val(); if(!R) return;
      if(v === 'locked' && !R.locked) showLocked();
      else if(v === 'active' && R.locked){ R.locked = false; R.ses.status = 'active'; draw(); CI.toast(t('st.unlocked'), 'ok'); }
      else if(v === 'reset'){ cleanup(); CI.ls.del('l.sid.' + R.tid); fail(t('st.wasReset')); }
      else if(v === 'done' && !R.finished){ R.finished = true; cleanup(); showResult(); }
    });
    R.ref.child('review').on('value', s => { const v = s.val(); if(v && v.status === 'needs_revision' && R.ses.review?.status !== 'needs_revision'){ R.ses.review = v; draw(); } });
  }
  guard(true);
  if(R.ses.status === 'locked') return showLocked();
  if(R.st.fullscreen && !document.fullscreenElement) askFullscreen();
  draw();
  R.tick = setInterval(tick, 1000); tick();
  if(!R.preview){ const hb = () => R && R.ref && !R.finished && R.ref.child('lastSeen').set(CI.serverNow()).catch(() => {}); hb(); R.hb = setInterval(hb, 60000); }
}
function draw(){
  S._redraw = draw;
  if(R.locked) return showLocked();
  const x = R.test, one = R.st.oneByOne, ids = R.order;
  const answered = ids.filter(id => hasAns(R.answers[id])).length;
  const visible = one ? [ids[Math.min(R.pos, ids.length-1)]] : ids;
  app().innerHTML = `<div class="timerbar" id="tbar"><div><b id="t-left">—</b><div style="font-size:12px;opacity:.8">${esc(R.ses.name)}</div></div>
      <div style="text-align:right"><div>${t('st.answered', {a: answered, n: ids.length})}</div>
      <div class="pbar"><i style="width:${ids.length ? answered*100/ids.length : 0}%"></i></div></div></div>
    <div class="narrow ${R.st.noCopy ? 'noselect' : ''}" style="max-width:760px">
      ${R.ses.review && R.ses.review.status === 'needs_revision' ? `<div class="note">✍️ ${t('st.revision')}${R.ses.review.comment ? ': <b>' + esc(R.ses.review.comment) + '</b>' : ''}</div>` : ''}
      ${R.warns && R.st.onLeave !== 'off' ? `<div class="note red">⚠️ ${t('st.warnCount', {n: R.warns, m: R.st.maxWarn > 0 ? R.st.maxWarn : '∞'})}</div>` : ''}
      ${one ? `<div class="qnav">${ids.map((id, i) => `<button class="${i===R.pos?'cur':''} ${hasAns(R.answers[id])?'ok':''}" ${!R.st.allowBack && i < R.pos ? 'disabled' : ''}
        onclick="L.student.goQ(${i})">${i+1}</button>`).join('')}</div>` : ''}
      ${visible.map(id => qHtml(id, ids.indexOf(id))).join('')}
      <div class="flex mt2" style="justify-content:space-between">
        ${one && R.pos > 0 && R.st.allowBack !== false ? `<button class="btn-ghost" onclick="L.student.goQ(${R.pos-1})">← ${t('c.back')}</button>` : '<span></span>'}
        ${one && R.pos < ids.length - 1 ? `<button class="btn-p" onclick="L.student.goQ(${R.pos+1})">${t('st.next')} →</button>` :
          `<button class="btn-red btn-lg" onclick="L.student.submit()">✓ ${t('st.submit')}</button>`}
      </div>
      ${R.preview ? `<div class="note blue mt2">👁 ${t('st.previewNote')}</div>` : ''}
    </div>`;
  visible.forEach(id => mountQ(id));
  tick();
}
const hasAns = a => !!a && ((a.v != null && !(Array.isArray(a.v) && !a.v.length)) || (a.text && String(a.text).trim()) || (a.writing && a.writing.length) || a.freehand);
function promptBlock(q){
  const p = q.prompt || {};
  const parts = [];
  if(p.hanzi && q.type !== 'writing') parts.push(`<div class="hz-han" style="font-size:44px;line-height:1.2">${esc(p.hanzi)}</div>`);
  if(p.pinyin) parts.push(`<div style="font-size:20px">${esc(p.pinyin)}</div>`);
  if(p.translation) parts.push(`<div class="muted" style="font-size:16px">${esc(p.translation)}</div>`);
  return parts.length ? `<div class="q-prompt">${parts.join('')}</div>` : '';
}
function qHtml(id, i){
  const q = R.test.questions[id], a = R.answers[id] || {};
  const head = `<div class="q-text"><span class="q-num">${i+1}.</span> ${q.text ? esc(q.text).replace(/\n/g,'<br>') : `<span class="muted">${t('qt.' + q.type + '.help')}</span>`}
    ${q.points != null && q.points !== 1 ? `<span class="pill p-gray">${t('st.pts', {n: q.points})}</span>` : ''}</div>
    ${q.img ? `<img src="${esc(q.img)}" alt="" style="max-width:100%;max-height:320px;border-radius:10px;margin-bottom:10px" referrerpolicy="no-referrer">` : ''}`;
  let body = '';
  if(q.type === 'single' || q.type === 'multi'){
    const ord = R.optOrder[id] || (q.options||[]).map((_, j) => j);
    const sel = q.type === 'single' ? [a.v] : (a.v || []);
    body = ord.map((j, n) => `<label class="opt ${sel.includes(j)?'sel':''}"><input type="${q.type==='single'?'radio':'checkbox'}" name="o-${id}" ${sel.includes(j)?'checked':''}
      onchange="L.student.pick('${id}',${j},this.checked)"><b>${L.LETTERS[n]}.</b> <span>${esc(q.options[j])}</span></label>`).join('')
      + (q.type === 'multi' ? `<p class="muted" style="font-size:12.5px">${t('st.multiHint')}</p>` : '');
  } else if(q.type === 'tf'){
    body = [[true,'✓ ' + t('q.true')],[false,'✗ ' + t('q.false')]].map(([v, l]) => `<label class="opt ${a.v===v?'sel':''}"><input type="radio" name="o-${id}" ${a.v===v?'checked':''}
      onchange="L.student.setV('${id}',${v})"> <span>${l}</span></label>`).join('');
  } else if(q.type === 'writing'){
    body = promptBlock(q) + `<div id="wr-${id}"></div>`;
  } else {
    const ph = q.type === 'pinyin' ? 'nǐ hǎo / ni3 hao3' : q.type === 'translation' ? t('st.trPh') : q.type === 'text' ? t('st.textPh') : '汉字';
    body = promptBlock(q) + (q.type === 'dictation' ? `<div class="flex mb"><button class="btn-ghost" onclick="L.hz.speak(${CI.jsq(q.target)}, .8)">🔊 ${t('st.listen')}</button>
      <button class="btn-ghost btn-sm" onclick="L.hz.speak(${CI.jsq(q.target)}, .5)">🐢 ${t('st.slow')}</button></div>` : '')
      + `<input class="${q.type==='hanzi_input'||q.type==='dictation'?'hz-han':''}" style="font-size:${q.type==='hanzi_input'||q.type==='dictation'?'24px':'16px'}"
        value="${esc(a.text||'')}" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" spellcheck="false" oninput="L.student.setText('${id}',this.value)">`;
  }
  return `<div class="q-card">${head}${body}</div>`;
}
function mountQ(id){
  const q = R.test.questions[id];
  if(q.type === 'writing'){ const el = $('#wr-' + id); if(el) L.hz.mountWriting(el, q, R.answers[id], v => save(id, v), { grid: R.st.grid, hintAfter: R.st.hintAfter }); }
}
S.goQ = i => { if(!R.st.allowBack && i < R.pos) return; R.pos = Math.max(0, Math.min(R.order.length - 1, i)); if(R.ref) R.ref.child('pos').set(R.pos).catch(() => {}); draw(); window.scrollTo(0, 0); };
S.pick = (id, j, on) => {
  const q = R.test.questions[id];
  if(q.type === 'single') save(id, { v: j });
  else { const s = new Set((R.answers[id] || {}).v || []); on ? s.add(j) : s.delete(j); save(id, { v: [...s].sort((a,b) => a-b) }); }
  draw();
};
S.setV = (id, v) => { save(id, { v }); draw(); };
let txtT = {};
S.setText = (id, v) => { R.answers[id] = { text: v }; clearTimeout(txtT[id]); txtT[id] = setTimeout(() => save(id, { text: v }, true), 500); updBar(); };
function updBar(){ const ids = R.order, a = ids.filter(id => hasAns(R.answers[id])).length; const b = $('.pbar i'); if(b) b.style.width = (a*100/ids.length) + '%'; }
function save(id, val, quiet){
  R.answers[id] = val;
  if(R.preview) return;
  R.ref.child('answers/' + id).set(val).catch(e => { if(!quiet) CI.toast(t('st.e.save') + ' ' + CI.errMsg(e), 'err'); });
}

/* ---------------------------------------------------------------- vaqt */
function tick(){
  if(!R) return;
  const el = $('#t-left'); const bar = $('#tbar');
  if(!R.ses.deadline){ if(el) el.textContent = '∞'; return; }
  const left = Math.max(0, Math.round((R.ses.deadline - now()) / 1000));
  if(el) el.textContent = String(Math.floor(left/60)).padStart(2,'0') + ':' + String(left%60).padStart(2,'0');
  if(bar){ bar.classList.toggle('warn', left < 120); bar.classList.toggle('crit', left < 30); }
  if(left <= 0 && !R.finished && !R.locked) finish(true);
}

/* ---------------------------------------------------------------- himoya (antichit) */
let leaveT = null;
function guard(on){
  const vis = () => { if(document.visibilityState === 'hidden') leave('hidden'); };
  const blur = () => { clearTimeout(leaveT); leaveT = setTimeout(() => { if(!document.hasFocus()) leave('blur'); }, 1500); };
  const fs = () => { if(R && R.st.fullscreen && !document.fullscreenElement && !R.finished) leave('fullscreen'); };
  const stop = e => { if(R && R.st.noCopy && !R.finished){ e.preventDefault(); } };
  const keys = e => { if(R && R.st.noCopy && (e.ctrlKey || e.metaKey) && /^[cvxapsu]$/i.test(e.key)) e.preventDefault(); };
  const unload = e => { if(R && !R.finished && !R.preview){ e.preventDefault(); e.returnValue = ''; } };
  const evs = [['visibilitychange', vis, document], ['blur', blur, window], ['fullscreenchange', fs, document], ['copy', stop, document], ['cut', stop, document],
    ['paste', stop, document], ['contextmenu', stop, document], ['keydown', keys, document], ['beforeunload', unload, window]];
  if(on){ R.unguard && R.unguard(); evs.forEach(([n, f, o]) => o.addEventListener(n, f)); R.unguard = () => evs.forEach(([n, f, o]) => o.removeEventListener(n, f)); }
}
function leave(kind){
  if(!R || R.finished || R.locked || R.preview) return;
  if(R._lastLeave && Date.now() - R._lastLeave < 2500) return;     // bitta chiqish uchun ikki hodisa (blur + hidden) — bir marta sanaladi
  R._lastLeave = Date.now();
  R.warns++;
  R.ref.child('violations').set(R.warns).catch(() => {});
  R.ref.child('events').push({ k: kind, at: CI.serverNow() }).catch(() => {});
  const m = R.st.onLeave;
  if(m === 'off') return;
  if(m === 'block' || (m === 'warn' && R.st.maxWarn > 0 && R.warns >= R.st.maxWarn)){ lock(); return; }
  CI.modal({ title: '⚠️ ' + t('st.warnTitle'), html: `<p>${t('st.warnText')}</p><p><b>${t('st.warnCount', {n: R.warns, m: R.st.maxWarn > 0 ? R.st.maxWarn : '∞'})}</b></p>
    ${R.st.maxWarn > 0 ? `<p class="muted">${t('st.warnLeft', {n: R.st.maxWarn - R.warns})}</p>` : ''}`, actions: [{label: t('st.continue'), cls: 'btn-p', fn: () => { if(R.st.fullscreen) askFullscreen(); }}] });
  draw();
}
function lock(){ R.locked = true; R.ses.status = 'locked'; R.ref.child('status').set('locked').catch(() => {}); showLocked(); }
function showLocked(){
  R.locked = true; S._redraw = showLocked;
  const pin = R.st.unlockCode;
  app().innerHTML = `<div class="narrow" style="max-width:520px;margin-top:30px"><div class="card center">
    <div style="font-size:56px">🔒</div><h2 style="justify-content:center">${t('st.locked')}</h2>
    <p class="muted">${t('st.lockedText')}</p>
    ${pin ? `<div class="mt2"><label>${t('st.unlockCode')}</label><input id="u-pin" inputmode="numeric" maxlength="8" autocomplete="off"
      style="font-family:ui-monospace,monospace;font-size:26px;letter-spacing:6px;text-align:center"><div id="u-msg"></div>
      <button class="btn-p btn-block mt" onclick="L.student.unlock()">🔓 ${t('st.unlock')}</button></div>` : ''}
    <p class="muted mt2" style="font-size:12.5px">${t('st.lockedWait')}</p></div></div>`;
  const i = $('#u-pin'); if(i) i.onkeydown = e => { if(e.key === 'Enter') S.unlock(); };
}
S.unlock = async () => {
  const v = $('#u-pin').value.trim(); if(!v) return;
  try{ await R.ref.update({ unlockTry: v, status: 'active' }); R.locked = false; R.ses.status = 'active'; draw(); if(R.st.fullscreen) askFullscreen(); }
  catch(e){ $('#u-msg').innerHTML = `<div class="note red">${t('st.badPin')}</div>`; }
};
function askFullscreen(){
  if(document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement.requestFullscreen().catch(() => {
    CI.modal({ title: '⛶', html: `<p>${t('st.r.full')}</p>`, sticky: true, actions: [{label: '⛶ ' + t('st.goFull'), cls: 'btn-p', fn: () => document.documentElement.requestFullscreen().catch(() => {})}] });
  });
}

/* ---------------------------------------------------------------- yakunlash */
S.submit = async () => {
  const left = R.order.filter(id => !hasAns(R.answers[id])).length;
  if(!await CI.confirm(left ? t('st.submitQLeft', {n: left}) : t('st.submitQ'), { ok: t('st.submit') })) return;
  finish(false);
};
async function finish(timeout){
  if(R.finished) return; R.finished = true;
  Object.keys(txtT).forEach(id => { clearTimeout(txtT[id]); });
  if(R.preview){ cleanup(); return previewResult(); }
  page(`<div class="card center"><p class="muted">${t('st.sending')}</p></div>`);
  try{
    const up = {}; R.order.forEach(id => { if(R.answers[id] && R.answers[id].text != null) up['answers/' + id] = R.answers[id]; });
    if(Object.keys(up).length) await R.ref.update(up).catch(() => {});
    await R.ref.update({ status: 'done', finishedAt: CI.serverNow() });
  }catch(e){ if(!timeout){ R.finished = false; CI.toast(CI.errMsg(e), 'err'); return draw(); } }
  cleanup();
  showResult();
}
function cleanup(){ if(!R) return; clearInterval(R.tick); clearInterval(R.hb); R.unguard && R.unguard(); if(R.ref){ R.ref.child('status').off(); R.ref.child('review').off(); }
  if(document.fullscreenElement) document.exitFullscreen().catch(() => {}); CI.$$('.modal-bg').forEach(m => m.remove()); }

async function showResult(){
  S._redraw = showResult;
  page(`<div class="card center"><p class="muted">${t('st.sending')}</p></div>`);
  let res = null, hidden = false, key = null;
  if(CI.cfg.appsScriptUrl){
    try{ const r = await L.gas({ action: 'grade', tid: R.tid, sid: R.sid }); if(r && r.ok){ res = r.result; hidden = !!(res && res.hidden); key = res && res.key; } }catch(e){}
  }
  if(!res){ try{ res = (await CI.db.ref('results/' + R.tid + '/' + R.sid).once('value')).val(); }catch(e){ hidden = true; } }
  renderResult(res, hidden, key);
  if(!res && !hidden){   // laoshi baholaguncha kutish
    R.resRef = CI.db.ref('results/' + R.tid + '/' + R.sid);
    R.resRef.on('value', s => { const v = s.val(); if(v){ R.resRef.off(); renderResult(v, false, null); } }, () => {});
  }
}
function renderResult(res, hidden, key){
  S._redraw = () => renderResult(res, hidden, key);
  const x = R.test, s = R.st;
  const canRetry = !x.groupId ? (s.attempts === 0 || (+(CI.ls.get('l.att.' + R.tid)||1)) < s.attempts) : (s.attempts === 0 || (R.ses.attempt||1) < s.attempts);
  let body = '';
  if(hidden || (res && res.hidden)) body = `<div style="font-size:56px">📨</div><h2 style="justify-content:center">${t('st.sent')}</h2><p class="muted">${t('st.hiddenScore')}</p>`;
  else if(!res) body = `<div style="font-size:56px">📨</div><h2 style="justify-content:center">${t('st.sent')}</h2><p class="muted">${t('st.pending')}</p>`;
  else {
    const pass = res.percent >= 56;
    body = `<div class="stamp ${pass?'pass':''}"><b>${esc(res.grade ?? Math.round(res.percent))}</b><span>${res.grade != null ? t('st.grade') : '%'}</span></div>
      <h2 style="justify-content:center">${res.score} / ${res.maxScore}</h2>
      <p class="muted">${t('st.correctOf', {c: res.correct, n: res.total})} · ${res.percent}%</p>
      ${res.pending ? `<p class="note">${t('st.pendingWriting', {n: res.pending})}</p>` : ''}`;
  }
  const review = res && res.verdicts && !res.hidden ? reviewHtml(res, key) : '';
  page(`<div class="card center"><h2 style="justify-content:center">${esc(x.title)}</h2><p><b>${esc(R.ses.name)}</b></p>${body}
    ${canRetry && !R.preview ? `<button class="btn-ghost mt" onclick="L.student.retry()">↺ ${t('st.retry')}</button>` : ''}
    ${x.groupId ? `<div class="mt"><a href="?portal=${x.groupId}">${t('st.toPortal')} →</a></div>` : ''}</div>${review}`);
}
function reviewHtml(res, key){
  const x = R.test;
  return `<div class="card"><h3>${t('st.review')}</h3>${R.order.map((id, i) => { const q = x.questions[id], v = res.verdicts[id], a = R.answers[id] || (R.ses.answers||{})[id] || {};
    const ok = v === 'correct', part = typeof v === 'number';
    const mine = q.type === 'single' ? (q.options||[])[a.v] : q.type === 'multi' ? (a.v||[]).map(j => q.options[j]).join(', ') : q.type === 'tf' ? (a.v == null ? '' : a.v ? t('q.true') : t('q.false')) :
      q.type === 'writing' ? (a.writing||[]).map(c => c.char).join('') : a.text;
    const k = key && key[id]; const right = !k ? '' : q.type === 'single' ? q.options[k.c] : q.type === 'multi' ? (k.c||[]).map(j => q.options[j]).join(', ') :
      q.type === 'tf' ? (k.c ? t('q.true') : t('q.false')) : (k.accepted||[])[0];
    return `<div class="lrow" style="border-left:4px solid ${ok ? 'var(--jade)' : part ? 'var(--amber)' : v === 'unanswered' ? '#B9BFC6' : 'var(--red)'}">
      <div class="lrow-main"><b>${i+1}.</b> ${esc(L.qPromptText(q))}<div class="muted">${t('st.yourAns')}: <b>${esc(mine || '—')}</b>
      ${right && !ok ? ` · ${t('st.rightAns')}: <b style="color:var(--jade)">${esc(right)}</b>` : ''}</div></div>
      <div>${ok ? '✓' : part ? Math.round(v*100) + '%' : v === 'unanswered' ? '…' : '✗'}</div></div>`; }).join('')}</div>`;
}
function previewResult(){
  page(`<div class="card center"><div style="font-size:48px">👁</div><h2 style="justify-content:center">${t('st.previewDone')}</h2>
    <p class="muted">${t('st.answered', {a: R.order.filter(id => hasAns(R.answers[id])).length, n: R.order.length})}</p>
    <button class="btn-ghost mt" onclick="location.reload()">↺ ${t('st.retry')}</button></div>`);
}
S.retry = () => { CI.ls.del('l.sid.' + R.tid); const tid = R.tid; R = null; S.open(tid); };

/* ======================================================================= GURUH PORTALI */
S.portal = async gid => {
  if(!CI.fbReady){ app().innerHTML = CI.setupScreen(); return; }
  CI.initFirebase();
  CI.db.ref('.info/serverTimeOffset').on('value', s => { srvOff = s.val() || 0; });
  const draw = (err) => {
    S._redraw = () => draw(err);
    const saved = gid ? CI.ls.get(codeKey(gid)) : (CI.ls.get('ci.lastCode') || '');
    page(`<div class="card"><h2>🎒 ${t('pt.title')}</h2><p class="muted">${t('pt.hint')}</p>
      <label>${t('st.code')}</label><input id="p-code" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(saved||'')}"
        style="font-family:ui-monospace,monospace;font-size:24px;letter-spacing:4px;text-align:center;text-transform:uppercase">
      ${err ? `<div class="note red">${err}</div>` : ''}<button class="btn-brand btn-block btn-lg mt" id="p-go">${t('pt.enter')}</button></div><div id="p-list"></div>`, t('pt.title'));
    const go = () => enter($('#p-code').value); $('#p-go').onclick = go; $('#p-code').onkeydown = e => { if(e.key === 'Enter') go(); };
    if(saved && !err && !S._autoTried){ S._autoTried = true; go(); }
  };
  async function enter(code){
    code = String(code||'').trim().toUpperCase(); if(code.length < 4) return draw(t('st.e.code'));
    try{
      let g = gid;
      if(!g){ const c = (await CI.db.ref('codes/' + (await CI.sha('code:' + code))).once('value')).val(); g = c && c.g; }
      if(!g) return draw(t('st.e.code'));
      const h = await CI.codeHash(g, code); const r = (await CI.db.ref('roster/' + g + '/' + h).once('value')).val();
      if(!r) return draw(t('st.e.code'));
      CI.ls.set(codeKey(g), code); CI.ls.set('ci.lastCode', code);
      $('#p-list').innerHTML = `<p class="muted center">${t('c.loading')}</p>`;
      const tests = Object.entries((await CI.db.ref('tests').orderByChild('groupId').equalTo(g).once('value')).val() || {})
        .filter(([,x]) => x.status === 'open' || x.status === 'closed').sort((a,b) => (a[1].status === 'open' ? 0 : 1) - (b[1].status === 'open' ? 0 : 1) || (b[1].createdAt||0) - (a[1].createdAt||0));
      const rows = await Promise.all(tests.map(async ([tid, x]) => {
        let last = null, n = 0, res = null; const max = (x.settings||{}).attempts > 0 ? x.settings.attempts : 10;
        for(let i = 1; i <= max; i++){ const s = (await CI.db.ref('sessions/' + tid + '/' + r.s + '-' + i).once('value')).val(); if(!s) break; last = s; n = i; }
        if(last && last.status === 'done'){ try{ res = (await CI.db.ref('results/' + tid + '/' + r.s + '-' + n).once('value')).val(); }catch(e){} }
        return { tid, x, last, n, res };
      }));
      $('#p-list').innerHTML = `<div class="card"><h2>👋 ${esc(r.n)}</h2>${!rows.length ? `<div class="empty"><span class="ico">📭</span>${t('pt.none')}</div>` :
        rows.map(o => { const st = o.last ? (o.last.review && o.last.review.status === 'needs_revision' ? 'rev' : o.last.status) : 'new';
          const pill = st === 'done' ? CI.pill('p-green', '✓ ' + t('pt.done')) : st === 'rev' ? CI.pill('p-yellow', '✍️ ' + t('pt.revise')) : st === 'active' || st === 'locked' ? CI.pill('p-blue', t('pt.inProgress')) :
            o.x.status === 'closed' ? CI.pill('p-gray', t('l.st.closed')) : CI.pill('p-red', t('pt.new'));
          const btn = o.x.status !== 'open' && st !== 'done' ? '' : `<a class="btn btn-sm ${st === 'done' ? 'btn-ghost' : 'btn-red'}" href="?t=${o.tid}">${st === 'done' ? t('pt.view') : st === 'new' ? t('st.start') : t('pt.continue')}</a>`;
          return `<div class="lrow"><div class="lrow-main"><div class="lrow-title">${esc(o.x.title)} ${pill}</div>
            <div class="lrow-sub">${L.qOrder(o.x).length} ${t('st.r.questions')}${o.res ? ` · <b>${o.res.score}/${o.res.maxScore}</b>${o.res.grade != null ? ' · ' + esc(o.res.grade) : ''}` : ''}
            ${o.x.endAt ? ' · ⏰ ' + CI.fmtDT(o.x.endAt) : ''}</div></div><div class="lrow-act">${btn}</div></div>`; }).join('')}</div>
        <p class="center muted"><a href="#" onclick="CI.ls.del('${codeKey(g)}');CI.ls.del('ci.lastCode');location.reload();return false">${t('pt.logout')}</a></p>`;
      // Shu qurilmada test davom ettirilganda to'g'ri sessiya topilishi uchun
      rows.forEach(o => { if(o.last && o.last.status !== 'done') CI.ls.set('l.sid.' + o.tid, r.s + '-' + o.n); });
    }catch(e){ draw(CI.errMsg(e)); }
  }
  draw();
};

/* uslublar */
document.head.insertAdjacentHTML('beforeend', `<style>
.timerbar{position:sticky;top:0;z-index:50;background:var(--ink);color:#fff;border-radius:0 0 12px 12px;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;margin:0 -16px 16px;gap:12px}
.timerbar b{font-family:var(--serif);font-size:22px;letter-spacing:.05em}.timerbar.warn b{color:#FFC96B}.timerbar.crit b{color:#FF8A7A}
.pbar{height:6px;width:140px;background:rgba(255,255,255,.2);border-radius:9px;overflow:hidden;margin-top:4px}.pbar i{display:block;height:100%;background:#7FD8AE}
.q-card{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;margin-bottom:14px}
.q-num{font-family:var(--serif);font-weight:900;color:var(--red);font-size:16px;margin-right:4px}
.q-text{font-weight:600;font-size:16px;margin-bottom:12px;line-height:1.5}
.q-prompt{background:#FBFAF6;border:1px dashed var(--line);border-radius:10px;padding:12px;margin-bottom:12px;text-align:center}
.opt{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1.5px solid var(--line);border-radius:9px;margin:0 0 8px;cursor:pointer;font-weight:500;font-size:15px}
.opt:hover{border-color:var(--ink-soft)}.opt.sel{border-color:var(--ink);background:#F4F6F8;box-shadow:inset 3px 0 0 var(--ink)}
.opt input{margin-top:4px}
.noselect{user-select:none;-webkit-user-select:none}.noselect input{user-select:text;-webkit-user-select:text}
.qnav{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px}.qnav button{width:36px;height:36px;padding:0;background:#fff;border:1.5px solid var(--line);color:var(--ink-soft)}
.qnav button.ok{background:var(--jade-soft);border-color:#BFE0CF;color:var(--jade)}.qnav button.cur{border-color:var(--ink);color:var(--ink);box-shadow:inset 0 -3px 0 var(--ink)}
.stamp{width:120px;height:120px;border:5px solid var(--red);border-radius:14px;color:var(--red);display:flex;flex-direction:column;align-items:center;justify-content:center;margin:18px auto;font-family:var(--serif);transform:rotate(-6deg)}
.stamp b{font-size:40px;font-weight:900;line-height:1}.stamp span{font-size:12px;font-weight:700;letter-spacing:.1em}.stamp.pass{border-color:var(--jade);color:var(--jade)}
@media(max-width:640px){.timerbar{margin:0 -10px 14px}.q-card{padding:14px}}
</style>`);
})();
