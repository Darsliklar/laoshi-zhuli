/* ============================================================================
   TO'LOVLAR — Davomat ichidagi bo'lim. FAQAT ADMINISTRATOR ko'radi va o'zgartiradi
   (database.rules.json ham shunday: boshqa laoshilar va o'quvchilar bu ma'lumotni o'qiy olmaydi).
   Baza:
     payments/{YYYY-MM}/{gid}/{sid}   {st:'paid'|'part'|'none'|'free', amt, date, note, n, by, byName, at}
     payments/{YYYY-MM}/{gid}/_fee    shu oy uchun guruhning oylik to'lovi (oy "muzlatilgan" narx)
     payCfg/groups/{gid}              guruhning joriy oylik to'lovi (yangi oylar shundan boshlanadi)
   Har bir oy alohida saqlanadi. Guruhdan chiqqan o'quvchining o'sha oydagi yozuvi o'chmaydi.
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, G = CI.G, A = window.ATT, t = (k,v) => CI.t(k,v), esc = CI.esc, $ = CI.$;
const PST = ['paid','part','none','free'];
const P_CLS = { paid:'p-green', part:'p-yellow', none:'p-red', free:'p-blue' };
const P_FG = { paid:'#00865A', part:'#96650a', none:'#BE3A2B', free:'#3D6B8E' };

CI.add({
uz:{
  'a.tab.pay':"To'lovlar", 'p.title':"To'lovlar", 'p.adminOnly':"Bu bo'limni faqat administrator ko'radi.",
  'p.allGroups':'Barcha guruhlar', 'p.month':'Oy', 'p.prev':'Oldingi oy', 'p.next':'Keyingi oy', 'p.onlyUnpaid':"Faqat to'lamaganlar",
  'p.st.paid':"To'lagan", 'p.st.part':'Qisman', 'p.st.none':"To'lamagan", 'p.st.free':'Ozod',
  'p.fee':"Oylik to'lov", 'p.feeSave':'Saqlash', 'p.feeHint':"Shu oy va keyingi oylar uchun. O'tgan oylardagi narx o'zgarmaydi.",
  'p.feeSaved':"Oylik to'lov saqlandi", 'p.noFee':"Avval guruhning oylik to'lov miqdorini kiriting.",
  'p.amount':'Miqdor', 'p.date':"To'lov sanasi", 'p.note':'Izoh', 'p.notePh':"Masalan: naqd, karta, ikki oyga oldindan, chegirma sababi…",
  'p.sum':"so'm", 'p.collected':'Tushgan', 'p.expected':'Kutilgan', 'p.debt':'Qarz', 'p.paidN':'{n} / {total}',
  'p.markPaid':"To'ladi", 'p.edit':'Tahrirlash', 'p.addNote':"Izoh qo'shish", 'p.clear':"Yozuvni o'chirish",
  'p.clearQ':"{name} uchun {month} oyidagi to'lov yozuvi o'chirilsinmi?", 'p.editTitle':"{name} — {month}",
  'p.saved':'Saqlandi', 'p.pickGroup':"Guruhni tanlang yoki barcha guruhlar bo'yicha umumiy ko'rinishni oching.",
  'p.removed':"(guruhdan chiqqan)", 'p.students':"O'quvchilar", 'p.noStudents':"Bu guruhda o'quvchi yo'q.",
  'p.allPaid':"Bu oyda hamma to'lagan 🎉", 'p.export':'Excel', 'p.summary':'Umumiy',
  'p.autoSt':"Holat miqdorga qarab avtomatik tanlanadi; kerak bo'lsa o'zingiz o'zgartiring.",
  'p.who':"{name} kiritgan, {time}", 'p.open':'Ochish',
  'log.pay.set':"To'lov belgilandi", 'log.pay.fee':"Oylik to'lov o'zgartirildi", 'log.pay.clear':"To'lov yozuvi o'chirildi"
},
ru:{
  'a.tab.pay':'Оплата', 'p.title':'Оплата', 'p.adminOnly':'Этот раздел видит только администратор.',
  'p.allGroups':'Все группы', 'p.month':'Месяц', 'p.prev':'Предыдущий месяц', 'p.next':'Следующий месяц', 'p.onlyUnpaid':'Только неоплатившие',
  'p.st.paid':'Оплатил', 'p.st.part':'Частично', 'p.st.none':'Не оплатил', 'p.st.free':'Освобождён',
  'p.fee':'Ежемесячная плата', 'p.feeSave':'Сохранить', 'p.feeHint':'Для этого и следующих месяцев. Сумма прошлых месяцев не меняется.',
  'p.feeSaved':'Ежемесячная плата сохранена', 'p.noFee':'Сначала укажите ежемесячную плату группы.',
  'p.amount':'Сумма', 'p.date':'Дата оплаты', 'p.note':'Примечание', 'p.notePh':'Например: наличные, карта, за два месяца вперёд, причина скидки…',
  'p.sum':'сум', 'p.collected':'Получено', 'p.expected':'Ожидается', 'p.debt':'Долг', 'p.paidN':'{n} / {total}',
  'p.markPaid':'Оплатил', 'p.edit':'Изменить', 'p.addNote':'Добавить примечание', 'p.clear':'Удалить запись',
  'p.clearQ':'Удалить запись об оплате {name} за {month}?', 'p.editTitle':'{name} — {month}',
  'p.saved':'Сохранено', 'p.pickGroup':'Выберите группу или откройте общий обзор по всем группам.',
  'p.removed':'(выбыл из группы)', 'p.students':'Учеников', 'p.noStudents':'В этой группе нет учеников.',
  'p.allPaid':'В этом месяце оплатили все 🎉', 'p.export':'Excel', 'p.summary':'Общий',
  'p.autoSt':'Статус выбирается автоматически по сумме; при необходимости измените его.',
  'p.who':'внёс(ла) {name}, {time}', 'p.open':'Открыть',
  'log.pay.set':'Отмечена оплата', 'log.pay.fee':'Изменена ежемесячная плата', 'log.pay.clear':'Удалена запись об оплате'
},
en:{
  'a.tab.pay':'Payments', 'p.title':'Payments', 'p.adminOnly':'Only the administrator can see this section.',
  'p.allGroups':'All groups', 'p.month':'Month', 'p.prev':'Previous month', 'p.next':'Next month', 'p.onlyUnpaid':'Unpaid only',
  'p.st.paid':'Paid', 'p.st.part':'Partial', 'p.st.none':'Unpaid', 'p.st.free':'Exempt',
  'p.fee':'Monthly fee', 'p.feeSave':'Save', 'p.feeHint':'For this and later months. Past months keep their fee.',
  'p.feeSaved':'Monthly fee saved', 'p.noFee':"Enter the group's monthly fee first.",
  'p.amount':'Amount', 'p.date':'Payment date', 'p.note':'Note', 'p.notePh':'e.g. cash, card, paid two months ahead, reason for discount…',
  'p.sum':'UZS', 'p.collected':'Collected', 'p.expected':'Expected', 'p.debt':'Owed', 'p.paidN':'{n} / {total}',
  'p.markPaid':'Paid', 'p.edit':'Edit', 'p.addNote':'Add note', 'p.clear':'Delete record',
  'p.clearQ':"Delete {name}'s payment record for {month}?", 'p.editTitle':'{name} — {month}',
  'p.saved':'Saved', 'p.pickGroup':'Choose a group, or open the overview of all groups.',
  'p.removed':'(left the group)', 'p.students':'Students', 'p.noStudents':'No students in this group.',
  'p.allPaid':'Everyone has paid this month 🎉', 'p.export':'Excel', 'p.summary':'Overview',
  'p.autoSt':'The status follows the amount automatically; change it if needed.',
  'p.who':'entered by {name}, {time}', 'p.open':'Open',
  'log.pay.set':'Payment marked', 'log.pay.fee':'Monthly fee changed', 'log.pay.clear':'Payment record deleted'
},
zh:{
  'a.tab.pay':'缴费', 'p.title':'缴费', 'p.adminOnly':'此栏目仅管理员可见。',
  'p.allGroups':'全部班级', 'p.month':'月份', 'p.prev':'上个月', 'p.next':'下个月', 'p.onlyUnpaid':'只看未缴',
  'p.st.paid':'已缴', 'p.st.part':'部分缴', 'p.st.none':'未缴', 'p.st.free':'免缴',
  'p.fee':'月学费', 'p.feeSave':'保存', 'p.feeHint':'适用于本月及以后各月，以往月份的金额不变。',
  'p.feeSaved':'月学费已保存', 'p.noFee':'请先填写该班级的月学费。',
  'p.amount':'金额', 'p.date':'缴费日期', 'p.note':'备注', 'p.notePh':'例如：现金、刷卡、预缴两个月、优惠原因……',
  'p.sum':'苏姆', 'p.collected':'已收', 'p.expected':'应收', 'p.debt':'欠费', 'p.paidN':'{n} / {total}',
  'p.markPaid':'已缴', 'p.edit':'编辑', 'p.addNote':'添加备注', 'p.clear':'删除记录',
  'p.clearQ':'要删除 {name} {month} 的缴费记录吗？', 'p.editTitle':'{name} — {month}',
  'p.saved':'已保存', 'p.pickGroup':'请选择班级，或打开全部班级总览。',
  'p.removed':'（已离班）', 'p.students':'学生', 'p.noStudents':'该班级没有学生。',
  'p.allPaid':'本月全部已缴 🎉', 'p.export':'Excel', 'p.summary':'总览',
  'p.autoSt':'状态会根据金额自动选择，必要时可手动修改。',
  'p.who':'{name} 录入，{time}', 'p.open':'打开',
  'log.pay.set':'记录缴费', 'log.pay.fee':'修改月学费', 'log.pay.clear':'删除缴费记录'
}
});

const PS = A.pay = { gid: CI.ls.get('pay.gid') || '', month: CI.dayKey().slice(0,7), onlyUnpaid: false, data: null, cfg: null };
const money = n => (Math.round(+n || 0)).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ' + t('p.sum');
const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(/[\s ]/g, '').replace(',', '.')); return isFinite(x) && x >= 0 ? Math.round(x) : null; };
const shiftMonth = (m, d) => { const [y, mo] = m.split('-').map(Number); const x = new Date(y, mo - 1 + d, 1); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0'); };
const monthName = m => { const [y, mo] = m.split('-').map(Number); return CI.lang === 'zh' ? y + '年' + t('m.' + mo) : t('m.' + mo) + ' ' + y; };

/* Guruhning shu oydagi narxi: oyga yozilgan (muzlatilgan) narx → guruhning joriy narxi → 0 */
function feeOf(gid){
  const md = ((PS.data || {})[gid]) || {};
  if(md._fee != null) return +md._fee || 0;
  const c = ((PS.cfg || {}).groups || {})[gid];
  return c != null ? +c || 0 : 0;
}
/* Bitta o'quvchining hisobi */
function calc(rec, fee){
  const st = (rec && rec.st) || 'none';
  const amt = rec && rec.amt != null ? +rec.amt : (st === 'paid' ? fee : 0);
  // "To'lagan" deb belgilangan o'quvchi qarzdor hisoblanmaydi (masalan, chegirma bilan to'lagan bo'lsa ham)
  return { st, amt: st === 'free' ? 0 : amt, debt: st === 'free' || st === 'paid' ? 0 : Math.max(0, fee - amt), due: st === 'free' ? 0 : fee };
}
/* Guruh modeli: joriy o'quvchilar + shu oyda yozuvi bor, lekin guruhdan chiqqanlar */
function model(gid){
  const recs = ((PS.data || {})[gid]) || {}; const fee = feeOf(gid);
  const rows = G.sortedStudents(gid).map(([sid, s]) => ({ sid, name: s.name, removed: false, rec: recs[sid] || null }));
  Object.entries(recs).forEach(([sid, r]) => { if(sid[0] !== '_' && !(G.students[gid] || {})[sid]) rows.push({ sid, name: r.n || sid, removed: true, rec: r }); });
  rows.forEach(r => Object.assign(r, calc(r.rec, fee)));
  const tot = { n: rows.filter(r => !r.removed).length, paid:0, part:0, none:0, free:0, collected:0, expected:0, debt:0 };
  rows.forEach(r => { if(!r.removed || r.rec){ tot[r.st]++; tot.collected += r.amt; if(!r.removed){ tot.expected += r.due; tot.debt += r.debt; } } });
  return { fee, rows, tot };
}

/* ---------------------------------------------------------------- chizish */
A.drawPay = () => {
  A.detach();
  if(!CI.isAdmin()){ A.go('lesson'); return; }
  const app = $('#app');
  app.innerHTML = A.shell(`<div class="card no-print"><div class="row" style="align-items:flex-end">
      <div style="flex:0 0 auto"><label>${t('p.month')}</label><div class="flex" style="gap:6px;flex-wrap:nowrap">
        <button class="btn-ghost" title="${esc(t('p.prev'))}" onclick="ATT.pay.month_(-1)">←</button>
        <b id="p-m" data-m="${PS.month}" style="min-width:150px;text-align:center;font-size:17px">${esc(monthName(PS.month))}</b>
        <button class="btn-ghost" title="${esc(t('p.next'))}" onclick="ATT.pay.month_(1)">→</button></div></div>
      <div style="flex:2;min-width:200px"><label>${t('a.group')}</label>${G.selectHtml('p-g', PS.gid, {onchange:'ATT.pay.setG(this.value)', empty: '— ' + t('p.allGroups') + ' —'})}</div>
      <div style="flex:0 0 auto"><label class="chk" style="margin:0 0 10px"><input type="checkbox" id="p-only" ${PS.onlyUnpaid?'checked':''} onchange="ATT.pay.setOnly(this.checked)"> ${t('p.onlyUnpaid')}</label></div>
      <div style="flex:0 0 auto"><button class="btn-ghost" onclick="ATT.pay.export()">⬇ ${t('p.export')}</button></div>
    </div><p class="muted" style="margin:8px 0 0;font-size:12.5px">🔒 ${t('p.adminOnly')}</p></div>
    <div id="p-body"><p class="muted">${t('c.loading')}</p></div>`);
  const mRef = CI.db.ref('payments/' + PS.month), cRef = CI.db.ref('payCfg');
  const month = PS.month;
  mRef.on('value', s => { if(PS.month !== month) return; PS.data = s.val() || {}; render(); }, e => fail(e));
  cRef.on('value', s => { PS.cfg = s.val() || {}; render(); }, e => fail(e));
  A.refs.push(mRef, cRef);
  if(PS.gid && G.groups[PS.gid]) G.listenStudents(PS.gid, () => { if(A.view === 'pay') render(); });
  else loadAllStudents();
};
function fail(e){ const b = $('#p-body'); if(b) b.innerHTML = `<div class="note red">${CI.errMsg(e)}</div>`; }
let loadingAll = false;
function loadAllStudents(){
  if(loadingAll) return; loadingAll = true;
  Promise.all(G.mine(false).map(([gid]) => G.students[gid] ? null : G.loadStudents(gid).catch(() => {})))
    .then(() => { loadingAll = false; if(A.view === 'pay') render(); });
}
PS.setM = v => { if(/^\d{4}-\d\d$/.test(v)){ PS.month = v; PS.data = null; A.drawPay(); } };
PS.month_ = d => PS.setM(shiftMonth(PS.month, d));
PS.setG = v => { PS.gid = v; CI.ls.set('pay.gid', v); A.drawPay(); };
PS.setOnly = v => { PS.onlyUnpaid = v; render(); };

function render(){
  const body = $('#p-body'); if(!body || A.view !== 'pay') return;
  if(PS.data == null || PS.cfg == null || !G.loaded){ body.innerHTML = `<p class="muted">${t('c.loading')}</p>`; return; }
  const mine = G.mine(false);
  if(!mine.length){ body.innerHTML = `<div class="card"><div class="empty"><span class="ico">👥</span>${t('a.noGroups')}</div></div>`; return; }
  if(!PS.gid || !G.groups[PS.gid]) return renderAll(body, mine);
  renderGroup(body, PS.gid);
}

function statBox(v, label, color){ return `<div class="stat"><b style="${color?`color:${color}`:''}">${v}</b><span>${label}</span></div>`; }

function renderAll(body, mine){
  const list = mine.map(([gid, g]) => ({ gid, g, m: model(gid) }));
  const T = { n:0, paid:0, part:0, none:0, free:0, collected:0, expected:0, debt:0 };
  list.forEach(o => Object.keys(T).forEach(k => T[k] += o.m.tot[k]));
  const shown = PS.onlyUnpaid ? list.filter(o => o.m.tot.none + o.m.tot.part > 0) : list;
  body.innerHTML = `<div class="card"><h2 style="margin:0 0 4px">📊 ${t('p.summary')} · ${esc(monthName(PS.month))}</h2>
      <div class="stats mt">${statBox(t('p.paidN',{n:T.paid, total:T.n}), t('p.st.paid'), P_FG.paid)}
        ${statBox(money(T.collected), t('p.collected'))}${statBox(money(T.expected), t('p.expected'))}${statBox(money(T.debt), t('p.debt'), T.debt ? P_FG.none : '')}</div></div>
    <div class="tbl"><table>
      <tr><th>${t('a.group')}</th><th>${t('p.fee')}</th><th>${t('p.students')}</th>${PST.map(s => `<th>${t('p.st.'+s)}</th>`).join('')}
        <th>${t('p.collected')}</th><th>${t('p.debt')}</th><th></th></tr>
      ${shown.map(o => { const tt = o.m.tot, pr = tt.n ? Math.round((tt.paid + tt.free) * 100 / tt.n) : 0;
        return `<tr style="cursor:pointer" onclick="ATT.pay.setG('${o.gid}')">
          <td><b>${esc(o.g.name)}</b><div class="bar" style="margin-top:6px;max-width:220px"><i style="width:${pr}%"></i></div></td>
          <td class="nowrap">${o.m.fee ? money(o.m.fee) : `<span class="muted">—</span>`}</td><td>${tt.n}</td>
          ${PST.map(s => `<td><b style="color:${tt[s]?P_FG[s]:'inherit'}">${tt[s]}</b></td>`).join('')}
          <td class="nowrap">${money(tt.collected)}</td><td class="nowrap"><b style="color:${tt.debt?P_FG.none:'inherit'}">${money(tt.debt)}</b></td>
          <td><button class="btn-ghost btn-xs" onclick="event.stopPropagation();ATT.pay.setG('${o.gid}')">${t('p.open')} →</button></td></tr>`; }).join('')}
      <tr><td class="muted">${t('c.total')}</td><td></td><td>${T.n}</td>${PST.map(s => `<td>${T[s]}</td>`).join('')}
        <td class="nowrap"><b>${money(T.collected)}</b></td><td class="nowrap"><b>${money(T.debt)}</b></td><td></td></tr>
    </table></div>`;
}

function renderGroup(body, gid){
  if(!G.students[gid]){ body.innerHTML = `<p class="muted">${t('c.loading')}</p>`; return; }
  const g = G.groups[gid]; const m = model(gid); const tt = m.tot;
  const rows = PS.onlyUnpaid ? m.rows.filter(r => r.st === 'none' || r.st === 'part') : m.rows;
  const keep = $('#p-fee') && document.activeElement === $('#p-fee') ? $('#p-fee').value : null;
  body.innerHTML = `<div class="card">
      <div class="flex" style="justify-content:space-between"><h2 style="margin:0">${esc(g.name)} · ${esc(monthName(PS.month))}</h2>
        <button class="btn-ghost btn-sm" onclick="ATT.pay.setG('')">← ${t('p.allGroups')}</button></div>
      <div class="stats mt">${statBox(t('p.paidN',{n:tt.paid, total:tt.n}), t('p.st.paid'), P_FG.paid)}
        ${statBox(tt.part, t('p.st.part'), tt.part ? P_FG.part : '')}${statBox(tt.none, t('p.st.none'), tt.none ? P_FG.none : '')}
        ${statBox(money(tt.collected), t('p.collected'))}${statBox(money(tt.debt), t('p.debt'), tt.debt ? P_FG.none : '')}</div>
      <div class="row" style="align-items:flex-end;max-width:560px">
        <div><label>${t('p.fee')} (${t('p.sum')})</label><input id="p-fee" inputmode="numeric" value="${keep != null ? esc(keep) : (m.fee || '')}" placeholder="400000"></div>
        <div style="flex:0 0 auto"><button class="btn-p" onclick="ATT.pay.saveFee()">${t('p.feeSave')}</button></div></div>
      <p class="muted" style="font-size:12.5px;margin:6px 0 0">${t('p.feeHint')}</p>
      ${!m.fee ? `<div class="note blue mt">${t('p.noFee')}</div>` : ''}
    </div>
    ${!m.rows.length ? `<div class="card"><p class="muted">${t('p.noStudents')}</p></div>` :
      !rows.length ? `<div class="card"><div class="empty"><span class="ico">🎉</span>${t('p.allPaid')}</div></div>` : `
    <div class="tbl"><table>
      <tr><th>#</th><th>${t('g.student')}</th><th>${t('c.status')}</th><th>${t('p.amount')}</th><th>${t('p.date')}</th><th>${t('p.note')}</th><th></th></tr>
      ${rows.map((r, i) => `<tr data-sid="${r.sid}"><td class="muted">${i+1}</td>
        <td><b>${esc(r.name)}</b> ${r.removed ? `<span class="muted" style="font-size:11px">${t('p.removed')}</span>` : ''}</td>
        <td>${CI.pill(P_CLS[r.st], t('p.st.' + r.st))}${r.st === 'part' ? `<div class="muted" style="font-size:11.5px">${t('p.debt')}: ${money(r.debt)}</div>` : ''}</td>
        <td class="nowrap">${r.rec && (r.rec.amt != null || r.st === 'paid') ? money(r.amt) : '<span class="muted">—</span>'}</td>
        <td class="nowrap">${r.rec && r.rec.date ? CI.fmtKey(r.rec.date) : '<span class="muted">—</span>'}</td>
        <td style="max-width:300px">${r.rec && r.rec.note ? `<span style="white-space:pre-line">${esc(r.rec.note)}</span>` : '<span class="muted">—</span>'}
          ${r.rec && r.rec.byName ? `<div class="muted" style="font-size:11px">${esc(t('p.who',{name:r.rec.byName, time: r.rec.at ? CI.fmtKey(CI.dayKey(new Date(r.rec.at))) : ''}))}</div>` : ''}</td>
        <td class="nowrap">
          ${r.removed ? '' : r.st !== 'paid' ? `<button class="btn-xs" style="background:${P_FG.paid};color:#fff" onclick="ATT.pay.quick('${r.sid}')">✓ ${t('p.markPaid')}</button>` : ''}
          <button class="btn-ghost btn-xs" title="${esc(t('p.addNote'))}" onclick="ATT.pay.note('${r.sid}')">📝</button>
          <button class="btn-ghost btn-xs" onclick="ATT.pay.edit('${r.sid}')">✎ ${t('p.edit')}</button></td></tr>`).join('')}
    </table></div>`}`;
  const f = $('#p-fee'); if(f){ f.addEventListener('keydown', e => { if(e.key === 'Enter') PS.saveFee(); }); if(keep != null){ f.focus(); } }
}

/* ---------------------------------------------------------------- yozish */
const recPath = (gid, sid) => 'payments/' + PS.month + '/' + gid + '/' + sid;
function rowOf(sid){ return model(PS.gid).rows.find(r => r.sid === sid); }
/* Oyning narxini birinchi yozuvda "muzlatamiz" — keyin guruh narxi o'zgarsa ham o'tgan oy hisobi o'zgarmaydi */
function withFee(up){
  const md = (PS.data || {})[PS.gid] || {};
  if(md._fee == null) up['payments/' + PS.month + '/' + PS.gid + '/_fee'] = feeOf(PS.gid);
  return up;
}
function save(sid, patch){
  const r = rowOf(sid); if(!r) return Promise.resolve();
  const rec = Object.assign({}, r.rec || {}, patch, { n: r.name, by: CI.me(), byName: CI.myName(), at: CI.serverNow() });
  Object.keys(rec).forEach(k => { if(rec[k] === '' || rec[k] === undefined) rec[k] = null; });
  return CI.db.ref().update(withFee({ [recPath(PS.gid, sid)]: rec }))
    .then(() => { CI.log('pay.set', { targetName: r.name, groupId: PS.gid, note: PS.month + ' · ' + rec.st + (rec.amt != null ? ' · ' + rec.amt : '') }); },
      e => { CI.toast(CI.errMsg(e), 'err'); throw e; });
}
PS.saveFee = () => {
  const v = num($('#p-fee').value); if(v == null) return CI.toast(t('p.noFee'), 'err');
  const up = { ['payCfg/groups/' + PS.gid]: v, ['payments/' + PS.month + '/' + PS.gid + '/_fee']: v };
  CI.db.ref().update(up).then(() => { CI.toast(t('p.feeSaved'), 'ok'); CI.log('pay.fee', { targetName: G.groups[PS.gid].name, groupId: PS.gid, note: PS.month + ' · ' + v }); },
    e => CI.toast(CI.errMsg(e), 'err'));
};
PS.quick = sid => {
  const fee = feeOf(PS.gid); if(!fee) return CI.toast(t('p.noFee'), 'err');
  save(sid, { st: 'paid', amt: fee, date: CI.dayKey() }).then(() => CI.toast(t('p.saved'), 'ok'), () => {});
};
PS.note = async sid => {
  const r = rowOf(sid); if(!r) return;
  const v = await CI.prompt('📝 ' + t('p.note') + ' — ' + esc(r.name), (r.rec && r.rec.note) || '', { hint: t('p.notePh') });
  if(v == null) return;
  save(sid, Object.assign({ note: v.trim().slice(0, 1000) || null }, r.rec ? {} : { st: 'none' })).then(() => CI.toast(t('p.saved'), 'ok'), () => {});
};
PS.edit = sid => {
  const r = rowOf(sid); if(!r) return; const fee = feeOf(PS.gid); const rec = r.rec || {};
  let st = r.st;
  const stBtns = () => PST.map(s => `<button type="button" class="${st===s?'':'btn-ghost'}" data-st="${s}" style="${st===s?`background:${P_FG[s]};color:#fff`:''}">${t('p.st.'+s)}</button>`).join('');
  const m = CI.modal({ title: '💰 ' + esc(t('p.editTitle', {name: r.name, month: monthName(PS.month)})),
    html: `<div class="flex" id="pe-st">${stBtns()}</div>
      <div class="row"><div><label>${t('p.amount')} (${t('p.sum')})</label><input id="pe-amt" inputmode="numeric" value="${rec.amt != null ? rec.amt : (r.st === 'paid' ? fee : '')}" placeholder="${fee || ''}"></div>
        <div><label>${t('p.date')}</label><input id="pe-date" type="date" value="${rec.date || CI.dayKey()}"></div></div>
      <label>${t('p.note')}</label><textarea id="pe-note" rows="3" maxlength="1000" placeholder="${esc(t('p.notePh'))}">${esc(rec.note || '')}</textarea>
      <p class="muted" style="font-size:12px;margin-top:6px">${t('p.autoSt')}${fee ? ' · ' + t('p.fee') + ': ' + money(fee) : ''}</p>`,
    actions: [
      r.rec ? { label: '🗑 ' + t('p.clear'), cls: 'btn-ghost', keep: true, fn: async close => {
        if(!(await CI.confirm(esc(t('p.clearQ', {name: r.name, month: monthName(PS.month)})), {danger: true}))) return;
        CI.db.ref(recPath(PS.gid, sid)).remove().then(() => { close(); CI.log('pay.clear', { targetName: r.name, groupId: PS.gid, note: PS.month }); }, e => CI.toast(CI.errMsg(e), 'err'));
      } } : null,
      { label: t('c.cancel'), cls: 'btn-ghost' },
      { label: t('c.save'), cls: 'btn-p', keep: true, fn: close => {
        const amt = num($('#pe-amt').value);
        const date = st === 'paid' || st === 'part' ? ($('#pe-date').value || CI.dayKey()) : null;
        save(sid, { st, amt: st === 'free' ? null : amt, date, note: $('#pe-note').value.trim().slice(0, 1000) || null })
          .then(() => { close(); CI.toast(t('p.saved'), 'ok'); }, () => {});
      } }].filter(Boolean) });
  const box = m.el.querySelector('#pe-st');
  const paint = () => { box.innerHTML = stBtns(); };
  box.addEventListener('click', e => {
    const b = e.target.closest('button[data-st]'); if(!b) return; st = b.dataset.st; paint();
    const a = m.el.querySelector('#pe-amt');
    if(st === 'paid' && !a.value && fee) a.value = fee;
    if(st === 'none') a.value = '';
  });
  m.el.querySelector('#pe-amt').addEventListener('input', e => {
    if(st === 'free') return; const v = num(e.target.value);
    st = v == null || v === 0 ? 'none' : fee && v >= fee ? 'paid' : 'part'; paint();
  });
};

/* ---------------------------------------------------------------- Excel */
PS.export = async () => {
  if(PS.data == null) return;
  const groups = G.mine(false); await Promise.all(groups.map(([gid]) => G.students[gid] ? null : G.loadStudents(gid).catch(() => {})));
  const only = PS.gid && G.groups[PS.gid] ? [[PS.gid, G.groups[PS.gid]]] : groups;
  const sum = [[t('a.group'), t('p.fee'), t('p.students')].concat(PST.map(s => t('p.st.'+s)), [t('p.collected'), t('p.expected'), t('p.debt')])];
  const sheets = [];
  only.forEach(([gid, g]) => {
    const m = model(gid), tt = m.tot;
    sum.push([g.name, m.fee, tt.n].concat(PST.map(s => tt[s]), [tt.collected, tt.expected, tt.debt]));
    const rows = [[t('g.student'), t('c.status'), t('p.amount'), t('p.debt'), t('p.date'), t('p.note')]]
      .concat(m.rows.map(r => [r.name + (r.removed ? ' ' + t('p.removed') : ''), t('p.st.' + r.st), r.rec || r.st === 'paid' ? r.amt : '', r.removed ? '' : r.debt,
        r.rec && r.rec.date ? CI.fmtKey(r.rec.date) : '', (r.rec && r.rec.note) || '']));
    rows.push([], [t('p.fee'), m.fee], [t('p.collected'), tt.collected], [t('p.debt'), tt.debt]);
    sheets.push({ name: g.name, rows, cols: [30, 14, 12, 12, 12, 50] });
  });
  if(only.length > 1) sheets.unshift({ name: t('p.summary'), rows: sum, cols: [26, 12, 10, 10, 10, 12, 10, 14, 14, 14] });
  CI.downloadXlsx(CI.safeName('tolovlar-' + PS.month + (only.length === 1 ? '-' + only[0][1].name : '')) + '.xlsx', sheets);
};
})();
