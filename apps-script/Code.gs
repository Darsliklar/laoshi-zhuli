/**
 * Laoshi Zhuli — bepul yordamchi server (Google Apps Script)
 * ==============================================================================
 * Nima qiladi:
 *   1) grade         — o'quvchi testni tugatganda natijani SERVERDA hisoblaydi. To'g'ri javoblar
 *                      (testKeys) o'quvchilarga hech qachon ko'rinmaydi; natija darhol chiqadi.
 *   2) resetPassword — administrator laoshi parolini "111111" ga tiklaydi (email ishlamasa ham).
 *   3) deleteUser    — administrator o'chirilgan laoshining kirish hisobini ham butunlay o'chiradi.
 *
 * Xavfsizlik: maxfiy kalit (service account JSON) faqat shu yerda — Script Properties'da turadi.
 * Admin amallarida chaqiruvchining Firebase idToken'i Google'da tekshiriladi va uning roli bazadan o'qiladi.
 *
 * O'RNATISH: QOLLANMA.md → "Apps Script (bepul server)" bo'limi. Qisqasi:
 *   - pastdagi 3 qatorni to'ldiring;
 *   - Project Settings → Script Properties → SERVICE_ACCOUNT_JSON = service account JSON faylining butun matni;
 *   - Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → URL'ni config.js ga yozing.
 *   - Tekshirish: yuqoridagi ro'yxatdan "testSetup" ni tanlab ▷ Run.
 *
 * DIQQAT: bu fayl tools/build-gas.py orqali yaratiladi (baholash qismi laoshi/grade.js dan olinadi).
 */

// ====== SHU UCH QATORNI config.js dagi qiymatlar bilan bir xil qiling ======
const FIREBASE_PROJECT_ID = 'PROJECT_ID_BU_YERGA';   // config.js → firebase.projectId
const FIREBASE_API_KEY    = 'API_KEY_BU_YERGA';      // config.js → firebase.apiKey
const FIREBASE_DB_URL     = 'DATABASE_URL_BU_YERGA'; // config.js → firebase.databaseURL (oxirida / bo'lmasin)
// ==============================================================================
const DEFAULT_PASSWORD = '111111';
const GRACE_MS = 60000;   // vaqt tugagandan keyin javoblar yetib kelishi uchun zaxira

const SCOPES_ = [
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/cloud-platform'
].join(' ');

/* ---- laoshi/grade.js dan avtomatik ko'chirildi ---- */
/* ============================================================================
   Baholash — sof funksiyalar (brauzerda ham, Google Apps Script'da ham ishlaydi).
   Apps Script nusxasi tools/build-gas.py orqali avtomatik yangilanadi — shu faylni tahrirlang.
   ============================================================================ */
var LZGrade = (function(){
'use strict';
var TONE_MARK = {'\u0304':1,'\u0301':2,'\u030C':3,'\u0300':4};

/** "Nǐ hǎo" / "ni3 hao3" / "nǐhǎo" -> "nihao|33". Neytral ton hisobga olinmaydi. */
function normPinyin(input, tones){
  var s = String(input||'').toLowerCase().replace(/u:/g,'ü').normalize('NFD');
  var letters = '', t = [];
  for(var i=0;i<s.length;i++){ var ch = s[i];
    if(ch>='a' && ch<='z'){ letters += ch; continue; }
    if(ch==='\u0308'){ if(letters.slice(-1)==='u') letters = letters.slice(0,-1)+'v'; continue; }
    if(TONE_MARK[ch]){ t.push(TONE_MARK[ch]); continue; }
    if(ch>='1' && ch<='4'){ t.push(+ch); continue; }
  }
  return tones===false ? letters : letters+'|'+t.join('');
}
function normText(s){
  return String(s||'').toLowerCase().normalize('NFC')
    .replace(/[\u2018\u2019\u02BB\u02BC\u0060\u00B4\u2032]/g,"'")
    .replace(/[.,!?;:"()[\]{}«»…—–。，！？、；：“”（）]/g,' ').replace(/\s+/g,' ').trim();
}
function normHan(s){ return String(s||'').normalize('NFC').replace(/[\s.,!?;:'"()[\]{}。，！？、；：‘’“”（）《》…—·]/g,''); }
function splitAlt(s){ return String(s||'').split(/[;/,，；|]/).map(function(x){return x.trim();}).filter(Boolean); }

/** Bitta savolni tekshiradi → 'correct' | 'incorrect' | 'partial' | 'unanswered' (+ ulush) */
function checkItem(q, key, ans, opt){
  key = key || {}; ans = ans || {};
  var text = ans.text != null ? String(ans.text).trim() : '';
  switch(q.type){
    case 'single':
      if(ans.v == null) return {v:'unanswered', f:0};
      return +ans.v === +key.c ? {v:'correct', f:1} : {v:'incorrect', f:0};
    case 'tf':
      if(ans.v == null) return {v:'unanswered', f:0};
      return (ans.v === true || ans.v === 'true' || ans.v === 1) === (key.c === true || key.c === 'true' || key.c === 1) ? {v:'correct', f:1} : {v:'incorrect', f:0};
    case 'multi': {
      var picked = (ans.v || []).map(Number).sort(), right = (key.c || []).map(Number).sort();
      if(!picked.length) return {v:'unanswered', f:0};
      if(picked.join() === right.join()) return {v:'correct', f:1};
      if(opt.partial){ // qisman ball: to'g'ri belgilanganlar − noto'g'rilar, 0 dan kam emas
        var good = picked.filter(function(x){ return right.indexOf(x) >= 0; }).length, bad = picked.length - good;
        var f = Math.max(0, (good - bad) / (right.length || 1));
        return f > 0 ? {v:'partial', f:Math.round(f*100)/100} : {v:'incorrect', f:0};
      }
      return {v:'incorrect', f:0};
    }
    case 'text': case 'translation': {
      if(!text) return {v:'unanswered', f:0};
      var acc = []; (key.accepted||[]).forEach(function(a){ acc.push(a); splitAlt(a).forEach(function(x){ acc.push(x); }); });
      var norm = q.type === 'text' && q.exact ? function(x){ return String(x).trim(); } : normText;
      var mine = norm(text);
      return acc.some(function(a){ return norm(a) === mine; }) ? {v:'correct', f:1} : {v:'incorrect', f:0};
    }
    case 'pinyin':
      if(!text) return {v:'unanswered', f:0};
      return (key.accepted||[]).some(function(a){ return normPinyin(a, opt.requireTones) === normPinyin(text, opt.requireTones); }) ? {v:'correct', f:1} : {v:'incorrect', f:0};
    case 'hanzi_input': case 'dictation':
      if(!text) return {v:'unanswered', f:0};
      return (key.accepted||[]).some(function(a){ return normHan(a) === normHan(text); }) ? {v:'correct', f:1} : {v:'incorrect', f:0};
    case 'writing': {
      var w = ans.writing || [];
      var need = q.charCount || w.length;
      var done = w.length > 0 && w.length >= need && w.every(function(c){ return c && c.completed; });
      if(!done) return {v:'unanswered', f:0};   // erkin chizma — laoshi baholaydi
      return w.every(function(c){ return (c.mistakes||0) <= opt.tolerance; }) ? {v:'correct', f:1} : {v:'incorrect', f:0};
    }
  }
  return {v:'unanswered', f:0};
}

function gradeOf(percent, criteria){
  var c = (criteria||[]).slice().sort(function(a,b){ return b.min - a.min; });
  for(var i=0;i<c.length;i++) if(percent >= c[i].min) return c[i].grade;
  return c.length ? c[c.length-1].grade : null;
}

/** Butun sessiyani baholash. overrides — laoshi qo'lda qo'ygan baholar {qid:'correct'|'incorrect'} */
function gradeSession(test, keys, session, overrides){
  var st = test.settings || {};
  var opt = { requireTones: st.requireTones !== false, tolerance: st.tolerance != null ? st.tolerance : 3, partial: !!st.partial };
  var order = (test.order && test.order.length) ? test.order : Object.keys(test.questions||{}).sort();
  var answers = (session && session.answers) || {}, K = (keys && keys.answers) || {};
  var verdicts = {}, got = 0, max = 0, correct = 0, pending = 0;
  order.forEach(function(id){
    var q = test.questions[id]; if(!q) return;
    var pts = q.points != null ? +q.points : 1; max += pts;
    var r = checkItem(q, K[id], answers[id], opt);
    var ov = overrides && overrides[id];
    if(ov === 'correct') r = {v:'correct', f:1}; else if(ov === 'incorrect') r = {v:'incorrect', f:0};
    else if(typeof ov === 'number') r = {v: ov >= 1 ? 'correct' : ov > 0 ? 'partial' : 'incorrect', f: ov};
    verdicts[id] = r.v === 'partial' ? r.f : r.v;
    if(r.v === 'correct') correct++;
    if(r.v === 'unanswered' && q.type === 'writing' && answers[id] && answers[id].writing && answers[id].writing.length) pending++;
    got += pts * r.f;
  });
  var percent = max ? Math.round(got * 1000 / max) / 10 : 0;
  var maxScore = st.maxScore || 100;
  return {
    score: Math.round(maxScore * percent / 10) / 10, maxScore: maxScore, points: Math.round(got*100)/100, maxPoints: max,
    percent: percent, correct: correct, total: order.length, grade: gradeOf(percent, st.criteria), verdicts: verdicts,
    pending: pending, answered: Object.keys(answers).length
  };
}
return { normPinyin: normPinyin, normText: normText, normHan: normHan, splitAlt: splitAlt, checkItem: checkItem, gradeOf: gradeOf, gradeSession: gradeSession };
})();
/* ---- grade.js tugadi ---- */

function doGet() { return json_({ ok: true, app: 'laoshi-zhuli', version: 2 }); }

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (body.action) {
      case 'grade': return json_(grade_(body.tid, body.sid));
      case 'resetPassword': return json_(adminAction_(body, 'reset'));
      case 'deleteUser': return json_(adminAction_(body, 'delete'));
      default:
        // eski versiya bilan moslik: {idToken, targetUid}
        if (body.idToken && body.targetUid) return json_(adminAction_(body, 'reset'));
        return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ------------------------------------------------------------------ baholash */
function safeKey_(s) { return /^[A-Za-z0-9_-]{1,64}$/.test(String(s || '')); }

function grade_(tid, sid) {
  if (!safeKey_(tid) || !safeKey_(sid)) return { ok: false, error: 'bad_request' };
  const tok = getServiceAccountToken_();
  const test = dbGet_(tok, 'tests/' + tid);
  if (!test) return { ok: false, error: 'no_test' };
  const sess = dbGet_(tok, 'sessions/' + tid + '/' + sid);
  if (!sess) return { ok: false, error: 'no_session' };
  const now = Date.now();
  const timeUp = sess.deadline && now > sess.deadline + GRACE_MS;
  if (sess.status !== 'done' && !timeUp) return { ok: false, error: 'not_finished' };
  const keys = dbGet_(tok, 'testKeys/' + tid) || {};
  const r = LZGrade.gradeSession(test, keys, sess, sess.review && sess.review.overrides);
  r.gradedAt = now; r.by = 'server';
  dbPut_(tok, 'results/' + tid + '/' + sid, r);
  if (sess.status !== 'done') dbPatch_(tok, 'sessions/' + tid + '/' + sid, { status: 'done', finishedAt: sess.deadline || now, timeout: true });
  return { ok: true, result: publicResult_(test, keys, r) };
}

/* O'quvchiga qaytariladigan qism — test sozlamalariga qarab */
function publicResult_(test, keys, r) {
  const st = test.settings || {};
  const closed = test.status === 'closed';
  const showScore = st.showScore || 'now';
  if (showScore === 'never' || (showScore === 'end' && !closed)) return { hidden: true, pending: r.pending };
  const out = { score: r.score, maxScore: r.maxScore, percent: r.percent, correct: r.correct, total: r.total, grade: r.grade, pending: r.pending, verdicts: r.verdicts };
  const showAns = st.showAnswers || 'never';
  if (showAns === 'now' || (showAns === 'end' && closed)) {
    out.key = {};
    const K = (keys && keys.answers) || {};
    Object.keys(K).forEach(function (id) { out.key[id] = K[id]; });
  }
  return out;
}

/* ------------------------------------------------------------------ admin amallari */
function adminAction_(body, kind) {
  const idToken = body.idToken, targetUid = body.targetUid;
  if (!idToken || !targetUid) return { ok: false, error: 'idToken va targetUid kerak' };
  const lookup = callIdentityToolkitPublic_('accounts:lookup', { idToken: idToken });
  if (!lookup.users || !lookup.users.length) return { ok: false, error: "Token yaroqsiz yoki muddati o'tgan. Sahifani yangilab qayta urinib ko'ring." };
  const callerUid = lookup.users[0].localId;
  const tok = getServiceAccountToken_();
  const caller = dbGet_(tok, 'teachers/' + callerUid);
  if (!caller || caller.role !== 'admin' || caller.active === false) return { ok: false, error: 'Faqat faol administrator bajara oladi.' };
  if (kind === 'reset') {
    const target = dbGet_(tok, 'teachers/' + targetUid);
    if (!target) return { ok: false, error: 'Bunday hisob bazada topilmadi.' };
    identityAdmin_(tok, 'accounts:update', { localId: targetUid, password: DEFAULT_PASSWORD, returnSecureToken: false });
    return { ok: true, email: target.email };
  }
  if (kind === 'delete') {
    if (targetUid === callerUid) return { ok: false, error: "O'zingizni o'chira olmaysiz." };
    identityAdmin_(tok, 'accounts:delete', { localId: targetUid });
    return { ok: true };
  }
  return { ok: false, error: 'unknown' };
}

/* ------------------------------------------------------------------ yordamchilar */
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function callIdentityToolkitPublic_(method, payload) {
  const res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/' + method + '?key=' + FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  return JSON.parse(res.getContentText());
}
function identityAdmin_(tok, method, payload) {
  const res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/' + method, {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + tok },
    payload: JSON.stringify(payload), muteHttpExceptions: true });
  const parsed = JSON.parse(res.getContentText() || '{}');
  if (parsed.error) throw new Error(parsed.error.message || 'Identity Toolkit xatosi');
  return parsed;
}
function dbUrl_(path) { return FIREBASE_DB_URL.replace(/\/+$/, '') + '/' + path + '.json'; }
function dbGet_(tok, path) {
  const res = UrlFetchApp.fetch(dbUrl_(path), { method: 'get', headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
  const code = res.getResponseCode(), text = res.getContentText();
  if (code !== 200) throw new Error('Bazaga ulanib bo\'lmadi (HTTP ' + code + '): ' + text + ' — FIREBASE_DB_URL to\'g\'rimi va service account\'da "Firebase Realtime Database Admin" roli bormi?');
  return JSON.parse(text);
}
function dbPatch_(tok, path, obj) {
  const res = UrlFetchApp.fetch(dbUrl_(path), { method: 'patch', contentType: 'application/json', headers: { Authorization: 'Bearer ' + tok },
    payload: JSON.stringify(obj), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Yozib bo\'lmadi (HTTP ' + res.getResponseCode() + '): ' + res.getContentText());
}

function dbPut_(tok, path, obj) {
  const res = UrlFetchApp.fetch(dbUrl_(path), { method: 'put', contentType: 'application/json', headers: { Authorization: 'Bearer ' + tok },
    payload: JSON.stringify(obj), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Yozib bo\'lmadi (HTTP ' + res.getResponseCode() + '): ' + res.getContentText());
}

function getServiceAccountToken_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('SA_TOKEN_V3');
  if (cached) return cached;
  const raw = PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error("Script Properties'da SERVICE_ACCOUNT_JSON topilmadi. QOLLANMA.md ga qarang.");
  const key = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: key.client_email, scope: SCOPES_, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const toSign = b64_(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64_(JSON.stringify(claim));
  const sig = Utilities.computeRsaSha256Signature(toSign, key.private_key);
  const jwt = toSign + '.' + Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post', payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }, muteHttpExceptions: true });
  const data = JSON.parse(res.getContentText());
  if (!data.access_token) throw new Error('Service account tokeni olinmadi: ' + res.getContentText());
  cache.put('SA_TOKEN_V3', data.access_token, Math.min(3000, (data.expires_in || 3600) - 300));
  return data.access_token;
}
function b64_(str) { return Utilities.base64EncodeWebSafe(Utilities.newBlob(str).getBytes()).replace(/=+$/, ''); }

/* ==============================================================================
   DIAGNOSTIKA — ro'yxatdan "testSetup" ni tanlab ▷ Run bosing, "Execution log" ni o'qing.
   ============================================================================== */
function testSetup() {
  Logger.log('PROJECT_ID: ' + FIREBASE_PROJECT_ID + '   DB_URL: ' + FIREBASE_DB_URL);
  let tok;
  try { tok = getServiceAccountToken_(); Logger.log('✅ Service account tokeni olindi.'); }
  catch (e) { Logger.log('❌ Token olinmadi: ' + e.message); return; }
  try {
    const t = dbGet_(tok, 'teachers') || {};
    Logger.log('✅ Baza o\'qildi. Hisoblar: ' + Object.keys(t).length);
    const admins = Object.keys(t).filter(function (u) { return (t[u] || {}).role === 'admin'; });
    Logger.log(admins.length ? '✅ Administratorlar: ' + admins.length : '⚠️ role="admin" bo\'lgan hisob yo\'q (saytni bir marta ochib admin yarating).');
  } catch (e) { Logger.log('❌ Bazani o\'qib bo\'lmadi: ' + e.message); }
  try {
    const r = LZGrade.gradeSession({ settings: {}, order: ['a'], questions: { a: { type: 'single' } } }, { answers: { a: { c: 1 } } }, { answers: { a: { v: 1 } } });
    Logger.log(r.percent === 100 ? '✅ Baholash funksiyasi ishlayapti.' : '❌ Baholashda xato');
  } catch (e) { Logger.log('❌ Baholash: ' + e.message); }
}
