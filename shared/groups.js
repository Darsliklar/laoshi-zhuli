/* ============================================================================
   Umumiy guruhlar va o'quvchilar (Test, Hanzi va Davomat uchun bitta ro'yxat)
   Baza:
     groups/{gid}                {name, ownerUid, ownerName, members:{uid:true}, note, createdAt, archived}
     groupStudents/{gid}/{sid}   {name, code, addedAt}          — faqat egasi/hamkor laoshi/admin
     roster/{gid}/_owner         egasi uid
     roster/{gid}/{hash}         {s:sid, n:ism}                 — kodni bilgan o'quvchi o'zini topadi
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI, t = (k,v) => CI.t(k,v), esc = CI.esc;
const G = CI.G = { groups:{}, students:{}, teachers:{}, loaded:false, subs:[], open:null };

CI.add({
uz:{
  'g.title':"Guruhlar va o'quvchilar", 'g.new':'Yangi guruh', 'g.namePh':'Masalan: HSK1-A (dushanba, 14:00)', 'g.create':'Guruh yaratish',
  'g.none':"Hali guruh yo'q. Birinchi guruhni yarating.", 'g.students':"{n} o'quvchi", 'g.addStudents':"O'quvchilarni qo'shish",
  'g.addHint':"Har qatorga bitta ism-familiya. Har biriga avtomatik 6 belgili shaxsiy kod beriladi.", 'g.addBtn':"Qo'shish va kod berish",
  'g.code':'Kod', 'g.student':"O'quvchi", 'g.newCode':'Yangi kod', 'g.newCodeQ':"{name} uchun yangi kod berilsinmi? Eski kod ({code}) ishlamay qoladi.",
  'g.removeQ':"{name} guruhdan chiqarilsinmi? Kodi ishlamay qoladi (oldingi natijalari va davomati saqlanadi).",
  'g.deleteQ':"\"{name}\" guruhi o'chirilsinmi? O'quvchilar kodlari ishlamay qoladi. Guruh korzinkaga tushadi.",
  'g.print':"Kodlar varag'ini chop etish", 'g.csv':'Kodlar (Excel)', 'g.members':'Hamkor laoshilar',
  'g.membersHint':"Bu guruhni boshqa laoshilar ham boshqara oladi (masalan, ikki laoshi bitta guruhda dars bersa).",
  'g.owner':'Egasi', 'g.archive':'Arxivga olish', 'g.unarchive':'Arxivdan chiqarish', 'g.archived':'Arxiv', 'g.showArchived':"Arxivdagilarni ko'rsatish",
  'g.note':'Izoh', 'g.mine':'Mening guruhlarim', 'g.portal':'Guruh portali', 'g.portalHint':"O'quvchi shu havolani ochib shaxsiy kodini kiritadi va o'ziga berilgan barcha topshiriqlarni ko'radi.",
  'g.printTitle':"{group} — o'quvchi kodlari", 'g.printHint':"Kodni hech kimga bermang. U testlar va davomat uchun kerak.",
  'g.added':"{n} ta o'quvchi qo'shildi", 'g.e.name':'Guruh nomini kiriting (kamida 2 belgi).', 'g.e.students':'Kamida bitta ism kiriting.',
  'g.pick':'Guruhni tanlang', 'g.noStudents':"Guruhda hali o'quvchi yo'q.", 'g.renameStudent':"Ismini o'zgartirish",
  'g.addMember':"Laoshi qo'shish", 'g.removeMember':'Olib tashlash', 'g.count':'Guruhlar', 'g.search':"Guruh yoki o'quvchi…"
},
ru:{
  'g.title':'Группы и ученики', 'g.new':'Новая группа', 'g.namePh':'Например: HSK1-A (понедельник, 14:00)', 'g.create':'Создать группу',
  'g.none':'Групп пока нет. Создайте первую группу.', 'g.students':'учеников: {n}', 'g.addStudents':'Добавить учеников',
  'g.addHint':'По одному имени на строку. Каждому автоматически выдаётся личный код из 6 символов.', 'g.addBtn':'Добавить и выдать коды',
  'g.code':'Код', 'g.student':'Ученик', 'g.newCode':'Новый код', 'g.newCodeQ':'Выдать новый код ученику {name}? Старый код ({code}) перестанет работать.',
  'g.removeQ':'Исключить {name} из группы? Код перестанет работать (прежние результаты и посещаемость сохранятся).',
  'g.deleteQ':'Удалить группу «{name}»? Коды учеников перестанут работать. Группа попадёт в корзину.',
  'g.print':'Распечатать карточки с кодами', 'g.csv':'Коды (Excel)', 'g.members':'Со-преподаватели',
  'g.membersHint':'Этой группой могут управлять и другие преподаватели (например, если в группе ведут два преподавателя).',
  'g.owner':'Владелец', 'g.archive':'В архив', 'g.unarchive':'Вернуть из архива', 'g.archived':'Архив', 'g.showArchived':'Показать архивные',
  'g.note':'Примечание', 'g.mine':'Мои группы', 'g.portal':'Портал группы', 'g.portalHint':'Ученик открывает эту ссылку, вводит личный код и видит все назначенные ему задания.',
  'g.printTitle':'{group} — коды учеников', 'g.printHint':'Никому не передавайте код. Он нужен для тестов и отметки посещаемости.',
  'g.added':'Добавлено учеников: {n}', 'g.e.name':'Введите название группы (не менее 2 символов).', 'g.e.students':'Введите хотя бы одно имя.',
  'g.pick':'Выберите группу', 'g.noStudents':'В группе пока нет учеников.', 'g.renameStudent':'Изменить имя',
  'g.addMember':'Добавить преподавателя', 'g.removeMember':'Убрать', 'g.count':'Группы', 'g.search':'Группа или ученик…'
},
en:{
  'g.title':'Groups & students', 'g.new':'New group', 'g.namePh':'e.g. HSK1-A (Monday, 14:00)', 'g.create':'Create group',
  'g.none':'No groups yet. Create your first group.', 'g.students':'{n} students', 'g.addStudents':'Add students',
  'g.addHint':'One full name per line. Each student automatically gets a personal 6-character code.', 'g.addBtn':'Add and assign codes',
  'g.code':'Code', 'g.student':'Student', 'g.newCode':'New code', 'g.newCodeQ':'Give {name} a new code? The old code ({code}) will stop working.',
  'g.removeQ':'Remove {name} from the group? Their code will stop working (past results and attendance are kept).',
  'g.deleteQ':'Delete the group "{name}"? Student codes will stop working. The group goes to the trash.',
  'g.print':'Print code cards', 'g.csv':'Codes (Excel)', 'g.members':'Co-teachers',
  'g.membersHint':'Other teachers can also manage this group (e.g. when two teachers share a class).',
  'g.owner':'Owner', 'g.archive':'Archive', 'g.unarchive':'Unarchive', 'g.archived':'Archived', 'g.showArchived':'Show archived',
  'g.note':'Note', 'g.mine':'My groups', 'g.portal':'Group portal', 'g.portalHint':'Students open this link, enter their personal code and see all tasks assigned to them.',
  'g.printTitle':'{group} — student codes', 'g.printHint':'Do not share your code. You need it for tests and attendance.',
  'g.added':'{n} students added', 'g.e.name':'Enter a group name (at least 2 characters).', 'g.e.students':'Enter at least one name.',
  'g.pick':'Choose a group', 'g.noStudents':'No students in this group yet.', 'g.renameStudent':'Rename',
  'g.addMember':'Add teacher', 'g.removeMember':'Remove', 'g.count':'Groups', 'g.search':'Group or student…'
},
zh:{
  'g.title':'班级与学生', 'g.new':'新建班级', 'g.namePh':'例如：HSK1-A（周一 14:00）', 'g.create':'创建班级',
  'g.none':'还没有班级，请创建第一个班级。', 'g.students':'{n} 名学生', 'g.addStudents':'添加学生',
  'g.addHint':'每行一个姓名。系统会自动为每位学生生成 6 位个人代码。', 'g.addBtn':'添加并生成代码',
  'g.code':'代码', 'g.student':'学生', 'g.newCode':'新代码', 'g.newCodeQ':'要为 {name} 生成新代码吗？旧代码（{code}）将失效。',
  'g.removeQ':'要将 {name} 移出班级吗？其代码将失效（以往成绩和考勤记录会保留）。',
  'g.deleteQ':'要删除班级“{name}”吗？学生代码将失效，班级会移入回收站。',
  'g.print':'打印代码卡片', 'g.csv':'代码（Excel）', 'g.members':'合作教师',
  'g.membersHint':'其他教师也可以管理此班级（例如两位老师共同授课）。',
  'g.owner':'创建者', 'g.archive':'归档', 'g.unarchive':'取消归档', 'g.archived':'已归档', 'g.showArchived':'显示已归档',
  'g.note':'备注', 'g.mine':'我的班级', 'g.portal':'班级门户', 'g.portalHint':'学生打开此链接，输入个人代码，即可看到分配给自己的所有作业。',
  'g.printTitle':'{group} — 学生代码', 'g.printHint':'请勿把代码告诉别人。测验和考勤都需要它。',
  'g.added':'已添加 {n} 名学生', 'g.e.name':'请输入班级名称（至少 2 个字符）。', 'g.e.students':'请至少输入一个姓名。',
  'g.pick':'请选择班级', 'g.noStudents':'班级里还没有学生。', 'g.renameStudent':'修改姓名',
  'g.addMember':'添加教师', 'g.removeMember':'移除', 'g.count':'班级', 'g.search':'班级或学生…'
}
});

/* ---------------------------------------------------------------- ma'lumot */
G.canManage = g => !!g && (CI.isAdmin() || g.ownerUid === CI.me() || !!(g.members && g.members[CI.me()]));
G.mine = (withArchived) => Object.entries(G.groups).filter(([id,g]) => G.canManage(g) && (withArchived || !g.archived))
  .sort((a,b) => String(a[1].name).localeCompare(String(b[1].name), undefined, {numeric:true}));
G.sortedStudents = gid => Object.entries(G.students[gid] || {}).sort((a,b) => String(a[1].name).localeCompare(String(b[1].name)));

/* Guruhlar ro'yxatiga obuna. cb() — har o'zgarishda. */
G.listen = cb => {
  if(cb) G.subs.push(cb);
  if(G._ref) return;
  G._ref = CI.db.ref('groups');
  G._ref.on('value', s => { G.groups = s.val() || {}; G.loaded = true; G.subs.forEach(f => f()); },
    e => { console.warn('groups', e); G.loaded = true; G.err = e; G.subs.forEach(f => f()); });
};
const stuRefs = {};
G.listenStudents = (gid, cb) => {
  if(stuRefs[gid]){ if(cb) stuRefs[gid].cbs.push(cb); return; }
  const ref = CI.db.ref('groupStudents/' + gid); stuRefs[gid] = { ref, cbs: cb ? [cb] : [] };
  ref.on('value', s => { G.students[gid] = s.val() || {}; stuRefs[gid].cbs.forEach(f => f(gid)); }, e => console.warn('students', e));
};
G.loadStudents = gid => CI.db.ref('groupStudents/' + gid).once('value').then(s => (G.students[gid] = s.val() || {}));
G.loadTeachers = () => CI.db.ref('teachers').once('value').then(s => (G.teachers = s.val() || {}));

G.create = (name, note) => {
  name = String(name||'').trim(); if(name.length < 2) return Promise.reject(new Error(t('g.e.name')));
  const gid = CI.rid(10);
  return CI.db.ref().update({
    ['groups/' + gid]: { name, note: note || '', ownerUid: CI.me(), ownerName: CI.myName(), createdAt: Date.now() },
    ['roster/' + gid + '/_owner']: CI.me()
  }).then(() => { CI.log('group.create', { targetName: name, groupId: gid }); return gid; });
};
/* Kodlar butun tizim bo'yicha yagona: codes/{sha('code:'+KOD)} = {g: gid}. Shunda o'quvchi bosh sahifada faqat kodini
   kiritib, o'z guruhi portaliga kira oladi. */
CI.codeIdx = code => CI.sha('code:' + String(code||'').trim().toUpperCase());
async function freeCode(used){
  for(let i = 0; i < 20; i++){
    const c = CI.newCode(); if(used.has(c)) continue;
    const ex = await CI.db.ref('codes/' + (await CI.codeIdx(c))).once('value').then(s => s.exists()).catch(() => false);
    if(!ex){ used.add(c); return c; }
  }
  throw new Error('code');
}
async function uniqueCode(gid){ return freeCode(new Set(Object.values(G.students[gid] || {}).map(s => s.code))); }
G.addStudents = async (gid, names) => {
  names = names.map(s => s.trim().replace(/\s+/g,' ')).filter(s => s.length >= 2);
  if(!names.length) throw new Error(t('g.e.students'));
  await G.loadStudents(gid);
  const up = {}; const used = new Set(Object.values(G.students[gid] || {}).map(s => s.code));
  for(const name of names){
    const code = await freeCode(used);
    const sid = CI.rid(10);
    up['groupStudents/' + gid + '/' + sid] = { name, code, addedAt: Date.now() };
    up['roster/' + gid + '/' + (await CI.codeHash(gid, code))] = { s: sid, n: name };
    up['codes/' + (await CI.codeIdx(code))] = { g: gid };
  }
  await CI.db.ref().update(up);
  CI.log('group.students', { targetName: (G.groups[gid]||{}).name, groupId: gid, note: '+' + names.length });
  return names.length;
};
G.newCode = async (gid, sid) => {
  const s = G.students[gid][sid]; const code = await uniqueCode(gid);
  await CI.db.ref().update({
    ['groupStudents/' + gid + '/' + sid + '/code']: code,
    ['roster/' + gid + '/' + (await CI.codeHash(gid, s.code))]: null,
    ['roster/' + gid + '/' + (await CI.codeHash(gid, code))]: { s: sid, n: s.name },
    ['codes/' + (await CI.codeIdx(s.code))]: null,
    ['codes/' + (await CI.codeIdx(code))]: { g: gid }
  });
  return code;
};
G.renameStudent = async (gid, sid, name) => {
  const s = G.students[gid][sid]; name = String(name||'').trim(); if(name.length < 2) return;
  await CI.db.ref().update({
    ['groupStudents/' + gid + '/' + sid + '/name']: name,
    ['roster/' + gid + '/' + (await CI.codeHash(gid, s.code)) + '/n']: name
  });
};
G.removeStudent = async (gid, sid) => {
  const s = G.students[gid][sid];
  await CI.db.ref().update({ ['groupStudents/' + gid + '/' + sid]: null, ['roster/' + gid + '/' + (await CI.codeHash(gid, s.code))]: null,
    ['codes/' + (await CI.codeIdx(s.code))]: null });
  CI.log('group.studentRemove', { targetName: s.name, groupId: gid, note: (G.groups[gid]||{}).name });
};
G.remove = async gid => {
  const g = G.groups[gid]; await G.loadStudents(gid);
  await CI.trashPut('group', g.ownerUid, g.name, { group: g, students: G.students[gid] || {} }, { refId: gid });
  const up = { ['groups/' + gid]: null, ['groupStudents/' + gid]: null, ['roster/' + gid]: null };
  for(const s of Object.values(G.students[gid] || {})) up['codes/' + (await CI.codeIdx(s.code))] = null;
  await CI.db.ref().update(up);
  CI.log('group.delete', { targetName: g.name, groupId: gid });
};
/* Korzinkadan tiklash (laoshi/ admin paneli chaqiradi) */
G.restore = async (gid, payload) => {
  const up = { ['groups/' + gid]: payload.group, ['roster/' + gid + '/_owner']: payload.group.ownerUid };
  for(const [sid, s] of Object.entries(payload.students || {})){
    up['groupStudents/' + gid + '/' + sid] = s;
    up['roster/' + gid + '/' + (await CI.codeHash(gid, s.code))] = { s: sid, n: s.name };
    up['codes/' + (await CI.codeIdx(s.code))] = { g: gid };
  }
  return CI.db.ref().update(up);
};
G.setField = (gid, f, v) => CI.db.ref('groups/' + gid + '/' + f).set(v);

/* ---------------------------------------------------------------- chop etish va eksport */
G.portalLink = gid => CI.siteRoot() + 'laoshi/?portal=' + gid;
G.printCodes = async gid => {
  const g = G.groups[gid]; await G.loadStudents(gid);
  const link = G.portalLink(gid); const qr = CI.qrSvg(link, {margin:1});
  const w = window.open('', '_blank');
  if(!w) return CI.toast('Pop-up?', 'err');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(t('g.printTitle',{group:g.name}))}</title>
  <style>body{font-family:Inter,system-ui,sans-serif;margin:14mm}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 10px;color:#555;font-size:12px}
  .g{display:grid;grid-template-columns:1fr 1fr;gap:8px}.c{border:1px dashed #888;border-radius:8px;padding:10px;display:flex;gap:10px;align-items:center;break-inside:avoid}
  .c svg{width:76px;height:76px;flex:none}.c b{font-size:15px}.k{font-family:ui-monospace,monospace;font-size:22px;font-weight:800;letter-spacing:2px}
  .u{font-size:9.5px;color:#666;word-break:break-all}</style>
  <h1>${esc(t('g.printTitle',{group:g.name}))}</h1><p>${esc(t('g.printHint'))}</p><div class="g">
  ${G.sortedStudents(gid).map(([sid,s]) => `<div class="c">${qr}<div><b>${esc(s.name)}</b><div class="k">${esc(s.code)}</div><div class="u">${esc(link)}</div></div></div>`).join('')}
  </div><script>setTimeout(()=>print(),300)<\/script>`);
  w.document.close();
};
G.exportCodes = async gid => {
  const g = G.groups[gid]; await G.loadStudents(gid);
  const rows = [[t('g.student'), t('g.code'), t('g.portal')]].concat(G.sortedStudents(gid).map(([sid,s]) => [s.name, s.code, G.portalLink(gid)]));
  CI.downloadXlsx(CI.safeName(g.name + '-codes') + '.xlsx', [{ name: g.name, rows, cols: [32, 10, 50] }]);
};

/* ---------------------------------------------------------------- boshqaruv UI */
/* G.renderManager(el) — guruhlar sahifasini chizadi (Laoshi va Davomat ichida bir xil) */
let host = null, showArch = false, q = '';
G.renderManager = el => {
  host = el;
  G.listen(draw);
  if(!Object.keys(G.teachers).length) G.loadTeachers().then(draw).catch(() => {});
  draw();
};
function draw(){
  if(!host || !document.body.contains(host)) return;
  const list = G.mine(showArch).filter(([id,g]) => !q || String(g.name).toLowerCase().includes(q) ||
    Object.values(G.students[id]||{}).some(s => String(s.name).toLowerCase().includes(q)));
  host.innerHTML = `
    <div class="card"><h2>👥 ${t('g.title')}</h2>
      <div class="row"><div style="flex:3"><label>${t('g.new')}</label><input id="g-name" placeholder="${esc(t('g.namePh'))}"></div>
      <div style="flex:0 0 auto"><label>&nbsp;</label><button class="btn-brand" onclick="CI.G.uiCreate()">➕ ${t('g.create')}</button></div></div>
    </div>
    <div class="flex mb"><input id="g-q" placeholder="${esc(t('g.search'))}" value="${esc(q)}" style="max-width:320px" oninput="CI.G.uiSearch(this.value)">
      <label class="chk" style="margin:0"><input type="checkbox" ${showArch?'checked':''} onchange="CI.G.uiArch(this.checked)"> ${t('g.showArchived')}</label></div>
    ${!G.loaded ? `<p class="muted">${t('c.loading')}</p>` : G.err ? `<div class="note red">${CI.errMsg(G.err)}</div>` :
      !list.length ? `<div class="card"><div class="empty"><span class="ico">👥</span>${t('g.none')}</div></div>` :
      list.map(([gid,g]) => groupCard(gid, g)).join('')}`;
  const nameIn = CI.$('#g-name'); if(nameIn) nameIn.addEventListener('keydown', e => { if(e.key === 'Enter') G.uiCreate(); });
  if(G.open && G.groups[G.open]) G.listenStudents(G.open, draw);
}
function groupCard(gid, g){
  const open = G.open === gid; const st = G.students[gid];
  const n = st ? Object.keys(st).length : null;
  const members = Object.keys(g.members || {});
  return `<div class="lrow" style="display:block">
    <div class="flex" style="justify-content:space-between">
      <div class="lrow-main" style="cursor:pointer" onclick="CI.G.uiToggle('${gid}')">
        <div class="lrow-title">${open?'▾':'▸'} ${esc(g.name)} ${n!=null?CI.pill('p-gray', t('g.students',{n})):''} ${g.archived?CI.pill('p-yellow', t('g.archived')):''}
          ${g.ownerUid!==CI.me()?CI.pill('p-blue', '👤 '+esc(g.ownerName||'')):''}</div>
        ${g.note?`<div class="lrow-sub">${esc(g.note)}</div>`:''}
      </div>
      <div class="lrow-act">
        <button class="btn-ghost btn-sm" onclick="CI.G.printCodes('${gid}')">🖨 ${t('g.print')}</button>
        ${CI.menuHtml('gm-'+gid, [
          {label:'⬇ '+t('g.csv'), fn:`CI.G.exportCodes('${gid}')`},
          {label:'🔗 '+t('g.portal'), fn:`CI.G.uiPortal('${gid}')`},
          {label:'✏️ '+t('c.rename'), fn:`CI.G.uiRename('${gid}')`},
          {label:'📝 '+t('g.note'), fn:`CI.G.uiNote('${gid}')`},
          g.ownerUid===CI.me()||CI.isAdmin() ? {label:'🤝 '+t('g.members'), fn:`CI.G.uiMembers('${gid}')`} : null,
          {label:(g.archived?'📤 '+t('g.unarchive'):'📦 '+t('g.archive')), fn:`CI.G.setField('${gid}','archived',${g.archived?'null':'true'})`},
          g.ownerUid===CI.me()||CI.isAdmin() ? {label:'🗑 '+t('c.delete'), fn:`CI.G.uiDelete('${gid}')`, danger:true} : null
        ])}
      </div>
    </div>
    ${open ? `<div class="mt">
      ${members.length?`<p class="muted">🤝 ${t('g.members')}: ${members.map(u => esc((G.teachers[u]||{}).name || u)).join(', ')}</p>`:''}
      ${!st ? `<p class="muted">${t('c.loading')}</p>` : !n ? `<p class="muted">${t('g.noStudents')}</p>` :
        `<div class="tbl"><table><tr><th>#</th><th>${t('g.student')}</th><th>${t('g.code')}</th><th></th></tr>
        ${G.sortedStudents(gid).map(([sid,s],i) => `<tr><td class="muted">${i+1}</td><td>${esc(s.name)}</td><td><b class="code" style="font-size:14px">${esc(s.code)}</b></td>
          <td class="nowrap" style="text-align:right">
            <button class="btn-ghost btn-xs" title="${esc(t('g.renameStudent'))}" onclick="CI.G.uiRenameSt('${gid}','${sid}')">✏️</button>
            <button class="btn-ghost btn-xs" title="${esc(t('g.newCode'))}" onclick="CI.G.uiNewCode('${gid}','${sid}')">🔁</button>
            <button class="btn-ghost btn-xs" title="${esc(t('c.delete'))}" onclick="CI.G.uiRemoveSt('${gid}','${sid}')">🗑</button></td></tr>`).join('')}
        </table></div>`}
      <label>${t('g.addStudents')} <span class="muted" style="font-weight:400">— ${t('g.addHint')}</span></label>
      <textarea id="gs-${gid}" rows="3" placeholder="Aziza Karimova&#10;Wang Fang&#10;Bobur Aliyev"></textarea>
      <button class="btn-p btn-sm mt" onclick="CI.G.uiAdd('${gid}')">➕ ${t('g.addBtn')}</button>
    </div>` : ''}
  </div>`;
}
G.uiSearch = v => { q = v.trim().toLowerCase(); draw(); const i = CI.$('#g-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  if(q) G.mine(showArch).forEach(([id]) => { if(!G.students[id]) G.listenStudents(id, draw); }); };
G.uiArch = v => { showArch = v; draw(); };
G.uiToggle = gid => { G.open = G.open === gid ? null : gid; draw(); };
G.uiCreate = () => { const v = CI.$('#g-name').value; G.create(v).then(gid => { G.open = gid; draw(); CI.toast(t('c.saved'), 'ok'); }, e => CI.toast(e.message, 'err')); };
G.uiAdd = gid => { const v = CI.$('#gs-'+gid).value.split('\n');
  G.addStudents(gid, v).then(n => { CI.toast(t('g.added',{n}), 'ok'); }, e => CI.toast(CI.errMsg(e), 'err')); };
G.uiRename = async gid => { const v = await CI.prompt(t('c.rename'), G.groups[gid].name); if(v && v.trim().length >= 2) G.setField(gid, 'name', v.trim()); };
G.uiNote = async gid => { const v = await CI.prompt(t('g.note'), G.groups[gid].note || ''); if(v != null) G.setField(gid, 'note', v.trim()); };
G.uiRenameSt = async (gid, sid) => { const v = await CI.prompt(t('g.renameStudent'), G.students[gid][sid].name); if(v) G.renameStudent(gid, sid, v).catch(e => CI.toast(CI.errMsg(e),'err')); };
G.uiNewCode = async (gid, sid) => { const s = G.students[gid][sid];
  if(await CI.confirm(t('g.newCodeQ', {name: esc(s.name), code: s.code}))) G.newCode(gid, sid).then(c => CI.toast(s.name + ': ' + c, 'ok'), e => CI.toast(CI.errMsg(e),'err')); };
G.uiRemoveSt = async (gid, sid) => { const s = G.students[gid][sid];
  if(await CI.confirm(t('g.removeQ', {name: esc(s.name)}), {danger:true})) G.removeStudent(gid, sid).catch(e => CI.toast(CI.errMsg(e),'err')); };
G.uiDelete = async gid => { if(await CI.confirm(t('g.deleteQ', {name: esc(G.groups[gid].name)}), {danger:true})) G.remove(gid).catch(e => CI.toast(CI.errMsg(e),'err')); };
G.uiPortal = gid => { const link = G.portalLink(gid);
  CI.modal({ title: '🔗 ' + t('g.portal') + ' — ' + esc(G.groups[gid].name), html: `<p class="muted">${t('g.portalHint')}</p>
    <div class="center mt"><div class="qrbox" style="width:240px">${CI.qrSvg(link)}</div></div>
    <div class="linkbox mt"><input readonly value="${esc(link)}"><button class="btn-ghost btn-sm" onclick="CI.copy(${CI.jsq(link)}, this)">${t('c.copy')}</button></div>` });
};
G.uiMembers = async gid => {
  await G.loadTeachers().catch(() => {});
  const g = G.groups[gid], mem = g.members || {};
  const others = Object.entries(G.teachers).filter(([u,x]) => u !== g.ownerUid && x.active !== false);
  CI.modal({ title: '🤝 ' + t('g.members'), html: `<p class="muted">${t('g.membersHint')}</p>
    ${others.map(([u,x]) => `<label class="chk"><input type="checkbox" class="gm-cb" value="${u}" ${mem[u]?'checked':''}> ${esc(x.name)} <span class="muted">${esc(x.email||'')}</span></label>`).join('') || `<p class="muted">${t('c.none')}</p>`}`,
    actions: [{label:t('c.cancel'), cls:'btn-ghost'}, {label:t('c.save'), fn: () => {
      const m = {}; CI.$$('.gm-cb').forEach(c => { if(c.checked) m[c.value] = true; });
      G.setField(gid, 'members', Object.keys(m).length ? m : null).then(() => CI.toast(t('c.saved'),'ok'), e => CI.toast(CI.errMsg(e),'err'));
    }}] });
};
/* Guruh tanlash <select> */
G.selectHtml = (id, cur, opts) => {
  opts = opts || {};
  const list = G.mine(false);
  return `<select id="${id}" ${opts.onchange?`onchange="${opts.onchange}"`:''}>
    <option value="">${opts.empty || '— ' + t('g.pick') + ' —'}</option>
    ${list.map(([gid,g]) => `<option value="${gid}" ${gid===cur?'selected':''}>${esc(g.name)}${g.ownerUid!==CI.me()?' · '+esc(g.ownerName||''):''}</option>`).join('')}</select>`;
};
document.addEventListener('ci:lang', () => draw());
})();
