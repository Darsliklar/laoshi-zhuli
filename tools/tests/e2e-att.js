/* Avtomatik test. Ishga tushirish: Firebase emulyatori (npx firebase emulators:start --only database,auth --project demo-lz),
   sayt papkasida python3 -m http.server 8080, config.js ni emulyator rejimiga o'tkazing (emulator: {host:'127.0.0.1', dbPort:9000, authPort:9099}),
   keyin: node tools/tests/e2e-att.js   (Playwright kerak) */
const { chromium } = require('playwright');
const BASE = 'http://localhost:8080/';
const log = (...a) => console.log('▶', ...a);
(async () => {
  const b = await chromium.launch();
  const T = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const tp = await T.newPage();
  const errs = []; tp.on('pageerror', e => errs.push('T:' + e.message)); tp.on('console', m => m.type()==='error' && errs.push('Tc:' + m.text()));
  await tp.goto(BASE + 'davomat/'); await tp.waitForSelector('#a-go');
  log('bootstrap form?', await tp.isVisible('#a-name'));
  await tp.fill('#a-name', 'Admin Laoshi'); await tp.fill('#a-email', 'admin@test.uz'); await tp.fill('#a-pass', 'secret12');
  await tp.click('#a-go'); await tp.waitForSelector('.tabs');
  await tp.click('text=Guruhlar'); await tp.waitForSelector('#g-name');
  await tp.fill('#g-name', 'HSK1-A'); await tp.click('text=Guruh yaratish');
  await tp.waitForSelector('textarea[id^=gs-]');
  await tp.fill('textarea[id^=gs-]', 'Aziza Karimova\nWang Fang\nBobur Aliyev'); await tp.click('text=Qo\'shish va kod berish');
  await tp.waitForFunction(() => document.querySelectorAll('b.code').length >= 3, null, {timeout: 20000});
  await tp.screenshot({ path: '/tmp/a-groups.png', fullPage: true });
  const info = await tp.evaluate(async () => { const gid = Object.keys(CI.G.groups)[0]; const st = (await CI.db.ref('groupStudents/'+gid).once('value')).val(); return { gid, st }; });
  const studs = Object.entries(info.st); log('students', studs.map(([k,v]) => v.name + ':' + v.code).join(', '));
  await tp.click('.tab >> nth=0'); await tp.waitForSelector('#a-g');
  await tp.selectOption('#a-g', info.gid); await tp.waitForSelector('text=QR bilan belgilash');
  await tp.click('text=QR bilan belgilash'); await tp.fill('#q-late', '10'); await tp.click('.modal button:has-text("Boshlash")');
  await tp.waitForSelector('#ap-qr svg'); await tp.waitForTimeout(800);
  const k = await tp.evaluate(() => CI.dayKey());
  const tok = await tp.evaluate(async ([g,k]) => (await CI.db.ref('attTokens/'+g+'/'+k).once('value')).val(), [info.gid, k]);
  log('token', JSON.stringify(tok));
  await tp.screenshot({ path: '/tmp/a-present.png' });
  const url = BASE + 'davomat/?g=' + info.gid + '&k=' + k + '&t=' + tok.cur;
  // --- o'quvchi 1: to'g'ri kod
  const S = await b.newContext({ viewport: { width: 390, height: 760 } }); const sp = await S.newPage();
  sp.on('pageerror', e => errs.push('S:' + e.message));
  await sp.goto(url); await sp.waitForSelector('#s-code');
  await sp.fill('#s-code', 'ZZZZZZ'); await sp.click('#s-go'); await sp.waitForSelector('.note.red'); log('bad code msg:', await sp.textContent('.note.red'));
  await sp.fill('#s-code', studs[0][1].code.toLowerCase()); await sp.click('#s-go'); await sp.waitForSelector('#s-yes');
  log('isYou:', await sp.textContent('h2')); await sp.click('#s-yes'); await sp.waitForSelector('text=Belgilandingiz');
  await sp.screenshot({ path: '/tmp/a-student.png' });
  // shu telefondan yana: allaqachon
  await sp.goto(url); await sp.waitForSelector('h2'); log('repeat:', await sp.textContent('h2'));
  // --- o'quvchi 2: eskirgan token
  const S2 = await b.newContext(); const s2 = await S2.newPage();
  await s2.goto(BASE + 'davomat/?g=' + info.gid + '&k=' + k + '&t=WRONGTOK'); await s2.waitForTimeout(1500);
  log('stale token:', (await s2.textContent('.card')).trim().slice(0,90));
  // --- qo'lda yozib ko'rish: o'quvchi boshqa o'quvchi uchun yozolmasligi
  const hack = await sp.evaluate(async ([g,k,sid]) => { try{ await CI.db.ref('attendance/'+g+'/'+k+'/rec/'+sid).set({st:'p',at:firebase.database.ServerValue.TIMESTAMP,via:'qr',n:'X',h:'abc',tk:'abc'}); return 'WRITE OK (BAD)'; }catch(e){ return 'denied ✓'; } }, [info.gid, k, studs[1][0]]);
  log('forge other student:', hack);
  const hack2 = await sp.evaluate(async ([g]) => { try{ await CI.db.ref('groupStudents/'+g).once('value'); return 'READ OK (BAD)'; }catch(e){ return 'denied ✓'; } }, [info.gid]);
  log('read codes anonymously:', hack2);
  const hack3 = await sp.evaluate(async ([g,k]) => { try{ await CI.db.ref('attTokens/'+g+'/'+k).once('value'); return 'READ OK (BAD)'; }catch(e){ return 'denied ✓'; } }, [info.gid, k]);
  log('read token anonymously:', hack3);
  await tp.waitForTimeout(800);
  log('presenter count:', (await tp.textContent('#ap-count')).replace(/\s+/g,' '));
  await tp.screenshot({ path: '/tmp/a-present2.png' });
  await tp.click('#att-pres >> text=QR\'ni yopish'); await tp.waitForTimeout(300);
  await tp.click('button[title="Kechikdi"] >> nth=1'); await tp.waitForTimeout(500);
  await tp.screenshot({ path: '/tmp/a-lesson.png', fullPage: true });
  await tp.click('text=Darsni yakunlash'); await tp.click('.modal button.btn-red'); await tp.waitForTimeout(800);
  await tp.click('.tab >> nth=1'); await tp.waitForSelector('.jtbl'); await tp.screenshot({ path: '/tmp/a-journal.png', fullPage: true });
  // til
  await tp.click('.ci-lang button:has-text("中文")'); await tp.waitForTimeout(400); await tp.screenshot({ path: '/tmp/a-journal-zh.png', fullPage: true });
  await tp.click('.tab >> nth=2'); await tp.click('#app button.btn-p'); await tp.waitForTimeout(1500); await tp.screenshot({ path: '/tmp/a-report.png', fullPage: true });
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
