# Laoshi Zhuli · 老师助理

**Samarqand Konfutsiy instituti** laoshilari uchun yagona veb-platforma. Bitta sahifadan bo'limlar tanlanadi:

| Bo'lim | Papka | Nima qiladi | Ma'lumot qayerda |
|---|---|---|---|
| 考 **Testlar va Hanzi** | `laoshi/` | 9 turdagi savol (bitta/ko'p javob, to'g'ri-noto'g'ri, qisqa javob, ieroglif yozish, ieroglif kiritish, pinyin, tarjima, diktant), tayyor sozlamalar, antichit, jonli natijalar, o'quvchi portali | Firebase |
| ✓ **Davomat** | `davomat/` | O'quvchi aylanuvchi QR kodni skanerlab o'zini belgilaydi yoki laoshi qo'lda kiritadi; oylik jurnal, hisobot, Excel | Firebase |
| 板 **Interaktiv doska** | `doska/` | TeachBoard Studio — dars doskasi, PDF/PPTX ustida yozish, musiqa, qo'l harakati bilan boshqarish | Brauzerning o'zida |
| 表 **Dars jadvali** | `jadval/` | Smart Schedule Builder — avtomatik dars jadvali, almashtirishlar, imtihonlar | Brauzerning o'zida (ixtiyoriy Apps Script) |

Barcha bo'limlar **o'zbek, rus, ingliz va xitoy** tillarida. Til bosh sahifada bir marta tanlanadi va hamma bo'limga o'tadi.
Fonda va sarlavhalarda — Konfutsiy instituti logosi.

## Tezkor ishga tushirish

1. **Firebase** loyihasini yarating (yangi akkaunt), Realtime Database + Email/Password Authentication ni yoqing.
2. `database.rules.json` ni Firebase → Realtime Database → **Rules** ga joylang → Publish.
3. `config.js` ga Firebase sozlamalarini yozing (`config.example.js` dan nusxa).
4. Repozitoriyni GitHub'ga yuklang → **Settings → Pages → Deploy from a branch → main / (root)**.
5. Saytni oching → **Testlar va Hanzi** → birinchi kirishda *Administrator hisobini yaratish* formasi chiqadi.
6. *(Ixtiyoriy, tavsiya)* `apps-script/Code.gs` ni Google Apps Script'ga joylang — testlar serverda baholanadi, javoblar to'liq yashirin bo'ladi.

Batafsil, rasmli tushuntirish: **[QOLLANMA.md](QOLLANMA.md)**.

## Tuzilma

```
index.html              bosh sahifa (bo'limlar kartochkalari)
config.js               Firebase sozlamalari (siz to'ldirasiz)
database.rules.json     Firebase xavfsizlik qoidalari (tools/build-rules.py yaratadi)
shared/                 umumiy: til tizimi (i18n.js), dizayn (core.css), Firebase/kirish (app.js),
                        guruhlar va o'quvchi kodlari (groups.js), bo'limlar ro'yxati (modules.js), logo
laoshi/                 Testlar va Hanzi (core, editor, live, student, hanzi, admin, grade, lug'atlar)
davomat/                Davomat
doska/                  TeachBoard Studio (bitta fayl, ~30 MB, xitoy tili qo'shilgan)
jadval/                 Smart Schedule Builder (tayyor build)
apps-script/Code.gs     bepul server: baholash + parolni tiklash (tools/build-gas.py yaratadi)
tools/                  qoidalar va Apps Script generatorlari, tarjima tekshiruvchisi, avtomatik testlar
```

## Yangi bo'lim qo'shish

1. Papka yarating, masalan `kutubxona/index.html` (boshqa bo'limlardan namuna oling: `shared/i18n.js`, `config.js`, `shared/app.js` ulanadi).
2. `shared/modules.js` dagi `CI_MODULES` ro'yxatiga bitta qator qo'shing.
3. O'sha faylning `CI.add({...})` qismiga nom va izohni 4 tilda yozing.

## Dasturchilar uchun

```bash
python3 tools/build-rules.py     # database.rules.json ni yangilash (tools/rules-laoshi.py bilan)
python3 tools/build-gas.py       # apps-script/Code.gs ni yangilash (laoshi/grade.js dan)
node tools/check-i18n.js         # barcha matnlar 4 tilda borligini tekshirish
```
Avtomatik testlar (`tools/tests/`) Firebase emulyatori va Playwright bilan ishlaydi — fayl boshidagi izohga qarang.

Build bosqichi yo'q: oddiy HTML/JS, GitHub Pages'da shundayligicha ishlaydi. Tashqi kutubxonalar `shared/vendor/` da
(Firebase 9.23 compat, SheetJS, qrcode-generator); HanziWriter faqat yozish mashqida CDN'dan yuklanadi.

## Litsenziyalar

Firebase JS SDK (Apache-2.0), SheetJS Community (Apache-2.0), qrcode-generator (MIT), HanziWriter (MIT),
TeachBoard ichidagi kutubxonalar — doskaning "Haqida" bo'limida. Konfutsiy instituti logosi institutga tegishli.
