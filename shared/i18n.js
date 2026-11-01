/* ============================================================================
   Laoshi Zhuli — umumiy tarjima tizimi (barcha bo'limlar uchun bitta)
   ----------------------------------------------------------------------------
   Ishlatish:
     CI.add({ uz:{ 'k':'Matn {n}' }, ru:{...}, en:{...}, zh:{...} });   // lug'at qo'shish
     CI.t('k', {n:5})                                                  // tarjima
     CI.setLang('zh')                                                  // tilni almashtirish
     document.addEventListener('ci:lang', render)                      // til o'zgarsa qayta chizish
     <span data-i18n="k"></span>, <input data-i18n-ph="k">, data-i18n-title
   Til bir marta tanlanadi va barcha bo'limlarda saqlanadi (localStorage 'ci.lang').
   Yangi til qo'shish: CI.LANGS ga qo'shing va lug'atlarga shu kalit bilan obyekt bering.
   ============================================================================ */
(function(){
'use strict';
const CI = window.CI = window.CI || {};

CI.LANGS = [
  { id:'uz', label:"O'zbekcha", short:'UZ', html:'uz' },
  { id:'ru', label:'Русский',   short:'RU', html:'ru' },
  { id:'en', label:'English',   short:'EN', html:'en' },
  { id:'zh', label:'中文',       short:'中文', html:'zh-CN' }
];
const IDS = CI.LANGS.map(l=>l.id);
const KEY = 'ci.lang';
CI.D = {}; IDS.forEach(l=> CI.D[l] = {});

function ls(k, v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; } }

function detect(){
  const q = new URLSearchParams(location.search).get('lang');
  if(q && IDS.includes(q)) return q;
  const s = ls(KEY); if(s && IDS.includes(s)) return s;
  const n = (navigator.language||'').toLowerCase();
  if(n.startsWith('zh')) return 'zh';
  if(n.startsWith('ru')) return 'ru';
  return 'uz';   // inglizcha brauzerlar ham o'zbekchada ochiladi (asosiy til); xohlasa bir bosishda almashtiradi
}
CI.lang = detect();

CI.add = function(dict){
  Object.keys(dict||{}).forEach(l=>{ if(!CI.D[l]) CI.D[l] = {}; Object.assign(CI.D[l], dict[l]); });
};

CI.t = function(key, vars){
  let s = CI.D[CI.lang][key];
  if(s == null) s = CI.D.uz[key];
  if(s == null) s = CI.D.en[key];
  if(s == null) return key;
  if(vars) s = s.replace(/\{(\w+)\}/g, (m, k)=> vars[k] != null ? vars[k] : m);
  return s;
};
/* Bir nechta tilda saqlangan qiymatdan joriy tildagisini olish: {uz:'..', zh:'..'} yoki oddiy satr */
CI.tv = function(v){
  if(v == null) return '';
  if(typeof v !== 'object') return String(v);
  return v[CI.lang] || v.uz || v.en || Object.values(v)[0] || '';
};

CI.applyDom = function(root){
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach(el=> el.textContent = CI.t(el.dataset.i18n));
  root.querySelectorAll('[data-i18n-html]').forEach(el=> el.innerHTML = CI.t(el.dataset.i18nHtml));
  root.querySelectorAll('[data-i18n-ph]').forEach(el=> el.placeholder = CI.t(el.dataset.i18nPh));
  root.querySelectorAll('[data-i18n-title]').forEach(el=> el.title = CI.t(el.dataset.i18nTitle));
};

function setHtmlLang(){
  const l = CI.LANGS.find(x=>x.id===CI.lang);
  document.documentElement.lang = l ? l.html : CI.lang;
  document.documentElement.dataset.lang = CI.lang;
}
setHtmlLang();

CI.setLang = function(l){
  if(!IDS.includes(l) || l === CI.lang) return;
  CI.lang = l; ls(KEY, l); setHtmlLang();
  CI.applyDom();
  document.dispatchEvent(new CustomEvent('ci:lang', { detail:l }));
};
/* Boshqa oynada til almashtirilsa, bu oyna ham moslashadi */
window.addEventListener('storage', e=>{
  if(e.key === KEY && e.newValue && IDS.includes(e.newValue) && e.newValue !== CI.lang){
    CI.lang = e.newValue; setHtmlLang(); CI.applyDom();
    document.dispatchEvent(new CustomEvent('ci:lang', { detail:CI.lang }));
  }
});

/* Til tanlash tugmalari (HTML satri). Bosilganda CI.setLang chaqiriladi. */
CI.langSwitcher = function(extraClass){
  return `<div class="ci-lang ${extraClass||''}" role="group" aria-label="Language">${
    CI.LANGS.map(l=>`<button type="button" class="${l.id===CI.lang?'on':''}" lang="${l.html}"
      onclick="CI.setLang('${l.id}')" title="${l.label}">${l.short}</button>`).join('')}</div>`;
};
document.addEventListener('ci:lang', ()=>{
  document.querySelectorAll('.ci-lang button').forEach(b=>{
    b.classList.toggle('on', b.getAttribute('onclick').includes(`'${CI.lang}'`));
  });
});

/* Sana/vaqt: brauzerning "uz-UZ" formati g'alati chiqadi, shuning uchun qo'lda */
const p2 = n => String(n).padStart(2,'0');
CI.fmtD  = ms => { if(!ms) return '—'; const d=new Date(ms); return `${p2(d.getDate())}.${p2(d.getMonth()+1)}.${d.getFullYear()}`; };
CI.fmtHM = ms => { if(!ms) return '—'; const d=new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
CI.fmtDT = ms => ms ? CI.fmtD(ms)+' · '+CI.fmtHM(ms) : '—';
CI.dayKey = d => { d = d || new Date(); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; };
CI.fmtKey = k => { const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(k||''); return m ? `${m[3]}.${m[2]}.${m[1]}` : (k||''); };
CI.weekday = (k, short) => { const d = new Date(k+'T12:00:00'); const i = d.getDay();
  return CI.t((short?'wds.':'wd.')+i); };

/* Umumiy so'zlar */
CI.add({
uz:{
  'app.name':'Laoshi Zhuli', 'app.tagline':"Laoshi uchun yordamchi platforma",
  'inst.name':'Samarqand Konfutsiy instituti', 'inst.full':"Samarqand davlat chet tillar instituti qoshidagi Konfutsiy instituti",
  'c.loading':'Yuklanmoqda…', 'c.save':'Saqlash', 'c.cancel':'Bekor qilish', 'c.close':'Yopish', 'c.delete':"O'chirish",
  'c.edit':'Tahrirlash', 'c.add':"Qo'shish", 'c.back':'Orqaga', 'c.home':'Bosh sahifa', 'c.yes':'Ha', 'c.no':"Yo'q",
  'c.ok':'OK', 'c.search':'Qidirish…', 'c.all':'Hammasi', 'c.copy':'Nusxalash', 'c.copied':'✓ Nusxalandi',
  'c.download':'Yuklab olish', 'c.print':'Chop etish', 'c.done':'Tayyor', 'c.error':'Xato', 'c.saved':'✓ Saqlandi',
  'c.confirm':'Tasdiqlang', 'c.name':'Ism', 'c.date':'Sana', 'c.time':'Vaqt', 'c.status':'Holat', 'c.actions':'Amallar',
  'c.total':'Jami', 'c.none':"Yo'q", 'c.open':'Ochish', 'c.more':'Yana', 'c.min':'daq', 'c.optional':'ixtiyoriy',
  'c.lang':'Til', 'c.today':'Bugun', 'c.from':'dan', 'c.to':'gacha', 'c.export':'Eksport', 'c.import':'Import',
  'c.rename':"Nomini o'zgartirish", 'c.new':'Yangi', 'c.settings':'Sozlamalar', 'c.help':'Yordam',
  'c.netErr':"Internet aloqasi yo'q yoki server javob bermadi.", 'c.denied':"Ruxsat yo'q (Database Rules).",
  'wd.0':'Yakshanba','wd.1':'Dushanba','wd.2':'Seshanba','wd.3':'Chorshanba','wd.4':'Payshanba','wd.5':'Juma','wd.6':'Shanba',
  'wds.0':'Ya','wds.1':'Du','wds.2':'Se','wds.3':'Ch','wds.4':'Pa','wds.5':'Ju','wds.6':'Sh',
  'm.1':'Yanvar','m.2':'Fevral','m.3':'Mart','m.4':'Aprel','m.5':'May','m.6':'Iyun','m.7':'Iyul','m.8':'Avgust','m.9':'Sentabr','m.10':'Oktabr','m.11':'Noyabr','m.12':'Dekabr'
},
ru:{
  'app.name':'Laoshi Zhuli', 'app.tagline':'Платформа-помощник для преподавателя',
  'inst.name':'Институт Конфуция в Самарканде', 'inst.full':'Институт Конфуция при Самаркандском государственном институте иностранных языков',
  'c.loading':'Загрузка…', 'c.save':'Сохранить', 'c.cancel':'Отмена', 'c.close':'Закрыть', 'c.delete':'Удалить',
  'c.edit':'Изменить', 'c.add':'Добавить', 'c.back':'Назад', 'c.home':'Главная', 'c.yes':'Да', 'c.no':'Нет',
  'c.ok':'OK', 'c.search':'Поиск…', 'c.all':'Все', 'c.copy':'Копировать', 'c.copied':'✓ Скопировано',
  'c.download':'Скачать', 'c.print':'Печать', 'c.done':'Готово', 'c.error':'Ошибка', 'c.saved':'✓ Сохранено',
  'c.confirm':'Подтвердите', 'c.name':'Имя', 'c.date':'Дата', 'c.time':'Время', 'c.status':'Статус', 'c.actions':'Действия',
  'c.total':'Всего', 'c.none':'Нет', 'c.open':'Открыть', 'c.more':'Ещё', 'c.min':'мин', 'c.optional':'необязательно',
  'c.lang':'Язык', 'c.today':'Сегодня', 'c.from':'с', 'c.to':'по', 'c.export':'Экспорт', 'c.import':'Импорт',
  'c.rename':'Переименовать', 'c.new':'Новый', 'c.settings':'Настройки', 'c.help':'Помощь',
  'c.netErr':'Нет связи с интернетом или сервер не ответил.', 'c.denied':'Нет доступа (Database Rules).',
  'wd.0':'Воскресенье','wd.1':'Понедельник','wd.2':'Вторник','wd.3':'Среда','wd.4':'Четверг','wd.5':'Пятница','wd.6':'Суббота',
  'wds.0':'Вс','wds.1':'Пн','wds.2':'Вт','wds.3':'Ср','wds.4':'Чт','wds.5':'Пт','wds.6':'Сб',
  'm.1':'Январь','m.2':'Февраль','m.3':'Март','m.4':'Апрель','m.5':'Май','m.6':'Июнь','m.7':'Июль','m.8':'Август','m.9':'Сентябрь','m.10':'Октябрь','m.11':'Ноябрь','m.12':'Декабрь'
},
en:{
  'app.name':'Laoshi Zhuli', 'app.tagline':"A teacher's assistant platform",
  'inst.name':'Confucius Institute in Samarkand', 'inst.full':'Confucius Institute at Samarkand State Institute of Foreign Languages',
  'c.loading':'Loading…', 'c.save':'Save', 'c.cancel':'Cancel', 'c.close':'Close', 'c.delete':'Delete',
  'c.edit':'Edit', 'c.add':'Add', 'c.back':'Back', 'c.home':'Home', 'c.yes':'Yes', 'c.no':'No',
  'c.ok':'OK', 'c.search':'Search…', 'c.all':'All', 'c.copy':'Copy', 'c.copied':'✓ Copied',
  'c.download':'Download', 'c.print':'Print', 'c.done':'Done', 'c.error':'Error', 'c.saved':'✓ Saved',
  'c.confirm':'Please confirm', 'c.name':'Name', 'c.date':'Date', 'c.time':'Time', 'c.status':'Status', 'c.actions':'Actions',
  'c.total':'Total', 'c.none':'None', 'c.open':'Open', 'c.more':'More', 'c.min':'min', 'c.optional':'optional',
  'c.lang':'Language', 'c.today':'Today', 'c.from':'from', 'c.to':'to', 'c.export':'Export', 'c.import':'Import',
  'c.rename':'Rename', 'c.new':'New', 'c.settings':'Settings', 'c.help':'Help',
  'c.netErr':'No internet connection or the server did not respond.', 'c.denied':'Permission denied (Database Rules).',
  'wd.0':'Sunday','wd.1':'Monday','wd.2':'Tuesday','wd.3':'Wednesday','wd.4':'Thursday','wd.5':'Friday','wd.6':'Saturday',
  'wds.0':'Su','wds.1':'Mo','wds.2':'Tu','wds.3':'We','wds.4':'Th','wds.5':'Fr','wds.6':'Sa',
  'm.1':'January','m.2':'February','m.3':'March','m.4':'April','m.5':'May','m.6':'June','m.7':'July','m.8':'August','m.9':'September','m.10':'October','m.11':'November','m.12':'December'
},
zh:{
  'app.name':'老师助理', 'app.tagline':'教师助手平台',
  'inst.name':'撒马尔罕孔子学院', 'inst.full':'撒马尔罕国立外国语学院孔子学院',
  'c.loading':'加载中…', 'c.save':'保存', 'c.cancel':'取消', 'c.close':'关闭', 'c.delete':'删除',
  'c.edit':'编辑', 'c.add':'添加', 'c.back':'返回', 'c.home':'首页', 'c.yes':'是', 'c.no':'否',
  'c.ok':'确定', 'c.search':'搜索…', 'c.all':'全部', 'c.copy':'复制', 'c.copied':'✓ 已复制',
  'c.download':'下载', 'c.print':'打印', 'c.done':'完成', 'c.error':'错误', 'c.saved':'✓ 已保存',
  'c.confirm':'请确认', 'c.name':'姓名', 'c.date':'日期', 'c.time':'时间', 'c.status':'状态', 'c.actions':'操作',
  'c.total':'合计', 'c.none':'无', 'c.open':'打开', 'c.more':'更多', 'c.min':'分钟', 'c.optional':'可选',
  'c.lang':'语言', 'c.today':'今天', 'c.from':'从', 'c.to':'至', 'c.export':'导出', 'c.import':'导入',
  'c.rename':'重命名', 'c.new':'新建', 'c.settings':'设置', 'c.help':'帮助',
  'c.netErr':'没有网络连接或服务器无响应。', 'c.denied':'没有权限（Database Rules）。',
  'wd.0':'星期日','wd.1':'星期一','wd.2':'星期二','wd.3':'星期三','wd.4':'星期四','wd.5':'星期五','wd.6':'星期六',
  'wds.0':'日','wds.1':'一','wds.2':'二','wds.3':'三','wds.4':'四','wds.5':'五','wds.6':'六',
  'm.1':'一月','m.2':'二月','m.3':'三月','m.4':'四月','m.5':'五月','m.6':'六月','m.7':'七月','m.8':'八月','m.9':'九月','m.10':'十月','m.11':'十一月','m.12':'十二月'
}
});

if(document.readyState !== 'loading') CI.applyDom();
else document.addEventListener('DOMContentLoaded', ()=> CI.applyDom());
})();
