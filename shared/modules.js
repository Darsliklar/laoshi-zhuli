/* ============================================================================
   Portal bo'limlari ro'yxati. YANGI BO'LIM QO'SHISH:
     1) papka yarating (masalan  kutubxona/index.html);
     2) shu ro'yxatga bitta obyekt qo'shing;
     3) pastdagi CI.add(...) ga nom va izohni 4 tilda yozing.
   ============================================================================ */
window.CI_MODULES = [
  { id:'laoshi',  path:'laoshi/',  icon:'考', color:'#BE3A2B', tags:['test','hanzi','online'] },
  { id:'davomat', path:'davomat/', icon:'✓',  color:'#00865A', tags:['qr','online'] },
  { id:'doska',   path:'doska/',   icon:'板', color:'#1f2124', tags:['offline','board'] },
  { id:'jadval',  path:'jadval/',  icon:'表', color:'#3D6B8E', tags:['offline','schedule'] }
];

CI.add({
uz:{
  'mod.laoshi.t':'Testlar va Hanzi', 'mod.laoshi.d':"Test va ieroglif topshiriqlari: yozish, pinyin, tarjima, diktant. Jonli natijalar, antichit sozlamalari, guruhlar va o'quvchi kodlari.",
  'mod.davomat.t':'Davomat', 'mod.davomat.d':"O'quvchi QR kodni skanerlab o'zini belgilaydi yoki laoshi qo'lda kiritadi. Guruh va sana bo'yicha hisobot, Excel.",
  'mod.doska.t':'Interaktiv doska', 'mod.doska.d':"TeachBoard Studio: dars uchun doska, PDF ustida yozish, formulalar, musiqa va effektlar, qo'l harakati bilan boshqarish.",
  'mod.jadval.t':'Dars jadvali', 'mod.jadval.d':"Avtomatik dars jadvali: o'qituvchilar, guruhlar, xonalar, almashtirishlar va imtihonlar.",
  'tag.test':'Test', 'tag.hanzi':'汉字', 'tag.online':'Onlayn', 'tag.qr':'QR', 'tag.offline':'Oflayn ishlaydi', 'tag.board':'Doska', 'tag.schedule':'Jadval',
  'portal.hello':'Xush kelibsiz!', 'portal.pick':"Kerakli bo'limni tanlang", 'portal.student':"O'quvchimisiz?",
  'portal.studentText':"Laoshi bergan havola yoki QR kod orqali kiring. Shaxsiy kodingiz bo'lsa — guruh portalini oching.",
  'portal.studentBtn':"Kod bilan kirish", 'portal.guide':"Qo'llanma"
},
ru:{
  'mod.laoshi.t':'Тесты и Ханьцзы', 'mod.laoshi.d':'Тесты и задания по иероглифам: письмо, пиньинь, перевод, диктант. Живые результаты, настройки античита, группы и коды учеников.',
  'mod.davomat.t':'Посещаемость', 'mod.davomat.d':'Ученик отмечается, отсканировав QR-код, или преподаватель вносит вручную. Отчёты по группам и датам, Excel.',
  'mod.doska.t':'Интерактивная доска', 'mod.doska.d':'TeachBoard Studio: доска для урока, пометки поверх PDF, формулы, музыка и эффекты, управление жестами.',
  'mod.jadval.t':'Расписание', 'mod.jadval.d':'Автоматическое расписание: преподаватели, группы, аудитории, замены и экзамены.',
  'tag.test':'Тест', 'tag.hanzi':'汉字', 'tag.online':'Онлайн', 'tag.qr':'QR', 'tag.offline':'Работает офлайн', 'tag.board':'Доска', 'tag.schedule':'Расписание',
  'portal.hello':'Добро пожаловать!', 'portal.pick':'Выберите нужный раздел', 'portal.student':'Вы ученик?',
  'portal.studentText':'Войдите по ссылке или QR-коду от преподавателя. Если у вас есть личный код — откройте портал группы.',
  'portal.studentBtn':'Войти по коду', 'portal.guide':'Инструкция'
},
en:{
  'mod.laoshi.t':'Tests & Hanzi', 'mod.laoshi.d':'Tests and character tasks: writing, pinyin, translation, dictation. Live results, anti-cheat settings, groups and student codes.',
  'mod.davomat.t':'Attendance', 'mod.davomat.d':'Students check in by scanning a QR code, or the teacher marks them manually. Reports by group and date, Excel.',
  'mod.doska.t':'Interactive board', 'mod.doska.d':'TeachBoard Studio: a lesson whiteboard, annotate PDFs, formulas, music and sound effects, hand-gesture control.',
  'mod.jadval.t':'Timetable', 'mod.jadval.d':'Automatic timetable: teachers, groups, rooms, substitutions and exams.',
  'tag.test':'Tests', 'tag.hanzi':'汉字', 'tag.online':'Online', 'tag.qr':'QR', 'tag.offline':'Works offline', 'tag.board':'Board', 'tag.schedule':'Timetable',
  'portal.hello':'Welcome!', 'portal.pick':'Choose a section', 'portal.student':'Are you a student?',
  'portal.studentText':'Use the link or QR code from your teacher. If you have a personal code, open your group portal.',
  'portal.studentBtn':'Enter with a code', 'portal.guide':'Guide'
},
zh:{
  'mod.laoshi.t':'测验与汉字', 'mod.laoshi.d':'测验和汉字作业：书写、拼音、翻译、听写。实时成绩、防作弊设置、班级和学生代码。',
  'mod.davomat.t':'考勤', 'mod.davomat.d':'学生扫描二维码自行签到，或由老师手动记录。按班级和日期统计，可导出 Excel。',
  'mod.doska.t':'互动白板', 'mod.doska.d':'TeachBoard Studio：课堂白板、PDF 批注、公式、音乐与音效、手势控制。',
  'mod.jadval.t':'课程表', 'mod.jadval.d':'自动排课：教师、班级、教室、代课和考试安排。',
  'tag.test':'测验', 'tag.hanzi':'汉字', 'tag.online':'在线', 'tag.qr':'二维码', 'tag.offline':'可离线使用', 'tag.board':'白板', 'tag.schedule':'课程表',
  'portal.hello':'欢迎！', 'portal.pick':'请选择功能', 'portal.student':'您是学生吗？',
  'portal.studentText':'请通过老师提供的链接或二维码进入。如果您有个人代码，请打开班级门户。',
  'portal.studentBtn':'用代码进入', 'portal.guide':'使用说明'
}
});
