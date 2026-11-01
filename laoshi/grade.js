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
if(typeof module !== 'undefined') module.exports = LZGrade;
