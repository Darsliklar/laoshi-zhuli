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

/*@@GRADE@@*/

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
