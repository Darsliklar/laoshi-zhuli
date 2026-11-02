#!/usr/bin/env python3
"""database.rules.json ni yaratadi. Qoidalarni shu yerda o'zgartiring va qayta ishga tushiring:
    python3 tools/build-rules.py
Firebase Rules'da funksiya yo'q, shuning uchun takrorlanadigan shartlar shu yerda satr sifatida yig'iladi."""
import json, os

def tch(uid='auth.uid'):
    return f"root.child('teachers').child({uid})"

# faol laoshi (yoki admin)
T = f"(auth != null && {tch()}.exists() && {tch()}.child('active').val() !== false)"
# faol administrator
ADM = f"(auth != null && {tch()}.child('role').val() === 'admin' && {tch()}.child('active').val() !== false)"

def grp(g):
    return f"root.child('groups').child({g})"

def MG(g):
    """g guruhini boshqara oladi: egasi, hamkor laoshi yoki admin"""
    return f"({T} && ({grp(g)}.child('ownerUid').val() === auth.uid || {grp(g)}.child('members').child(auth.uid).val() === true || {ADM}))"

def OWN(g):
    return f"({T} && ({grp(g)}.child('ownerUid').val() === auth.uid || {ADM}))"

def att(g, k, path):
    return f"root.child('attendance').child({g}).child({k}).child('{path}')"

# ---------------------------------------------------------------- tests (Laoshi) yordamchilari
def test(tid):
    return f"root.child('tests').child({tid})"

def MT(tid):
    """testni boshqara oladi: egasi yoki admin"""
    return f"({T} && ({test(tid)}.child('ownerUid').val() === auth.uid || {ADM}))"

def MTnew(tid, up):
    """yangi holatdagi test egasi (test va kalit bir vaqtda yozilganda). up — newData dan ildizgacha .parent() zanjiri"""
    return f"({T} && ({test(tid)}.child('ownerUid').val() === auth.uid || newData{up}.child('tests').child({tid}).child('ownerUid').val() === auth.uid || {ADM}))"

rules = {
  "rules": {
    # -------------------------------------------------- tizim va hisoblar
    "system": {
      ".read": True,
      "bootstrapped": { ".write": f"auth != null && (!data.exists() || {ADM})" }
    },
    "teachers": {
      ".read": "auth != null",
      "$uid": {
        # 1) eng birinchi foydalanuvchi o'zini admin qiladi (tizim bo'sh bo'lsa)
        # 2) admin har qanday hisobni o'zgartiradi
        # 3) laoshi faqat o'z ismini o'zgartira oladi — rol va holatni EMAS
        ".write": (f"auth != null && ("
                   f"(auth.uid === $uid && !data.exists() && !root.child('system').child('bootstrapped').exists() && !root.child('teachers').exists()) || "
                   f"{ADM} || "
                   f"(auth.uid === $uid && data.exists() && newData.exists() && newData.child('role').val() === data.child('role').val() "
                   f"&& newData.child('active').val() === data.child('active').val() && newData.child('email').val() === data.child('email').val()))"),
        ".validate": "!newData.exists() || (newData.child('name').isString() && (newData.child('role').val() === 'admin' || newData.child('role').val() === 'teacher'))"
      }
    },
    "announcements": { ".read": T, "$id": { ".write": ADM } },
    "logs": {
      ".read": ADM, ".indexOn": ["at"],
      "$id": {
        ".write": f"({T} && !data.exists() && newData.child('byUid').val() === auth.uid) || {ADM}"
      }
    },
    "trash": {
      ".read": ADM,
      "$owner": {
        ".read": "auth != null && auth.uid === $owner",
        ".write": f"{T} && (auth.uid === $owner || {ADM})"
      }
    },
    "logins": {
      ".read": ADM,
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": f"{T} && (auth.uid === $uid || {ADM})"
      }
    },

    # -------------------------------------------------- guruhlar (umumiy)
    "groups": {
      ".read": T,
      ".indexOn": ["ownerUid"],
      "$gid": {
        # admin boshqa laoshi nomiga ham yaratadi (eski bazadan ko'chirishda kerak)
        ".write": f"{T} && ((!data.exists() && (newData.child('ownerUid').val() === auth.uid || {ADM})) || (data.exists() && (data.child('ownerUid').val() === auth.uid || {ADM})))",
        ".validate": "newData.hasChildren(['name', 'ownerUid']) && newData.child('name').isString() && newData.child('name').val().length <= 200",
        # hamkor laoshilar nom/izoh/arxivni o'zgartira oladi (egasi va hamkorlar ro'yxatini emas)
        "name": { ".write": MG("$gid") },
        "note": { ".write": MG("$gid") },
        "archived": { ".write": MG("$gid") }
      }
    },
    "groupStudents": {
      "$gid": {
        ".read": MG("$gid"),
        ".write": f"{MG('$gid')} || ({T} && newData.parent().parent().child('groups').child($gid).child('ownerUid').val() === auth.uid)",
        "$sid": { ".validate": "!newData.exists() || (newData.child('name').isString() && newData.child('code').isString())" }
      }
    },
    "roster": {
      "$gid": {
        ".write": f"{OWN('$gid')} || ({T} && newData.parent().parent().child('groups').child($gid).child('ownerUid').val() === auth.uid)",
        "_owner": {},
        "$hash": {
          ".read": True,
          ".write": MG("$gid"),
          ".validate": "!newData.exists() || newData.child('s').isString()"
        }
      }
    },

    # kodlar indeksi: o'quvchi faqat kodi bilan o'z guruhini topadi
    "codes": {
      "$h": {
        ".read": True,
        ".write": (f"{T} && ("
                   "(data.exists() && (root.child('groups').child(data.child('g').val()).child('ownerUid').val() === auth.uid || root.child('groups').child(data.child('g').val()).child('members').child(auth.uid).val() === true)) || "
                   "(newData.exists() && (root.child('groups').child(newData.child('g').val()).child('ownerUid').val() === auth.uid || root.child('groups').child(newData.child('g').val()).child('members').child(auth.uid).val() === true "
                   "|| newData.parent().parent().child('groups').child(newData.child('g').val()).child('ownerUid').val() === auth.uid)) || "
                   f"{ADM})"),
        ".validate": "!newData.exists() || newData.child('g').isString()"
      }
    },

    # -------------------------------------------------- davomat
    "attendance": {
      "$gid": {
        ".read": MG("$gid"),
        "$k": {
          ".write": MG("$gid"),
          "meta": { ".read": True },
          "rec": {
            "$sid": {
              ".read": True,
              # o'quvchi o'zini QR orqali belgilaydi: faqat bir marta, dars ochiq bo'lsa, kod (xesh) va chipta to'g'ri bo'lsa,
              # vaqt — server vaqti, kechikish chegarasidan keyin faqat "kechikdi"
              ".write": ("!data.exists() && newData.child('via').val() === 'qr' "
                         f"&& {att('$gid','$k','meta')}.child('open').val() === true "
                         f"&& (!{att('$gid','$k','meta')}.child('closeAt').exists() || now < {att('$gid','$k','meta')}.child('closeAt').val()) "
                         "&& newData.child('h').isString() && newData.child('tk').isString() "
                         "&& root.child('roster').child($gid).child(newData.child('h').val()).child('s').val() === $sid "
                         "&& root.child('roster').child($gid).child(newData.child('h').val()).child('n').val() === newData.child('n').val() "
                         "&& root.child('attTickets').child($gid).child($k).child(newData.child('tk').val()).child('at').val() > now - 300000 "
                         "&& newData.child('at').val() === now "
                         "&& (newData.child('st').val() === 'l' || (newData.child('st').val() === 'p' "
                         f"&& now <= {att('$gid','$k','meta')}.child('startedAt').val() + {att('$gid','$k','meta')}.child('lateMin').val() * 60000))"),
              ".validate": "!newData.exists() || (newData.hasChildren(['st', 'at', 'via']) && newData.child('st').isString() && newData.child('st').val().matches(/^[plae]$/))"
            }
          }
        }
      }
    },
    "attTokens": {
      "$gid": { ".read": MG("$gid"), ".write": MG("$gid") }
    },
    "attTickets": {
      "$gid": {
        ".write": MG("$gid"),
        "$k": {
          "$tid": {
            ".write": ("!data.exists() && newData.child('at').val() === now && newData.child('t').isString() "
                       f"&& {att('$gid','$k','meta')}.child('open').val() === true "
                       "&& (newData.child('t').val() === root.child('attTokens').child($gid).child($k).child('cur').val() "
                       "|| newData.child('t').val() === root.child('attTokens').child($gid).child($k).child('prev').val())")
          }
        }
      }
    },
  }
}

# Laoshi (test + hanzi) qoidalari alohida faylda
extra = os.path.join(os.path.dirname(__file__), 'rules-laoshi.py')
if os.path.exists(extra):
    ns = {'T': T, 'ADM': ADM, 'MG': MG, 'OWN': OWN, 'MT': MT, 'MTnew': MTnew, 'test': test, 'tch': tch}
    exec(open(extra, encoding='utf-8').read(), ns)
    rules['rules'].update(ns['LAOSHI_RULES'])

out = os.path.join(os.path.dirname(__file__), '..', 'database.rules.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(rules, f, ensure_ascii=False, indent=2)
print('OK →', os.path.normpath(out))
