/* ============================================================================
   Laoshi Zhuli — umumiy yordamchilar: Firebase, kirish (auth), UI komponentlar
   Kerak: shared/i18n.js, ../config.js (window.CI_CONFIG), firebase compat SDK
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI;
const CFG = CI.cfg = window.CI_CONFIG || {};
CI.root = (document.currentScript && document.currentScript.src || '').replace(/shared\/app\.js.*$/, '');
if(CFG.institute) Object.keys(CFG.institute).forEach(l => { if(CFG.institute[l] && CI.D[l]) CI.D[l]['inst.name'] = CFG.institute[l]; });

/* ---------------------------------------------------------------- yordamchilar */
CI.$  = s => document.querySelector(s);
CI.$$ = s => [...document.querySelectorAll(s)];
CI.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Inline onclick ichiga xavfsiz satr: JS satri + HTML-escape */
CI.jsq = s => CI.esc(JSON.stringify(String(s == null ? '' : s)));
CI.rid = n => Array.from({length:n||10}, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random()*31)]).join('');
CI.CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
CI.newCode = () => Array.from({length:6}, () => CI.CODE_ALPHA[Math.floor(Math.random()*CI.CODE_ALPHA.length)]).join('');
CI.sha = async text => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
};
/* O'quvchi kodi xeshi — eski Hanzi moduli bilan bir xil formula (ko'chirishda mos keladi) */
CI.codeHash = (gid, code) => CI.sha(gid + ':' + String(code||'').trim().toUpperCase());
CI.pill = (cls, txt) => `<span class="pill ${cls}">${txt}</span>`;
CI.ls = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} },
  json(k, def){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }catch(e){ return def; } }
};
/* Qurilma identifikatori (bitta telefondan bir necha o'quvchi belgilansa, laoshi ko'radi) */
CI.deviceId = () => { let d = CI.ls.get('ci.dev'); if(!d){ d = CI.rid(12); CI.ls.set('ci.dev', d); } return d; };

CI.downloadFile = (name, text, mime) => {
  const blob = text instanceof Blob ? text : new Blob([text], {type: mime || 'text/plain;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
};
CI.csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
CI.toCsv = rows => '﻿' + rows.map(r => r.map(CI.csvCell).join(',')).join('\r\n');
CI.safeName = s => String(s||'file').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/-+/g,'-').slice(0, 80);
/* Tashqi skriptni kerak bo'lganda yuklash */
CI.loadScript = src => new Promise((ok, fail) => {
  if(document.querySelector(`script[data-src="${src}"]`)) return ok();
  const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = ok; s.onerror = () => fail(new Error('load ' + src));
  document.head.appendChild(s);
});
/* Excel (.xlsx) — SheetJS faqat yuklab olishda yuklanadi (telefonlar uchun yengil) */
CI.downloadXlsx = async (name, sheets) => {
  if(!window.XLSX){ try{ await CI.loadScript(CI.root + 'shared/vendor/xlsx.full.min.js'); }catch(e){} }
  if(!window.XLSX){ const first = sheets[0]; return CI.downloadFile(name.replace(/\.xlsx$/,'.csv'), CI.toCsv(first.rows), 'text/csv;charset=utf-8'); }
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => { const ws = XLSX.utils.aoa_to_sheet(s.rows); if(s.cols) ws['!cols'] = s.cols.map(w => ({wch:w}));
    XLSX.utils.book_append_sheet(wb, ws, String(s.name||'Sheet').replace(/[\\/?*[\]:]/g,' ').slice(0,31)); });
  XLSX.writeFile(wb, name);
};
CI.copy = (text, btn) => {
  const ok = () => { if(btn){ const o = btn.innerHTML; btn.innerHTML = CI.t('c.copied'); setTimeout(() => btn.innerHTML = o, 1500); } else CI.toast(CI.t('c.copied'), 'ok'); };
  if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, () => prompt('', text));
  else { prompt('', text); }
};
/* Sahifa manzili (papka) — QR va havolalar uchun */
CI.here = () => location.origin + location.pathname.replace(/[^/]*$/, '');
CI.siteRoot = () => new URL(CI.root || './', location.href).href;

/* ---------------------------------------------------------------- QR (qrcode-generator, MIT) */
CI.qrSvg = (text, opts) => {
  opts = opts || {};
  if(!window.qrcode) return `<div class="muted">QR?</div>`;
  const q = qrcode(0, opts.ecc || 'M'); q.addData(text, 'Byte'); q.make();
  const n = q.getModuleCount(), m = opts.margin == null ? 2 : opts.margin, s = n + m*2;
  let d = '';
  for(let r=0; r<n; r++) for(let c=0; c<n; c++) if(q.isDark(r, c)) d += `M${c+m} ${r+m}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" ${opts.size?`width="${opts.size}" height="${opts.size}"`:''}>
    <rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="${opts.color||'#111'}"/></svg>`;
};
CI.qrPng = (text, px) => new Promise(res => {
  const svg = CI.qrSvg(text, {size: px || 512});
  const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = px || 512;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
});

/* ---------------------------------------------------------------- toast, modal, menyu */
CI.toast = (msg, type, ms) => {
  let box = CI.$('.toasts'); if(!box){ box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div'); el.className = 'toast ' + (type||''); el.textContent = msg; box.appendChild(el);
  setTimeout(() => el.remove(), ms || 2600);
};
/* CI.modal({title, html, actions:[{label, cls, fn(close) }], wide, onClose}) → close() */
CI.modal = o => {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="${o.wide?'max-width:920px':''}" role="dialog" aria-modal="true">
    ${o.title?`<h2>${o.title}</h2>`:''}<div class="m-body">${o.html||''}</div>
    <div class="m-act">${(o.actions||[{label:CI.t('c.close'), cls:'btn-ghost'}]).map((a,i)=>`<button class="${a.cls||'btn-p'}" data-i="${i}">${a.label}</button>`).join('')}</div></div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); o.onClose && o.onClose(); };
  const onKey = e => { if(e.key === 'Escape') close(); };
  bg.addEventListener('click', e => { if(e.target === bg && !o.sticky) close(); });
  bg.querySelectorAll('.m-act button').forEach(b => b.onclick = () => { const a = (o.actions||[])[+b.dataset.i]; if(!a || !a.fn) return close(); const r = a.fn(close, bg); if(r !== false && !a.keep) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(bg);
  const f = bg.querySelector('input,textarea,select'); if(f) setTimeout(() => f.focus(), 30);
  return { close, el: bg };
};
CI.confirm = (msg, opts) => new Promise(res => {
  opts = opts || {};
  CI.modal({ title: opts.title || CI.t('c.confirm'), html: `<p style="white-space:pre-line">${msg}</p>`, onClose: () => res(false),
    actions: [{label: CI.t('c.cancel'), cls:'btn-ghost'}, {label: opts.ok || CI.t('c.yes'), cls: opts.danger ? 'btn-red' : 'btn-p', fn: close => { res(true); }}] });
});
CI.prompt = (title, def, opts) => new Promise(res => {
  opts = opts || {}; let done = false;
  CI.modal({ title, html: `${opts.hint?`<p class="muted">${opts.hint}</p>`:''}<input id="ci-prompt" value="${CI.esc(def||'')}" ${opts.type?`type="${opts.type}"`:''}>`,
    onClose: () => { if(!done) res(null); },
    actions: [{label: CI.t('c.cancel'), cls:'btn-ghost'}, {label: CI.t('c.ok'), cls:'btn-p', fn: () => { done = true; res(CI.$('#ci-prompt').value); }}] });
  setTimeout(() => { const i = CI.$('#ci-prompt'); if(i) i.addEventListener('keydown', e => { if(e.key === 'Enter'){ done = true; res(i.value); i.closest('.modal-bg').remove(); } }); }, 40);
});
CI.menuHtml = (id, items) => `<div class="menu"><button class="btn-ghost btn-sm menu-btn" onclick="CI.toggleMenu(event,'${id}')" aria-label="${CI.t('c.more')}">⋯</button>
  <div class="menu-pop hidden" id="${id}">${items.filter(Boolean).map(it => `<button class="menu-item ${it.danger?'danger':''}" onclick="CI.closeMenus();${CI.esc(it.fn)}">${it.label}</button>`).join('')}</div></div>`;
CI.closeMenus = () => CI.$$('.menu-pop').forEach(p => p.classList.add('hidden'));
CI.toggleMenu = (ev, id) => { ev.stopPropagation(); const el = document.getElementById(id); const was = el && !el.classList.contains('hidden'); CI.closeMenus(); if(el && !was) el.classList.remove('hidden'); };
document.addEventListener('click', e => { if(!e.target.closest('.menu')) CI.closeMenus(); });

/* Sarlavha: logo + nom + til + (foydalanuvchi) */
CI.topbar = o => {
  o = o || {};
  return `<header class="topbar">
    <a class="tb-home" href="${CI.root || '../'}index.html" title="${CI.t('c.home')}">
      <img class="tb-logo" src="${CI.root}shared/logo.svg" alt="">
      <div class="tb-title"><b>${o.title || CI.t('app.name')}</b><small>${o.sub || CI.t('inst.name')}</small></div></a>
    <div class="tb-act">${o.right || ''}${CI.langSwitcher()}</div></header>`;
};
CI.bg = () => { if(!CI.$('.ci-bg')){ const d = document.createElement('div'); d.className = 'ci-bg'; document.body.prepend(d); } };

/* ---------------------------------------------------------------- Firebase */
CI.fbReady = !!(CFG.firebase && CFG.firebase.apiKey && CFG.firebase.databaseURL);
CI.db = null; CI.auth = null; CI.user = null; CI.profile = null;
CI.initFirebase = () => {
  if(!CI.fbReady || CI.db) return !!CI.db;
  if(!window.firebase) return false;
  if(!firebase.apps.length) firebase.initializeApp(CFG.firebase);
  CI.db = firebase.database();
  if(firebase.auth) CI.auth = firebase.auth();
  if(CFG.emulator){ // tools/ ichidagi testlar uchun
    CI.db.useEmulator(CFG.emulator.host || '127.0.0.1', CFG.emulator.dbPort || 9000);
    if(CI.auth && CFG.emulator.authPort) CI.auth.useEmulator(`http://${CFG.emulator.host||'127.0.0.1'}:${CFG.emulator.authPort}`);
  }
  return true;
};
CI.serverNow = () => firebase.database.ServerValue.TIMESTAMP;
CI.errMsg = e => {
  const c = (e && (e.code || e.message) || '') + '';
  if(/PERMISSION_DENIED|permission/i.test(c)) return CI.t('c.denied');
  if(/network|unavailable|offline/i.test(c)) return CI.t('c.netErr');
  return (e && e.message) || String(e);
};
CI.isAdmin = () => !!(CI.profile && CI.profile.role === 'admin');
CI.me = () => CI.user && CI.user.uid;
CI.myName = () => (CI.profile && CI.profile.name) || (CI.user && CI.user.email) || '';

/* Jurnalga yozish (xato bo'lsa ham asosiy amal to'xtamaydi) */
CI.log = (action, info) => {
  if(!CI.db || !CI.user) return Promise.resolve();
  const rec = Object.assign({ at: CI.serverNow(), action, byUid: CI.me(), byName: CI.myName(), byEmail: CI.user.email || '' }, info || {});
  return CI.db.ref('logs').push(rec).catch(e => console.warn('log', e));
};
/* Korzinka */
CI.trashPut = (kind, ownerUid, title, payload, extra) => {
  const id = CI.rid(12);
  return CI.db.ref('trash/' + (ownerUid || CI.me()) + '/' + id).set(Object.assign({ kind, title: title||'', payload: JSON.stringify(payload||null),
    deletedAt: Date.now(), deletedBy: CI.me(), deletedByName: CI.myName() }, extra || {})).then(() => id);
};

/* ---------------------------------------------------------------- Kirish (laoshi/admin) */
CI.add({
uz:{
  'auth.title':'Laoshi kirishi', 'auth.email':'Email', 'auth.pass':'Parol', 'auth.login':'Kirish', 'auth.logout':'Chiqish',
  'auth.forgot':'Parolni unutdingizmi?', 'auth.resetSent':"Parolni tiklash havolasi emailingizga yuborildi.",
  'auth.noAccount':"Hisob faqat administrator tomonidan ochiladi. Administratorga murojaat qiling.",
  'auth.boot.title':'Administrator hisobini yaratish', 'auth.boot.text':"Tizimda hali hech kim yo'q. Bu forma faqat bir marta chiqadi: shu yerda yaratilgan hisob administrator bo'ladi.",
  'auth.boot.btn':'Administratorni yaratish', 'auth.name':'Ism-familiya', 'auth.pass2':'Parol (kamida 6 belgi)',
  'auth.restricted':'Hisobingiz cheklangan', 'auth.restrictedText':"Administrator hisobingizni vaqtincha cheklagan. Unga murojaat qiling.",
  'auth.noProfile':"Bu email uchun laoshi profili topilmadi. Administratorga murojaat qiling.",
  'auth.e.wrong':"Email yoki parol noto'g'ri.", 'auth.e.many':"Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.",
  'auth.e.email':"Email noto'g'ri yozilgan.", 'auth.e.weak':"Parol kamida 6 belgidan iborat bo'lsin.", 'auth.e.inuse':"Bu email allaqachon band.",
  'auth.e.net':"Internet aloqasini tekshiring.", 'auth.e.fields':"Barcha maydonlarni to'ldiring.",
  'auth.changePass':'Parolni almashtirish', 'auth.curPass':'Joriy parol', 'auth.newPass':'Yangi parol', 'auth.newPass2':'Yangi parol (takror)',
  'auth.e.mismatch':'Yangi parollar mos emas.', 'auth.passChanged':'Parol almashtirildi.',
  'setup.title':'Firebase sozlanmagan', 'setup.text':"Sayt ishlashi uchun <code>config.js</code> fayliga Firebase sozlamalarini yozing. Qadam-baqadam ko'rsatma: <b>QOLLANMA.md → 2-bo'lim</b>."
},
ru:{
  'auth.title':'Вход для преподавателя', 'auth.email':'Email', 'auth.pass':'Пароль', 'auth.login':'Войти', 'auth.logout':'Выйти',
  'auth.forgot':'Забыли пароль?', 'auth.resetSent':'Ссылка для сброса пароля отправлена на ваш email.',
  'auth.noAccount':'Учётные записи создаёт только администратор. Обратитесь к нему.',
  'auth.boot.title':'Создание учётной записи администратора', 'auth.boot.text':'В системе ещё нет пользователей. Эта форма появляется только один раз: созданная здесь учётная запись станет администратором.',
  'auth.boot.btn':'Создать администратора', 'auth.name':'Имя и фамилия', 'auth.pass2':'Пароль (не менее 6 символов)',
  'auth.restricted':'Учётная запись ограничена', 'auth.restrictedText':'Администратор временно ограничил вашу учётную запись. Обратитесь к нему.',
  'auth.noProfile':'Профиль преподавателя для этого email не найден. Обратитесь к администратору.',
  'auth.e.wrong':'Неверный email или пароль.', 'auth.e.many':'Слишком много попыток. Попробуйте позже.',
  'auth.e.email':'Email указан неверно.', 'auth.e.weak':'Пароль должен содержать не менее 6 символов.', 'auth.e.inuse':'Этот email уже занят.',
  'auth.e.net':'Проверьте подключение к интернету.', 'auth.e.fields':'Заполните все поля.',
  'auth.changePass':'Сменить пароль', 'auth.curPass':'Текущий пароль', 'auth.newPass':'Новый пароль', 'auth.newPass2':'Новый пароль (повтор)',
  'auth.e.mismatch':'Новые пароли не совпадают.', 'auth.passChanged':'Пароль изменён.',
  'setup.title':'Firebase не настроен', 'setup.text':'Чтобы сайт заработал, впишите настройки Firebase в файл <code>config.js</code>. Пошаговая инструкция: <b>QOLLANMA.md → раздел 2</b>.'
},
en:{
  'auth.title':'Teacher sign-in', 'auth.email':'Email', 'auth.pass':'Password', 'auth.login':'Sign in', 'auth.logout':'Sign out',
  'auth.forgot':'Forgot password?', 'auth.resetSent':'A password reset link has been sent to your email.',
  'auth.noAccount':'Accounts are created only by an administrator. Please contact them.',
  'auth.boot.title':'Create the administrator account', 'auth.boot.text':'There are no users yet. This form appears only once: the account created here becomes the administrator.',
  'auth.boot.btn':'Create administrator', 'auth.name':'Full name', 'auth.pass2':'Password (at least 6 characters)',
  'auth.restricted':'Your account is restricted', 'auth.restrictedText':'An administrator has temporarily restricted your account. Please contact them.',
  'auth.noProfile':'No teacher profile was found for this email. Please contact the administrator.',
  'auth.e.wrong':'Wrong email or password.', 'auth.e.many':'Too many attempts. Please try again later.',
  'auth.e.email':'The email address is invalid.', 'auth.e.weak':'The password must be at least 6 characters.', 'auth.e.inuse':'This email is already in use.',
  'auth.e.net':'Check your internet connection.', 'auth.e.fields':'Please fill in all fields.',
  'auth.changePass':'Change password', 'auth.curPass':'Current password', 'auth.newPass':'New password', 'auth.newPass2':'New password (again)',
  'auth.e.mismatch':'The new passwords do not match.', 'auth.passChanged':'Password changed.',
  'setup.title':'Firebase is not configured', 'setup.text':'To make the site work, put your Firebase settings into <code>config.js</code>. Step-by-step guide: <b>QOLLANMA.md → section 2</b>.'
},
zh:{
  'auth.title':'教师登录', 'auth.email':'邮箱', 'auth.pass':'密码', 'auth.login':'登录', 'auth.logout':'退出',
  'auth.forgot':'忘记密码？', 'auth.resetSent':'重置密码的链接已发送到您的邮箱。',
  'auth.noAccount':'账号只能由管理员创建，请联系管理员。',
  'auth.boot.title':'创建管理员账号', 'auth.boot.text':'系统中还没有任何用户。此表单只出现一次：在这里创建的账号将成为管理员。',
  'auth.boot.btn':'创建管理员', 'auth.name':'姓名', 'auth.pass2':'密码（至少 6 位）',
  'auth.restricted':'您的账号已被限制', 'auth.restrictedText':'管理员暂时限制了您的账号，请联系管理员。',
  'auth.noProfile':'未找到该邮箱的教师资料，请联系管理员。',
  'auth.e.wrong':'邮箱或密码错误。', 'auth.e.many':'尝试次数过多，请稍后再试。',
  'auth.e.email':'邮箱格式不正确。', 'auth.e.weak':'密码至少需要 6 位。', 'auth.e.inuse':'该邮箱已被使用。',
  'auth.e.net':'请检查网络连接。', 'auth.e.fields':'请填写所有字段。',
  'auth.changePass':'修改密码', 'auth.curPass':'当前密码', 'auth.newPass':'新密码', 'auth.newPass2':'再次输入新密码',
  'auth.e.mismatch':'两次输入的新密码不一致。', 'auth.passChanged':'密码已修改。',
  'setup.title':'尚未配置 Firebase', 'setup.text':'请在 <code>config.js</code> 文件中填写 Firebase 设置，网站才能运行。详细步骤见 <b>QOLLANMA.md 第 2 节</b>。'
}
});

CI.authErr = e => {
  const c = (e && e.code) || '';
  if(/wrong-password|user-not-found|invalid-credential|invalid-login/.test(c)) return CI.t('auth.e.wrong');
  if(/too-many/.test(c)) return CI.t('auth.e.many');
  if(/invalid-email/.test(c)) return CI.t('auth.e.email');
  if(/weak-password/.test(c)) return CI.t('auth.e.weak');
  if(/email-already/.test(c)) return CI.t('auth.e.inuse');
  if(/network/.test(c)) return CI.t('auth.e.net');
  return CI.errMsg(e);
};

CI.setupScreen = () => `<div class="card narrow mt2"><h2>⚙️ ${CI.t('setup.title')}</h2><p>${CI.t('setup.text')}</p></div>`;

/* Laoshi kirishini talab qilish. ok(user, profile) — muvaffaqiyatli kirganda (va til almashganda emas).
   el — forma chiziladigan element. Profil yangilansa CI.profile o'zgaradi. */
CI.requireTeacher = (el, ok, opts) => {
  opts = opts || {};
  if(!CI.fbReady){ el.innerHTML = CI.setupScreen(); return; }
  CI.initFirebase();
  let started = false, profRef = null;
  const draw = (mode, msg) => {
    if(mode === 'boot'){
      el.innerHTML = `<div class="card narrow mt2"><h2>🛡 ${CI.t('auth.boot.title')}</h2><p class="muted">${CI.t('auth.boot.text')}</p>
        <label>${CI.t('auth.name')}</label><input id="a-name" autocomplete="name">
        <label>${CI.t('auth.email')}</label><input id="a-email" type="email" autocomplete="username">
        <label>${CI.t('auth.pass2')}</label><input id="a-pass" type="password" autocomplete="new-password">
        <div id="a-msg"></div><button class="btn-brand btn-block mt2" id="a-go">${CI.t('auth.boot.btn')}</button></div>`;
      CI.$('#a-go').onclick = boot;
    } else if(mode === 'restricted'){
      el.innerHTML = `<div class="card narrow mt2 center"><h2 style="justify-content:center">⛔ ${CI.t('auth.restricted')}</h2><p class="muted">${CI.t('auth.restrictedText')}</p>
        <button class="btn-ghost mt" onclick="CI.logout()">${CI.t('auth.logout')}</button></div>`;
    } else if(mode === 'noprofile'){
      el.innerHTML = `<div class="card narrow mt2 center"><p>${CI.t('auth.noProfile')}</p><button class="btn-ghost mt" onclick="CI.logout()">${CI.t('auth.logout')}</button></div>`;
    } else {
      el.innerHTML = `<div class="card narrow mt2" style="max-width:420px"><h2>🔐 ${opts.title || CI.t('auth.title')}</h2>
        <label>${CI.t('auth.email')}</label><input id="a-email" type="email" autocomplete="username">
        <label>${CI.t('auth.pass')}</label><input id="a-pass" type="password" autocomplete="current-password">
        <div id="a-msg"></div><button class="btn-p btn-block mt2" id="a-go">${CI.t('auth.login')}</button>
        <div class="flex mt" style="justify-content:space-between"><a href="#" id="a-forgot" class="muted">${CI.t('auth.forgot')}</a></div>
        <p class="muted mt">${CI.t('auth.noAccount')}</p></div>`;
      CI.$('#a-go').onclick = login;
      CI.$('#a-pass').addEventListener('keydown', e => { if(e.key === 'Enter') login(); });
      CI.$('#a-forgot').onclick = e => { e.preventDefault(); forgot(); };
    }
    if(msg) setMsg(msg);
  };
  const setMsg = (m, t) => { const b = CI.$('#a-msg'); if(b) b.innerHTML = m ? `<div class="note ${t||'red'}">${m}</div>` : ''; };
  const val = id => (CI.$(id) && CI.$(id).value || '').trim();
  function login(){
    const e = val('#a-email'), p = CI.$('#a-pass').value;
    if(!e || !p) return setMsg(CI.t('auth.e.fields'));
    CI.$('#a-go').disabled = true;
    CI.auth.signInWithEmailAndPassword(e, p).catch(err => { setMsg(CI.authErr(err)); const b = CI.$('#a-go'); if(b) b.disabled = false; });
  }
  function forgot(){
    const e = val('#a-email'); if(!e) return setMsg(CI.t('auth.e.email'));
    CI.auth.sendPasswordResetEmail(e).then(() => setMsg(CI.t('auth.resetSent'), 'green'), err => setMsg(CI.authErr(err)));
  }
  function boot(){
    const n = val('#a-name'), e = val('#a-email'), p = CI.$('#a-pass').value;
    if(n.length < 2 || !e || p.length < 6) return setMsg(CI.t('auth.e.fields'));
    CI.$('#a-go').disabled = true;
    CI.auth.createUserWithEmailAndPassword(e, p).then(cred => {
      const u = cred.user.uid;
      return CI.db.ref('teachers/' + u).set({ name: n, email: e, role: 'admin', active: true, createdAt: Date.now() })
        .then(() => CI.db.ref('system/bootstrapped').set(Date.now()));
    }).catch(err => { setMsg(CI.authErr(err)); const b = CI.$('#a-go'); if(b) b.disabled = false; });
  }
  const showLogin = () => CI.db.ref('system/bootstrapped').once('value')
    .then(s => draw(s.exists() ? 'login' : 'boot'), () => draw('login'));
  CI._redrawAuth = () => { if(!CI.user) showLogin(); };
  CI.auth.onAuthStateChanged(user => {
    if(profRef){ profRef.off(); profRef = null; }
    CI.user = user; CI.profile = null;
    if(!user){ started = false; el.innerHTML = `<p class="muted center mt2">${CI.t('c.loading')}</p>`; showLogin(); opts.onLogout && opts.onLogout(); return; }
    profRef = CI.db.ref('teachers/' + user.uid);
    profRef.on('value', s => {
      const p = s.val();
      if(!p){ if(!started) draw('noprofile'); return; }
      CI.profile = p;
      if(p.active === false){ started = false; draw('restricted'); return; }
      if(!started){ started = true; ok(user, p); } else if(opts.onProfile) opts.onProfile(p);
    }, err => { el.innerHTML = `<div class="card narrow mt2"><div class="note red">${CI.errMsg(err)}</div><button class="btn-ghost" onclick="CI.logout()">${CI.t('auth.logout')}</button></div>`; });
  });
  document.addEventListener('ci:lang', () => { if(!CI.user && CI.$('#a-go')) showLogin(); });
};
CI.logout = () => { CI.log('auth.logout'); return CI.auth.signOut(); };
CI.userMenu = extra => CI.user ? CI.menuHtml('ci-um', [
  {label: '👤 ' + CI.esc(CI.myName()), fn: ''},
  {label: '🔑 ' + CI.t('auth.changePass'), fn: 'CI.changePassword()'}].concat(extra || [], [
  {label: '🚪 ' + CI.t('auth.logout'), fn: 'CI.logout()', danger: true}])) : '';
CI.changePassword = () => {
  CI.modal({ title: '🔑 ' + CI.t('auth.changePass'), html: `<label>${CI.t('auth.curPass')}</label><input id="cp-0" type="password" autocomplete="current-password">
    <label>${CI.t('auth.newPass')}</label><input id="cp-1" type="password" autocomplete="new-password">
    <label>${CI.t('auth.newPass2')}</label><input id="cp-2" type="password" autocomplete="new-password"><div id="cp-msg"></div>`,
    actions: [{label: CI.t('c.cancel'), cls: 'btn-ghost'}, {label: CI.t('c.save'), cls: 'btn-p', keep: true, fn: close => {
      const a = CI.$('#cp-0').value, b = CI.$('#cp-1').value, c = CI.$('#cp-2').value, msg = m => CI.$('#cp-msg').innerHTML = `<div class="note red">${m}</div>`;
      if(b.length < 6) return msg(CI.t('auth.e.weak')); if(b !== c) return msg(CI.t('auth.e.mismatch'));
      const cred = firebase.auth.EmailAuthProvider.credential(CI.user.email, a);
      CI.user.reauthenticateWithCredential(cred).then(() => CI.user.updatePassword(b))
        .then(() => { close(); CI.toast(CI.t('auth.passChanged'), 'ok'); CI.log('auth.password'); }, e => msg(CI.authErr(e)));
    }}] });
};
})();
