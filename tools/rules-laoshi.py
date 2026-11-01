# Laoshi (test + hanzi) qoidalari — build-rules.py ichidan chaqiriladi (T, ADM, MT, MTnew, test o'zgaruvchilari tayyor)
TS = "root.child('tests').child($tid)"
SET = TS + ".child('settings')"
SES = "root.child('sessions').child($tid).child($sid)"
KEYS = "root.child('testKeys').child($tid)"

# o'quvchi sessiyani yaratishi: test ochiq, vaqt oralig'ida, natija/izohsiz, vaqt server bo'yicha,
# vaqt chegarasi testdagidan oshmaydi, guruhli testda — kod (xesh) to'g'ri va urinishlar soni chegaralangan
STUDENT_CREATE = (
  "!data.exists() && newData.child('status').val() === 'active' "
  f"&& {TS}.child('status').val() === 'open' "
  f"&& (!{TS}.child('startAt').exists() || now >= {TS}.child('startAt').val() - 60000) "
  f"&& (!{TS}.child('endAt').exists() || now <= {TS}.child('endAt').val()) "
  "&& newData.child('startedAt').val() === now "
  f"&& (!({SET}.child('timeLimit').val() > 0) || (newData.child('deadline').isNumber() && newData.child('deadline').val() <= now + {SET}.child('timeLimit').val() * 60000 + 5000)) "
  "&& !newData.child('review').exists() && newData.child('name').isString() && newData.child('name').val().length <= 80 "
  f"&& (!{TS}.child('groupId').exists() || ("
  f"root.child('roster').child({TS}.child('groupId').val()).child(newData.child('h').val()).child('s').val() === newData.child('studentId').val() "
  "&& $sid === newData.child('studentId').val() + '-' + newData.child('attempt').val() "
  f"&& newData.child('attempt').isNumber() && newData.child('attempt').val() >= 1 "
  f"&& (!({SET}.child('attempts').val() > 0) || newData.child('attempt').val() <= {SET}.child('attempts').val())))"
)
CAN_ANSWER = (
  f"{SES}.child('status').val() === 'active' "
  f"&& (!{SES}.child('deadline').exists() || now <= {SES}.child('deadline').val() + 30000) "
  f"&& ({TS}.child('status').val() === 'open' || {SES}.child('review').child('status').val() === 'needs_revision')"
)
STATUS_STUDENT = (
  "(data.val() === 'active' && (newData.val() === 'locked' || newData.val() === 'done')) || "
  f"(data.val() === 'locked' && newData.val() === 'active' && {SET}.child('unlockCode').val() === true "
  f"&& {KEYS}.child('pin').isString() && newData.parent().child('unlockTry').val() === {KEYS}.child('pin').val())"
)
RESULT_READ = (
  f"{MT('$tid')} || {SET}.child('showScore').val() === 'now' || !{SET}.child('showScore').exists() "
  f"|| ({SET}.child('showScore').val() === 'end' && {TS}.child('status').val() === 'closed')"
)

LAOSHI_RULES = {
  "tests": {
    ".read": True,
    ".indexOn": ["ownerUid", "groupId", "shared", "sourceId"],
    "$tid": {
      ".write": f"{T} && ((!data.exists() && newData.child('ownerUid').val() === auth.uid) || (data.exists() && (data.child('ownerUid').val() === auth.uid || {ADM})))",
      ".validate": "newData.hasChildren(['title', 'ownerUid']) && newData.child('title').isString() && newData.child('title').val().length <= 200"
    }
  },
  "testKeys": {
    "$tid": {
      ".read": MT("$tid"),
      ".write": MTnew("$tid", ".parent().parent()")
    }
  },
  "sessions": {
    "$tid": {
      ".read": MT("$tid"),
      ".write": MT("$tid"),
      "$sid": {
        ".read": True,
        ".write": STUDENT_CREATE,
        "answers": { "$qid": { ".write": CAN_ANSWER, ".validate": "newData.val() === null || newData.hasChildren() " } },
        "status": { ".write": STATUS_STUDENT, ".validate": "newData.isString() && newData.val().matches(/^(active|locked|done|reset)$/)" },
        "unlockTry": { ".write": f"{SES}.child('status').val() === 'locked'", ".validate": "newData.isString() && newData.val().length <= 12" },
        "violations": { ".write": f"{SES}.exists()", ".validate": "newData.isNumber() && (!data.exists() || newData.val() >= data.val())" },
        "events": { "$e": { ".write": f"!data.exists() && {SES}.exists()", ".validate": "newData.child('at').val() === now" } },
        "finishedAt": { ".write": f"!data.exists() && {SES}.exists()", ".validate": "newData.val() === now" },
        "lastSeen": { ".write": f"{SES}.exists()", ".validate": "newData.val() === now" },
        "pos": { ".write": f"{SES}.exists()", ".validate": "newData.isNumber()" }
      }
    }
  },
  "libKeys": {
    ".read": T,
    "$tid": { ".write": ADM }
  },
  "results": {
    "$tid": {
      ".read": MT("$tid"),
      ".write": MT("$tid"),
      "$sid": { ".read": RESULT_READ }
    }
  },
  "words": {
    ".read": T,
    ".indexOn": ["ownerUid", "hsk"],
    "$wid": {
      ".write": f"{T} && (!data.exists() || data.child('ownerUid').val() === auth.uid || {ADM})",
      ".validate": "newData.child('hanzi').isString() && newData.child('hanzi').val().length > 0 && newData.child('hanzi').val().length <= 24"
    }
  }
}
