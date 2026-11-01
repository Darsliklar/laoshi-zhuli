/* Avtomatik test. Ishga tushirish: Firebase emulyatori (npx firebase emulators:start --only database,auth --project demo-lz),
   sayt papkasida python3 -m http.server 8080, config.js ni emulyator rejimiga o'tkazing (emulator: {host:'127.0.0.1', dbPort:9000, authPort:9099}),
   keyin: node tools/tests/e2e-laoshi.js   (Playwright kerak) */
const { chromium } = require('playwright');
const BASE = 'http://localhost:8080/';
const log = (...a) => console.log('▶', ...a);
(async () => {
  const b = await chromium.launch();
  const T = await b.newContext({ viewport: { width: 1280, height: 900 } }); const tp = await T.newPage();
  const errs = []; tp.on('pageerror', e => errs.push('T:' + e.message)); tp.on('console', m => m.type()==='error' && !/favicon|Failed to load resource/.test(m.text()) && errs.push('Tc:' + m.text()));
  tp.on('dialog', d => d.accept());
  await tp.goto(BASE + 'laoshi/'); await tp.waitForSelector('#a-go');
  await tp.fill('#a-name', 'Admin Laoshi'); await tp.fill('#a-email', 'admin@test.uz'); await tp.fill('#a-pass', 'secret12'); await tp.click('#a-go');
  await tp.waitForSelector('.tabs'); log('logged in');
  // guruh + o'quvchilar (umumiy modul)
  const g = await tp.evaluate(async () => { const gid = await CI.G.create('HSK1-B'); await new Promise(r => setTimeout(r, 400)); await CI.G.addStudents(gid, ['Aziza Karimova','Wang Fang']);
    const st = (await CI.db.ref('groupStudents/'+gid).once('value')).val(); return { gid, st }; });
  const studs = Object.entries(g.st); log('group', g.gid, studs.map(([k,v]) => v.name+':'+v.code).join(', '));
  // muharrir
  await tp.click('.tab:has-text("Yangi")'); await tp.waitForSelector('#e-title');
  await tp.fill('#e-title', 'Sinov testi');
  await tp.selectOption('#e-g', g.gid);
  await tp.click('button:has-text("Oddiy test")');
  await tp.click('.e-add button:has-text("Matn / fayldan")'); await tp.waitForSelector('#imp-text');
  await tp.evaluate(() => { document.querySelector('#imp-text').value = L.editor.SAMPLE_TXT; });
  await tp.click('.modal button:has-text("Savollarni qo\'shish")'); await tp.waitForTimeout(300);
  // hanzi savol (so'zdan)
  await tp.evaluate(() => { L.editor.addMany([L.hz.fromWord({id:'w1', hanzi:'你好', pinyin:'nǐ hǎo', translation:'salom'}, 'pinyin'), L.hz.fromWord({id:'w1', hanzi:'你好', pinyin:'nǐ hǎo', translation:'salom'}, 'translation')]); });
  const nq = await tp.evaluate(() => L.editor.state().test.order.length); log('questions in editor', nq);
  // himoya: ogohlantirish, 2-chiqishda blok, kod bilan ochish
  await tp.click('.seg button:has-text("Ogohlantirish")'); await tp.fill('input[type=number] >> nth=2', '2').catch(()=>{});
  await tp.evaluate(() => { L.editor.s('maxWarn', 2); L.editor.s('timeLimit', 15); L.editor.s('noCopy', true); });
  await tp.screenshot({ path: '/tmp/l-editor.png', fullPage: true });
  await tp.click('.e-foot button:has-text("Saqlash va ochish")'); await tp.waitForSelector('.modal .qrbox'); await tp.waitForTimeout(300);
  await tp.screenshot({ path: '/tmp/l-share.png' });
  const tid = await tp.evaluate(() => Object.keys(L.tests)[0]); const pin = await tp.evaluate(async t => (await CI.db.ref('testKeys/'+t).once('value')).val().pin, tid);
  log('test', tid, 'pin', pin);
  await tp.click('.modal button:has-text("Yopish")');
  // anonim o'quvchi javoblarni o'qiy oladimi?
  const S = await b.newContext({ viewport: { width: 400, height: 820 } }); const sp = await S.newPage();
  sp.on('pageerror', e => errs.push('S:' + e.message)); sp.on('dialog', d => d.accept());
  await sp.goto(BASE + 'laoshi/?t=' + tid); await sp.waitForSelector('#s-code');
  const leak = await sp.evaluate(async t => { const r = {}; for(const p of ['testKeys/'+t, 'sessions/'+t, 'results/'+t]){ try{ await CI.db.ref(p).once('value'); r[p] = 'READ (BAD)'; }catch(e){ r[p] = 'denied ✓'; } } return r; }, tid);
  log('anon reads', JSON.stringify(leak));
  await sp.fill('#s-code', studs[0][1].code); await sp.click('#s-go'); await sp.waitForSelector('.q-card'); log('student started');
  // javob berish
  const qs = await sp.evaluate(() => L.student ? true : false);
  await sp.evaluate(() => { document.querySelectorAll('.q-card').forEach(c => { const r = c.querySelector('input[type=radio]'); if(r){ r.checked = true; r.dispatchEvent(new Event('change')); } }); });
  await sp.waitForTimeout(300);
  for(const inp of await sp.$$('.q-card input:not([type])')){ await inp.fill('ni3 hao3'); }
  await sp.waitForTimeout(800);
  // natijani o'quvchi o'zi yozib qo'ya oladimi?
  const forge = await sp.evaluate(async ([t, sid]) => { try{ await CI.db.ref('results/'+t+'/'+sid).set({score:100}); return 'WRITE OK (BAD)'; }catch(e){ return 'denied ✓'; } }, [tid, studs[0][0] + '-1']);
  log('forge result:', forge);
  const forge2 = await sp.evaluate(async ([t, sid]) => { try{ await CI.db.ref('sessions/'+t+'/'+sid+'/status').set('active'); await CI.db.ref('sessions/'+t+'/'+sid+'/violations').set(0); return 'reset violations OK (BAD)'; }catch(e){ return 'denied ✓'; } }, [tid, studs[0][0] + '-1']);
  log('reset violations:', forge2);
  // chiqib ketish x2 → blok
  const leave = async () => { await sp.evaluate(() => { Object.defineProperty(document, 'visibilityState', {value:'hidden', configurable:true}); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'visibilityState', {value:'visible', configurable:true}); }); await sp.waitForTimeout(2700); };
  await leave(); log('after 1st leave modal:', await sp.isVisible('.modal')); await sp.click('.modal button').catch(()=>{});
  await leave(); await sp.waitForSelector('#u-pin'); log('locked ✓');
  await sp.screenshot({ path: '/tmp/l-locked.png' });
  await tp.click('.tab:has-text("Natijalar")'); await tp.waitForTimeout(300);
  await tp.evaluate(t => L.go('live', t), tid); await tp.waitForTimeout(1200);
  await tp.screenshot({ path: '/tmp/l-live-locked.png', fullPage: true });
  await sp.fill('#u-pin', '0000'); await sp.click('button:has-text("Blokdan chiqish")'); await sp.waitForTimeout(800); log('wrong pin msg:', await sp.textContent('#u-msg').catch(()=>'?'));
  await sp.fill('#u-pin', pin); await sp.click('button:has-text("Blokdan chiqish")'); await sp.waitForSelector('.q-card'); log('unlocked with PIN ✓');
  await sp.click('button:has-text("Yakunlash va yuborish")'); await sp.click('.modal button.btn-p'); await sp.waitForTimeout(3000);
  await sp.screenshot({ path: '/tmp/l-result.png', fullPage: true });
  await sp.waitForTimeout(500); log('student connected after result:', await sp.evaluate(() => new Promise(r => CI.db.ref('.info/connected').once('value', s => r(s.val())))));
  log('student result screen:', (await sp.textContent('.card')).replace(/\s+/g,' ').slice(0, 160));
  await tp.waitForTimeout(1500);
  await tp.screenshot({ path: '/tmp/l-live.png', fullPage: true });
  // portal
  const P = await b.newContext({ viewport: { width: 400, height: 820 } }); const pp = await P.newPage();
  await pp.goto(BASE + 'laoshi/?portal'); await pp.fill('#p-code', studs[1][1].code); await pp.click('#p-go'); await pp.waitForTimeout(2000);
  await pp.screenshot({ path: '/tmp/l-portal.png', fullPage: true }); log('portal connected after list:', await pp.evaluate(() => new Promise(r => CI.db.ref('.info/connected').once('value', s => r(s.val()))))); log('portal:', (await pp.textContent('#p-list')).replace(/\s+/g,' ').slice(0, 140));
  // tillar
  for(const l of ['ru','en','zh']){ await tp.click(`.ci-lang button:has-text("${l==='zh'?'中文':l.toUpperCase()}")`); await tp.waitForTimeout(250); }
  await tp.evaluate(() => L.go('editor', Object.keys(L.tests)[0])); await tp.waitForTimeout(1200); await tp.screenshot({ path: '/tmp/l-editor-zh.png', fullPage: true });
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
