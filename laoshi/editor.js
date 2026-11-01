/* ============================================================================
   LAOSHI — topshiriq muharriri: savollar (9 tur), tayyor sozlamalar, himoya, natija
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, L = window.L, t = (k,v) => CI.t(k,v), esc = CI.esc, $ = CI.$;
const E = L.editor = {};
let S = null;   // {id, test, keys, pin, hasResults, _for}

/* ---------------------------------------------------------------- tayyor sozlamalar (preset) */
const BASE = { timeLimit: 0, attempts: 1, shuffleQ: false, shuffleOpt: false, oneByOne: false, allowBack: true,
  onLeave: 'warn', maxWarn: 3, unlockCode: true, fullscreen: false, noCopy: true,
  showScore: 'now', showAnswers: 'never', maxScore: 100, partial: false,
  requireTones: true, tolerance: 3, grid: 'tian', hintAfter: 3, criteria: L.DEFAULT_CRITERIA };
E.PRESETS = {
  simple:   { timeLimit: 20, attempts: 1, shuffleQ: true, shuffleOpt: true, onLeave: 'warn', maxWarn: 3, unlockCode: true, showScore: 'now', showAnswers: 'never', noCopy: true, fullscreen: false, oneByOne: false },
  exam:     { timeLimit: 45, attempts: 1, shuffleQ: true, shuffleOpt: true, onLeave: 'block', maxWarn: 0, unlockCode: true, fullscreen: true, noCopy: true, showScore: 'end', showAnswers: 'never', oneByOne: true, allowBack: true },
  practice: { timeLimit: 0, attempts: 0, shuffleQ: false, shuffleOpt: false, onLeave: 'off', unlockCode: false, fullscreen: false, noCopy: false, showScore: 'now', showAnswers: 'now', oneByOne: true, allowBack: true },
  homework: { timeLimit: 0, attempts: 2, shuffleQ: false, shuffleOpt: true, onLeave: 'off', unlockCode: false, fullscreen: false, noCopy: false, showScore: 'now', showAnswers: 'end', oneByOne: false },
  hanzi:    { timeLimit: 0, attempts: 0, onLeave: 'off', unlockCode: false, fullscreen: false, noCopy: false, showScore: 'now', showAnswers: 'now', oneByOne: true, allowBack: true, requireTones: true, tolerance: 3, hintAfter: 3 }
};

/* ---------------------------------------------------------------- yuklash */
E.render = async () => {
  const id = L.editId || null;
  if(!S || S._for !== (id || 'new')){
    S = { _for: id || 'new', id, loading: !!id };
    if(id){
      L.app.innerHTML = L.shell(`<p class="muted">${t('c.loading')}</p>`);
      try{
        const [tt, kk, ss] = await Promise.all([CI.db.ref('tests/' + id).once('value'), CI.db.ref('testKeys/' + id).once('value'),
          CI.db.ref('sessions/' + id).limitToFirst(1).once('value')]);
        if(!tt.exists()){ L.app.innerHTML = L.shell(`<div class="note red">${t('l.notFound')}</div>`); return; }
        const x = tt.val(), k = kk.val() || {};
        S.test = { title: x.title, desc: x.desc || '', groupId: x.groupId || '', status: x.status || 'draft', startAt: x.startAt || null, endAt: x.endAt || null,
          settings: Object.assign({}, BASE, x.settings || {}), order: L.qOrder(x), questions: JSON.parse(JSON.stringify(x.questions || {})),
          ownerUid: x.ownerUid, ownerName: x.ownerName, createdAt: x.createdAt, shared: x.shared || null, sourceId: x.sourceId || null };
        S.keys = k.answers || {}; S.pin = k.pin || L.newPin(); S.hasResults = ss.exists();
      }catch(e){ L.app.innerHTML = L.shell(`<div class="note red">${CI.errMsg(e)}</div>`); return; }
    } else {
      S.test = { title: '', desc: '', groupId: '', status: 'draft', startAt: null, endAt: null,
        settings: Object.assign({}, BASE, E.PRESETS.simple, { preset: 'simple' }), order: [], questions: {} };
      S.keys = {}; S.pin = L.newPin();
      if(L.editSrc){ L.editSrc(S); L.editSrc = null; }
    }
    S.loading = false;
  }
  draw();
};
E.reset = () => { S = null; };

/* ---------------------------------------------------------------- chizish */
const st = () => S.test.settings;
function draw(){
  const x = S.test;
  L.app.innerHTML = L.shell(`
    <div class="card">
      <h2>${S.id ? '✏️ ' + t('e.editTitle') : '➕ ' + t('l.newTest')}</h2>
      ${S.hasResults ? `<div class="note red">⚠️ ${t('e.hasResults')}</div>` : ''}
      <label>${t('e.title')}</label><input id="e-title" value="${esc(x.title)}" placeholder="${esc(t('e.titlePh'))}" oninput="L.editor.f('title', this.value)">
      <label>${t('e.desc')} <span class="muted">(${t('c.optional')})</span></label>
      <textarea rows="2" placeholder="${esc(t('e.descPh'))}" oninput="L.editor.f('desc', this.value)">${esc(x.desc)}</textarea>
      <div class="row">
        <div style="flex:2"><label>${t('e.access')}</label>${CI.G.selectHtml('e-g', x.groupId, {onchange:'L.editor.f(\'groupId\', this.value)', empty: '🔗 ' + t('e.accessOpen')})}
          <div class="muted" style="font-size:12.5px;margin-top:4px">${x.groupId ? t('e.accessGroupHint') : t('e.accessOpenHint')}</div></div>
        <div><label>${t('e.startAt')}</label><input type="datetime-local" value="${dtl(x.startAt)}" onchange="L.editor.f('startAt', L.editor.pdt(this.value))"></div>
        <div><label>${t('e.endAt')}</label><input type="datetime-local" value="${dtl(x.endAt)}" onchange="L.editor.f('endAt', L.editor.pdt(this.value))"></div>
      </div>
    </div>

    <div class="card">
      <h2>🎛 ${t('e.presets')}</h2><p class="muted">${t('e.presetsHint')}</p>
      <div class="flex mt">${Object.keys(E.PRESETS).map(p => `<button class="${st().preset===p?'btn-p':'btn-ghost'} btn-sm" onclick="L.editor.preset('${p}')"
        title="${esc(t('preset.' + p + '.d'))}">${t('preset.' + p)}</button>`).join('')}</div>
      ${st().preset ? `<p class="muted mt">ℹ️ ${t('preset.' + st().preset + '.d')}</p>` : ''}
    </div>

    <div class="card" id="e-qs">
      <h2>❓ ${t('e.questions')} <span class="muted" style="font-family:var(--sans);font-size:14px">${t('l.qCount',{n:x.order.length})} · ${t('e.points',{n:totalPts()})}</span></h2>
      ${!x.order.length ? `<div class="empty"><span class="ico">❓</span>${t('e.noQ')}</div>` : x.order.map((qid,i) => qCard(qid, i)).join('')}
      <div class="e-add">
        <b class="muted" style="font-size:12.5px">${t('e.addQ')}:</b>
        ${['single','multi','tf','text'].map(ty => `<button class="btn-ghost btn-sm" onclick="L.editor.addQ('${ty}')">${L.typeLabel(ty)}</button>`).join('')}
        <button class="btn-ghost btn-sm" onclick="L.hz.pickWords()">汉字 ${t('e.fromWords')}</button>
        <button class="btn-ghost btn-sm" onclick="L.editor.importDlg()">📥 ${t('e.import')}</button>
      </div>
    </div>

    ${settingsCard()}

    <div class="e-foot no-print">
      <button class="btn-ghost" onclick="L.go('tests')">${t('c.cancel')}</button>
      <span class="spacer"></span>
      <button class="btn-ghost" onclick="L.editor.save('keep')">💾 ${S.id ? t('c.save') : t('e.saveDraft')}</button>
      <button class="btn-brand" onclick="L.editor.save('open')">▶ ${S.test.status === 'open' ? t('e.saveOpen2') : t('e.saveOpen')}</button>
    </div>
    <style>
      .qc{border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px;background:#fff}
      .qc-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
      .qc-h .n{font-family:var(--serif);font-weight:900;color:var(--red);font-size:17px}
      .qc .opt-row{display:flex;gap:8px;align-items:center;margin-top:6px}
      .qc .opt-row input[type=text]{flex:1}
      .qc .opt-row .lt{width:22px;font-weight:700;color:var(--ink-soft)}
      .e-add{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
      .e-foot{position:sticky;bottom:0;z-index:40;display:flex;gap:8px;align-items:center;background:rgba(246,245,241,.95);backdrop-filter:blur(8px);
        border-top:1px solid var(--line);padding:12px 0;margin-top:10px}
      .sgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px 22px}
      .sgrid h3{grid-column:1/-1;margin:14px 0 0;font-size:15px}
      .seg{display:inline-flex;border:1.5px solid var(--line);border-radius:9px;overflow:hidden;flex-wrap:wrap}
      .seg button{border-radius:0;background:#fff;color:var(--ink-soft);font-size:13px;padding:7px 11px;font-weight:600}
      .seg button.on{background:var(--ink);color:#fff}
      .pinbox{font-family:ui-monospace,monospace;font-size:22px;font-weight:800;letter-spacing:3px;background:#F0F1EC;border-radius:8px;padding:2px 10px}
    </style>`);
}
function dtl(ms){ if(!ms) return ''; const d = new Date(ms); const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
E.pdt = v => v ? new Date(v).getTime() : null;
function totalPts(){ return S.test.order.reduce((a, id) => a + (+(S.test.questions[id].points ?? 1) || 0), 0); }
E.f = (k, v) => { S.test[k] = v; if(k === 'groupId') draw(); };
E.s = (k, v) => { st()[k] = v; st().preset = null; draw(); };
E.sv = (k, v) => { st()[k] = v; st().preset = null; };     // qayta chizmasdan (matn maydonlari uchun)
E.preset = p => { Object.assign(st(), E.PRESETS[p], { preset: p }); draw(); };

/* ---------------------------------------------------------------- savol kartochkasi */
function qCard(qid, i){
  const q = S.test.questions[qid], k = S.keys[qid] || (S.keys[qid] = {});
  const head = `<div class="qc-h"><span class="n">${i+1}.</span><b>${L.typeLabel(q.type)}</b><span class="spacer"></span>
    <label style="margin:0;font-weight:500" class="muted">${t('e.pts')}</label>
    <input type="number" min="0" step="0.5" value="${q.points ?? 1}" style="width:72px;padding:5px 8px" onchange="L.editor.qf('${qid}','points',+this.value)">
    <button class="btn-ghost btn-xs" title="↑" onclick="L.editor.move('${qid}',-1)">↑</button>
    <button class="btn-ghost btn-xs" title="↓" onclick="L.editor.move('${qid}',1)">↓</button>
    <button class="btn-ghost btn-xs" title="${esc(t('l.duplicate'))}" onclick="L.editor.dup('${qid}')">⧉</button>
    <button class="btn-ghost btn-xs" title="${esc(t('c.delete'))}" onclick="L.editor.delQ('${qid}')">🗑</button></div>`;
  let body = '';
  const textArea = (ph) => `<textarea rows="2" placeholder="${esc(ph || t('e.qText'))}" oninput="L.editor.qf('${qid}','text',this.value)">${esc(q.text||'')}</textarea>`;
  const img = `<details ${q.img?'open':''} class="mt"><summary class="muted" style="cursor:pointer;font-size:12.5px">🖼 ${t('e.img')}</summary>
    <input placeholder="https://…/rasm.png" value="${esc(q.img||'')}" oninput="L.editor.qf('${qid}','img',this.value.trim()||null)"></details>`;
  if(q.type === 'single' || q.type === 'multi'){
    const correct = q.type === 'single' ? [k.c] : (k.c || []);
    body = textArea() + `<div>${(q.options||[]).map((o,j) => `<div class="opt-row"><span class="lt">${L.LETTERS[j]}</span>
      <input type="${q.type==='single'?'radio':'checkbox'}" name="c-${qid}" ${correct.includes(j)?'checked':''} title="${esc(t('e.correct'))}" onchange="L.editor.setC('${qid}',${j},this.checked)">
      <input type="text" value="${esc(o)}" oninput="L.editor.opt('${qid}',${j},this.value)" placeholder="${esc(t('e.option'))} ${L.LETTERS[j]}">
      <button class="btn-ghost btn-xs" onclick="L.editor.delOpt('${qid}',${j})">✕</button></div>`).join('')}
      <button class="btn-ghost btn-xs mt" onclick="L.editor.addOpt('${qid}')">+ ${t('e.addOpt')}</button>
      <span class="muted" style="font-size:12px"> · ${q.type==='single' ? t('e.markOne') : t('e.markMany')}</span></div>` + img;
  } else if(q.type === 'tf'){
    body = textArea(t('e.tfPh')) + `<div class="flex mt">
      <label class="chk" style="margin:0"><input type="radio" name="c-${qid}" ${k.c===true?'checked':''} onchange="L.editor.key('${qid}','c',true)"> ✓ ${t('q.true')}</label>
      <label class="chk" style="margin:0"><input type="radio" name="c-${qid}" ${k.c===false?'checked':''} onchange="L.editor.key('${qid}','c',false)"> ✗ ${t('q.false')}</label></div>` + img;
  } else if(q.type === 'text'){
    body = textArea() + `<label>${t('e.accepted')}</label>
      <textarea rows="2" placeholder="${esc(t('e.acceptedPh'))}" oninput="L.editor.acc('${qid}',this.value)">${esc((k.accepted||[]).join('\n'))}</textarea>
      <label class="chk"><input type="checkbox" ${q.exact?'checked':''} onchange="L.editor.qf('${qid}','exact',this.checked||null)"> ${t('e.exact')}</label>` + img;
  } else {
    body = L.hz.editBody(qid, q, k);
  }
  return `<div class="qc">${head}${body}</div>`;
}
E.qf = (qid, f, v) => { if(v == null || v === '') delete S.test.questions[qid][f]; else S.test.questions[qid][f] = v; if(f === 'points') draw(); };
E.key = (qid, f, v) => { (S.keys[qid] = S.keys[qid] || {})[f] = v; };
E.acc = (qid, v) => { (S.keys[qid] = S.keys[qid] || {}).accepted = v.split('\n').map(s => s.trim()).filter(Boolean); };
E.setC = (qid, j, on) => {
  const q = S.test.questions[qid], k = S.keys[qid] = S.keys[qid] || {};
  if(q.type === 'single') k.c = j;
  else { const c = new Set(k.c || []); on ? c.add(j) : c.delete(j); k.c = [...c].sort((a,b) => a-b); }
};
E.opt = (qid, j, v) => { S.test.questions[qid].options[j] = v; };
E.addOpt = qid => { const q = S.test.questions[qid]; q.options = q.options || []; if(q.options.length >= 8) return; q.options.push(''); draw(); };
E.delOpt = (qid, j) => {
  const q = S.test.questions[qid], k = S.keys[qid] || {}; q.options.splice(j, 1);
  if(q.type === 'single'){ if(k.c === j) delete k.c; else if(k.c > j) k.c--; }
  else k.c = (k.c || []).filter(x => x !== j).map(x => x > j ? x - 1 : x);
  draw();
};
E.newId = () => { let id; do { id = 'q' + CI.rid(6); } while(S.test.questions[id]); return id; };
E.addQ = (type, data, key, noDraw) => {
  const id = E.newId();
  const q = Object.assign({ type, points: 1 }, data || {});
  if((type === 'single' || type === 'multi') && !q.options) q.options = ['', '', '', ''];
  S.test.questions[id] = q; S.test.order.push(id); S.keys[id] = key || {};
  if(!noDraw){ draw(); const el = document.querySelectorAll('.qc'); if(el.length) el[el.length-1].scrollIntoView({behavior:'smooth', block:'center'}); }
  return id;
};
E.addMany = list => { list.forEach(x => E.addQ(x.type, x.q, x.key, true)); draw(); CI.toast(t('e.addedN',{n:list.length}), 'ok'); };
E.move = (qid, d) => { const o = S.test.order, i = o.indexOf(qid), j = i + d; if(j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; draw(); };
E.dup = qid => { const id = E.newId(); S.test.questions[id] = JSON.parse(JSON.stringify(S.test.questions[qid])); S.keys[id] = JSON.parse(JSON.stringify(S.keys[qid] || {}));
  S.test.order.splice(S.test.order.indexOf(qid) + 1, 0, id); draw(); };
E.delQ = async qid => { if(!await CI.confirm(t('e.delQ'), {danger:true})) return;
  delete S.test.questions[qid]; delete S.keys[qid]; S.test.order = S.test.order.filter(x => x !== qid); draw(); };
E.redraw = () => draw();
E.state = () => S;

/* ---------------------------------------------------------------- sozlamalar */
function seg(key, vals){ return `<div class="seg">${vals.map(v => `<button class="${st()[key]===v?'on':''}" onclick="L.editor.s('${key}','${v}')">${t('set.' + key + '.' + v)}</button>`).join('')}</div>`; }
function chk(key, label, hint){ return `<label class="chk"><input type="checkbox" ${st()[key]?'checked':''} onchange="L.editor.s('${key}',this.checked)">
  <span>${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`; }
function num(key, label, min, max, hint){ return `<div><label>${label}</label><input type="number" min="${min}" max="${max}" value="${st()[key] ?? 0}"
  onchange="L.editor.s('${key}', Math.max(${min}, Math.min(${max}, +this.value||0)))">${hint?`<div class="muted" style="font-size:12px;margin-top:3px">${hint}</div>`:''}</div>`; }
function settingsCard(){
  const s = st(), hasHz = S.test.order.some(id => L.HANZI_TYPES.includes(S.test.questions[id].type));
  const hasMulti = S.test.order.some(id => S.test.questions[id].type === 'multi');
  return `<div class="card"><h2>⚙️ ${t('e.settings')}</h2>
  <div class="sgrid">
    <h3>⏱ ${t('set.g.time')}</h3>
    ${num('timeLimit', t('set.timeLimit'), 0, 600, t('set.timeLimitHint'))}
    ${num('attempts', t('set.attempts'), 0, 20, t('set.attemptsHint'))}

    <h3>🔀 ${t('set.g.order')}</h3>
    <div>${chk('shuffleQ', t('set.shuffleQ'))}${chk('shuffleOpt', t('set.shuffleOpt'))}</div>
    <div>${chk('oneByOne', t('set.oneByOne'), t('set.oneByOneHint'))}${s.oneByOne ? chk('allowBack', t('set.allowBack')) : ''}</div>

    <h3>🛡 ${t('set.g.protect')}</h3>
    <div style="grid-column:1/-1"><label>${t('set.onLeave')}</label>${seg('onLeave', ['off','warn','block'])}
      <div class="muted" style="font-size:12.5px;margin-top:5px">${t('set.onLeave.' + s.onLeave + '.d')}</div></div>
    ${s.onLeave === 'warn' ? num('maxWarn', t('set.maxWarn'), 0, 50, t('set.maxWarnHint')) : ''}
    ${s.onLeave !== 'off' ? `<div>${chk('unlockCode', t('set.unlockCode'), t('set.unlockCodeHint'))}
      ${s.unlockCode ? `<div class="flex mt"><span class="muted">${t('set.pin')}:</span><span class="pinbox">${esc(S.pin)}</span>
        <button class="btn-ghost btn-xs" onclick="L.editor.newPin()">🔁</button></div>` : ''}</div>` : ''}
    <div>${chk('fullscreen', t('set.fullscreen'), t('set.fullscreenHint'))}${chk('noCopy', t('set.noCopy'), t('set.noCopyHint'))}</div>

    <h3>🏁 ${t('set.g.result')}</h3>
    <div><label>${t('set.showScore')}</label>${seg('showScore', ['now','end','never'])}</div>
    <div><label>${t('set.showAnswers')}</label>${seg('showAnswers', ['now','end','never'])}</div>
    ${num('maxScore', t('set.maxScore'), 1, 1000)}
    <div><label>${t('set.criteria')}</label><textarea rows="4" class="mono" onchange="L.editor.crit(this.value)">${esc((s.criteria||[]).map(c => c.min + '=' + c.grade).join('\n'))}</textarea>
      <div class="muted" style="font-size:12px">${t('set.criteriaHint')}</div></div>
    ${hasMulti ? `<div>${chk('partial', t('set.partial'), t('set.partialHint'))}</div>` : ''}

    ${hasHz ? `<h3>汉字 ${t('set.g.hanzi')}</h3>
    <div>${chk('requireTones', t('set.requireTones'), t('set.requireTonesHint'))}</div>
    ${num('tolerance', t('set.tolerance'), 0, 10, t('set.toleranceHint'))}
    ${num('hintAfter', t('set.hintAfter'), 0, 10, t('set.hintAfterHint'))}
    <div><label>${t('set.grid')}</label>${seg('grid', ['tian','mi'])}</div>` : ''}
  </div></div>`;
}
E.crit = v => {
  const rows = []; v.split('\n').forEach(l => { const m = l.trim().match(/^(\d+(?:\.\d+)?)\s*[=:]\s*(.+)$/); if(m) rows.push({ min: +m[1], grade: m[2].trim() }); });
  st().criteria = rows.sort((a,b) => b.min - a.min);
};
E.newPin = () => { S.pin = L.newPin(); draw(); };

/* ---------------------------------------------------------------- saqlash */
function validate(){
  const x = S.test, errs = [];
  if(!x.title.trim()) errs.push(t('e.err.title'));
  if(!x.order.length) errs.push(t('e.err.noQ'));
  x.order.forEach((id, i) => {
    const q = x.questions[id], k = S.keys[id] || {}, n = i + 1;
    if(q.type === 'single' || q.type === 'multi'){
      const opts = (q.options||[]).map(o => String(o).trim());
      if(!String(q.text||'').trim() && !q.img) errs.push(t('e.err.text', {n}));
      if(opts.filter(Boolean).length < 2) errs.push(t('e.err.opts', {n}));
      if(opts.some(o => !o)) errs.push(t('e.err.emptyOpt', {n}));
      if(q.type === 'single' ? k.c == null : !(k.c||[]).length) errs.push(t('e.err.correct', {n}));
    } else if(q.type === 'tf'){
      if(!String(q.text||'').trim()) errs.push(t('e.err.text', {n}));
      if(k.c !== true && k.c !== false) errs.push(t('e.err.correct', {n}));
    } else if(q.type === 'text'){
      if(!String(q.text||'').trim()) errs.push(t('e.err.text', {n}));
      if(!(k.accepted||[]).length) errs.push(t('e.err.accepted', {n}));
    } else {
      const e = L.hz.validateQ(q, k); if(e) errs.push(n + ': ' + e);
    }
  });
  return errs;
}
E.save = async status => {
  const errs = validate();
  if(errs.length){ CI.modal({ title: '⚠️ ' + t('e.err.title0'), html: `<ul style="padding-left:18px">${errs.slice(0, 15).map(e => `<li>${esc(e)}</li>`).join('')}</ul>` }); return; }
  const x = S.test, isNew = !S.id, id = S.id || CI.rid(10);
  x.order.forEach(qid => { if(L.HANZI_TYPES.includes(x.questions[qid].type)) L.hz.build(x.questions[qid], S.keys[qid] = S.keys[qid] || {}); });
  const qs = {}; x.order.forEach(qid => { const q = Object.assign({}, x.questions[qid]);
    if(q.options) q.options = q.options.map(o => String(o).trim());
    Object.keys(q).forEach(k => { if(q[k] === undefined || q[k] === '') delete q[k]; }); qs[qid] = q; });
  const keys = {}; x.order.forEach(qid => { keys[qid] = S.keys[qid] || {}; });
  const s = Object.assign({}, st()); if(!s.unlockCode) s.unlockCode = false;
  const doc = { title: x.title.trim(), desc: x.desc.trim() || null, groupId: x.groupId || null, status: status === 'open' ? 'open' : (S.id ? (x.status || 'draft') : 'draft'),
    startAt: x.startAt || null, endAt: x.endAt || null, settings: s, order: x.order, questions: qs,
    ownerUid: isNew ? CI.me() : x.ownerUid, ownerName: isNew ? CI.myName() : x.ownerName, createdAt: isNew ? Date.now() : (x.createdAt || Date.now()),
    updatedAt: Date.now(), updatedBy: isNew ? null : CI.myName(), shared: x.shared || null, sourceId: x.sourceId || null };
  const up = { ['tests/' + id]: doc, ['testKeys/' + id]: { answers: keys, pin: S.pin } };
  if(x.shared && CI.isAdmin()) up['libKeys/' + id] = { answers: keys };
  try{
    await CI.db.ref().update(up);
    CI.log(isNew ? 'test.create' : 'test.edit', { targetName: doc.title, testId: id, note: t('l.qCount',{n:x.order.length}) });
    CI.toast(t('c.saved'), 'ok'); S = null; L.editId = null;
    if(status === 'open') { L.go('tests'); setTimeout(() => L.share(id), 300); } else L.go('tests');
  }catch(e){ CI.toast(CI.errMsg(e), 'err'); }
};

/* ---------------------------------------------------------------- matn / fayldan import */
E.SAMPLE_TXT = `1. «你好» so'zi nima degani?
A. Rahmat
#B. Salom
C. Xayr
---
2. «谢谢» qanday o'qiladi? (bir nechta to'g'ri javob bo'lishi mumkin)
#A. xièxie
#B. xie4xie
C. zàijiàn
---
3. 中国的首都是北京。
#To'g'ri
Noto'g'ri
---
4. «Kitob» so'zini xitoycha yozing:
= 书
= 書`;
E.SAMPLE_CSV = `Savol,A,B,C,D,To'g'ri
"«你好» so'zi nima degani?",Rahmat,Salom,Xayr,Kechirasiz,B
"«谢谢» qanday o'qiladi?",nǐ hǎo,xièxie,zàijiàn,,B
"Qaysilari meva? (bir nechta)",苹果,香蕉,汽车,,"A,B"`;
/* Matn formati: savollar "---" bilan ajratiladi. "#" — to'g'ri variant (bir nechta # → ko'p javobli).
   "To'g'ri/Noto'g'ri" variantlari → tf. "= javob" qatorlari → qisqa javob (bir nechta = — muqobil javoblar). */
E.parseText = text => {
  const blocks = String(text||'').replace(/\r/g,'').split(/\n\s*-{3,}\s*\n?/).map(b => b.trim()).filter(Boolean);
  const out = [], errs = [];
  const TF_T = /^(to'?g'?ri|to‘g‘ri|true|верно|правда|да|对|正确|是)$/i, TF_F = /^(noto'?g'?ri|noto‘g‘ri|false|неверно|ложь|нет|错|错误|不对|否)$/i;
  blocks.forEach((b, i) => {
    const lines = b.split('\n').map(l => l.trim()).filter(Boolean);
    const text = (lines[0]||'').replace(/^\d+[.)]\s*/, '');
    const rest = lines.slice(1);
    if(rest.length && rest.every(l => l.startsWith('='))){
      out.push({ type: 'text', q: { text }, key: { accepted: rest.map(l => l.replace(/^=\s*/, '')).filter(Boolean) } }); return;
    }
    const opts = [], corr = [];
    rest.forEach(l => { let raw = l, c = false; if(raw.startsWith('#')){ c = true; raw = raw.replace(/^#\s*/, ''); }
      raw = raw.replace(/^[A-Za-zА-Яа-я][.):]\s+/, ''); if(c) corr.push(opts.length); opts.push(raw); });
    if(opts.length === 2 && TF_T.test(opts[0]) && TF_F.test(opts[1]) && corr.length === 1){
      out.push({ type: 'tf', q: { text }, key: { c: corr[0] === 0 } }); return; }
    if(opts.length < 2){ errs.push(t('e.imp.min2', {n: i+1})); return; }
    if(!corr.length){ errs.push(t('e.imp.noCorrect', {n: i+1})); return; }
    if(corr.length === 1) out.push({ type: 'single', q: { text, options: opts }, key: { c: corr[0] } });
    else out.push({ type: 'multi', q: { text, options: opts }, key: { c: corr } });
  });
  return { list: out, errs };
};
function parseCSV(text){
  const first = text.split('\n')[0] || ''; const delim = (first.match(/;/g)||[]).length > (first.match(/,/g)||[]).length ? ';' : ',';
  const rows = []; let row = [], cur = '', inQ = false;
  for(let i = 0; i < text.length; i++){ const ch = text[i];
    if(inQ){ if(ch === '"'){ if(text[i+1] === '"'){ cur += '"'; i++; } else inQ = false; } else cur += ch; }
    else if(ch === '"') inQ = true; else if(ch === delim){ row.push(cur); cur = ''; }
    else if(ch === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; } else if(ch !== '\r') cur += ch; }
  if(cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}
E.parseCsvRows = parseCSV;
E.parseCsv = text => {
  let rows = parseCSV(String(text||'').replace(/^﻿/, ''));
  if(rows.length && /^(savol|question|вопрос|问题|题目)/i.test(String(rows[0][0]).trim())) rows = rows.slice(1);
  const out = [], errs = [];
  rows.forEach((r, i) => {
    const cells = r.map(c => String(c).trim()); const text = cells[0], ans = cells[cells.length-1];
    const opts = cells.slice(1, -1).filter(c => c !== '');
    if(!text){ errs.push(t('e.imp.row', {n: i+1}) + t('e.imp.noText')); return; }
    if(opts.length < 2){ errs.push(t('e.imp.row', {n: i+1}) + t('e.imp.min2s')); return; }
    const idx = ans.split(/[,\s]+/).filter(Boolean).map(a => /^[A-Za-z]$/.test(a) ? a.toUpperCase().charCodeAt(0) - 65 : /^\d+$/.test(a) ? +a - 1 : -1);
    if(!idx.length || idx.some(j => j < 0 || j >= opts.length)){ errs.push(t('e.imp.row', {n: i+1}) + t('e.imp.badAns', {a: ans})); return; }
    if(idx.length === 1) out.push({ type: 'single', q: { text, options: opts }, key: { c: idx[0] } });
    else out.push({ type: 'multi', q: { text, options: opts }, key: { c: idx.sort((a,b)=>a-b) } });
  });
  return { list: out, errs };
};
E.importDlg = () => {
  CI.modal({ title: '📥 ' + t('e.import'), wide: true, html: `<p class="muted">${t('e.imp.hint')}</p>
    <div class="flex mt"><input type="file" accept=".txt,.csv,text/plain,text/csv" id="imp-file" style="max-width:320px">
      <button class="btn-ghost btn-sm" onclick="CI.downloadFile('namuna-test.txt', L.editor.SAMPLE_TXT)">⬇ ${t('e.imp.sampleTxt')}</button>
      <button class="btn-ghost btn-sm" onclick="CI.downloadFile('namuna-test.csv', '\\uFEFF' + L.editor.SAMPLE_CSV, 'text/csv;charset=utf-8')">⬇ ${t('e.imp.sampleCsv')}</button></div>
    <textarea id="imp-text" rows="12" class="mono mt" placeholder="${esc(E.SAMPLE_TXT)}"></textarea><div id="imp-msg"></div>`,
    actions: [{label: t('c.cancel'), cls: 'btn-ghost'}, {label: t('e.imp.add'), cls: 'btn-brand', keep: true, fn: close => {
      const v = $('#imp-text').value; const isCsv = E._impCsv || /^[^\n]*,[^\n]*,/.test(v.split('\n')[0]) && !/---/.test(v);
      const r = isCsv ? E.parseCsv(v) : E.parseText(v);
      if(!r.list.length){ $('#imp-msg').innerHTML = `<div class="note red">${(r.errs.length ? r.errs : [t('e.imp.nothing')]).map(esc).join('<br>')}</div>`; return; }
      E.addMany(r.list);
      if(r.errs.length) CI.modal({ title: '⚠️', html: `<p>${t('e.imp.partial', {n: r.list.length})}</p><ul style="padding-left:18px">${r.errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` });
      close();
    }}] });
  setTimeout(() => { const f = $('#imp-file'); if(f) f.onchange = () => { const file = f.files[0]; if(!file) return;
    const rd = new FileReader(); rd.onload = () => { $('#imp-text').value = rd.result; E._impCsv = /\.csv$/i.test(file.name); }; rd.readAsText(file, 'utf-8'); }; }, 50);
};
})();
