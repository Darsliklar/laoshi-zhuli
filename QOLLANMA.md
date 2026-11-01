# Laoshi Zhuli — to'liq qo'llanma

Mundarija:
1. [Umumiy tushuncha](#1-umumiy-tushuncha)
2. [O'rnatish: Firebase (yangi akkaunt)](#2-ornatish-firebase-yangi-akkaunt)
3. [GitHub'ga joylash](#3-githubga-joylash)
4. [Birinchi kirish va laoshilar](#4-birinchi-kirish-va-laoshilar)
5. [Guruhlar va o'quvchi kodlari](#5-guruhlar-va-oquvchi-kodlari)
6. [Testlar va Hanzi](#6-testlar-va-hanzi)
7. [Himoya (antichit) va blokdan chiqarish kodi](#7-himoya-antichit-va-blokdan-chiqarish-kodi)
8. [Natijalar, tekshirish, Excel](#8-natijalar-tekshirish-excel)
9. [Davomat](#9-davomat)
10. [O'quvchi uchun](#10-oquvchi-uchun)
11. [Doska va Dars jadvali](#11-doska-va-dars-jadvali)
12. [Apps Script (bepul server)](#12-apps-script-bepul-server)
13. [Administrator: zaxira, korzinka, qaydlar, eski bazadan ko'chirish](#13-administrator)
14. [Xavfsizlik — nima himoyalangan](#14-xavfsizlik)
15. [Ko'p so'raladigan savollar](#15-kop-soraladigan-savollar)

---

## 1. Umumiy tushuncha

Bosh sahifada 4 ta bo'lim bor. **Testlar va Hanzi** hamda **Davomat** bitta Firebase bazasidan foydalanadi: laoshi bir marta kiradi,
guruhlar va o'quvchilar ikkala bo'limda umumiy. **Doska** va **Dars jadvali** internet/akkauntsiz, kompyuterning o'zida ishlaydi.

Har bir o'quvchiga guruhga qo'shilganda **6 belgili shaxsiy kod** beriladi (masalan `K7M2QX`). Shu kod bilan u:
- guruhga berilgan testlarni topshiradi;
- davomat QR kodini skanerlab o'zini belgilaydi;
- **O'quvchi portali**da o'ziga berilgan barcha topshiriqlar va natijalarini ko'radi.

Til: yuqori o'ngdagi **UZ / RU / EN / 中文** tugmalari. Tanlangan til barcha bo'limlarda saqlanadi.

## 2. O'rnatish: Firebase (yangi akkaunt)

Firebase bepul "Spark" rejasida ishlaydi; to'lov kartasi kerak emas.

1. https://console.firebase.google.com → yangi Google akkaunt bilan kiring → **Add project** → nom (masalan `laoshi-zhuli`) → Analytics shart emas.
2. Chap menyu **Build → Realtime Database → Create database** → joylashuv (Europe-west1 tavsiya) → **Start in locked mode**.
3. **Rules** varag'ini oching, ichidagini o'chirib, repodagi `database.rules.json` faylining **butun matnini** joylang → **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
5. **Authentication → Settings → Authorized domains → Add domain**: `SIZNING-LOGIN.github.io` (GitHub sahifangiz manzili).
6. ⚙️ **Project settings → General → Your apps → `</>` (Web)** → nom bering → **Register app**. Chiqqan `firebaseConfig` qiymatlarini
   `config.js` fayliga ko'chiring:

```js
window.CI_CONFIG = {
  firebase: {
    apiKey: "AIza...", authDomain: "laoshi-zhuli.firebaseapp.com",
    databaseURL: "https://laoshi-zhuli-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "laoshi-zhuli", storageBucket: "laoshi-zhuli.appspot.com",
    messagingSenderId: "...", appId: "..."
  },
  appsScriptUrl: ""     // 12-bo'limdan keyin to'ldiriladi
};
```

> `databaseURL` firebaseConfig'da bo'lmasa, Realtime Database sahifasining tepasidagi manzilni qo'ying.
> Bu qiymatlar parol emas, ular brauzerda baribir ko'rinadi. Himoyani **Rules** ta'minlaydi, shuning uchun 3-qadamni albatta bajaring.

## 3. GitHub'ga joylash

**A. Brauzer orqali (eng oson):** github.com/Darsliklar/laoshi-zhuli → **Add file → Upload files** → ZIP ichidagi barcha fayl va papkalarni
sudrab tashlang → **Commit**. `doska/index.html` taxminan 30 MB. GitHub 100 MB gacha ruxsat beradi, muammo yo'q.

**B. Git orqali:**
```bash
git clone https://github.com/Darsliklar/laoshi-zhuli.git && cd laoshi-zhuli
# ZIP ichidagini shu papkaga ko'chiring
git add . && git commit -m "Laoshi Zhuli" && git push
```

Keyin: repo → **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**.
1–2 daqiqadan so'ng sayt `https://darsliklar.github.io/laoshi-zhuli/` manzilida ochiladi.

## 4. Birinchi kirish va laoshilar

1. Saytni oching → **Testlar va Hanzi**. Bazada hali hech kim bo'lmagani uchun **"Administrator hisobini yaratish"** formasi chiqadi.
   Uni institutdagi mas'ul shaxs birinchi bo'lib to'ldirsin. Bu forma boshqa hech qachon chiqmaydi.
2. **👩‍🏫 Laoshilar** bo'limi → ism, email, vaqtinchalik parol (standart `111111`) → **Qo'shish**. Chiqqan oynadagi manzil/email/parolni laoshiga yuboring.
3. Laoshi kirgach, yuqori o'ngdagi **⋯ → 🔑 Parolni almashtirish** orqali o'z parolini o'rnatadi.
4. Laoshi qatoridagi tugmalar: **Cheklash** (kira olmay qoladi) / **Ruxsat berish**, **⋯** menyusida: parol tiklash havolasi,
   parolni 111111 ga tiklash (Apps Script kerak), administrator qilish, o'chirish (korzinkaga).

> O'zi ro'yxatdan o'tish yo'q, hisoblarni faqat administrator ochadi.
> Laoshi o'zini administrator qila olmaydi (qoidalar buni taqiqlaydi).

## 5. Guruhlar va o'quvchi kodlari

**👥 Guruhlar** (Testlar va Davomat ichida bir xil):
1. Guruh nomini yozing → **Guruh yaratish**.
2. Guruhni oching → o'quvchilarni har qatorga bittadan yozing → **Qo'shish va kod berish**.
3. **🖨 Kodlar varag'ini chop etish**: har bir o'quvchi uchun ism, kod va guruh portali QR kodi bor kartochka. Qirqib tarqating.
4. **⋯** menyusi: kodlarni Excel'ga yuklab olish, guruh portali havolasi, nomini/izohni o'zgartirish, **🤝 Hamkor laoshilar**
   (bitta guruhda ikki laoshi dars bersa, ikkalasi ham boshqaradi), arxivga olish, o'chirish.
5. O'quvchi qatorida: ✏️ ismini o'zgartirish, 🔁 yangi kod (eski kod ishlamay qoladi), 🗑 guruhdan chiqarish (eski natijalari saqlanadi).

## 6. Testlar va Hanzi

Test va Hanzi endi **bitta tushuncha: "topshiriq"**. Bitta topshiriqda oddiy savollar va ieroglif savollari aralash bo'lishi mumkin.

### Yangi topshiriq
**➕ Yangi** →
- **Nomi**, ixtiyoriy izoh.
- **Kim topshiradi**: *Ochiq havola* (o'quvchi ismini yozadi) yoki **guruh** (faqat ro'yxatdagilar shaxsiy kodi bilan; natijalar ismga aniq bog'lanadi).
- Boshlanish/tugash vaqti (ixtiyoriy).
- **Topshiriq turi — tayyor sozlamalar**: 📝 Oddiy test · 🎓 Imtihon · 🏋️ Mashq · 🏠 Uy vazifasi · ✍️ Hanzi mashqi.
  Bittasini tanlang, keyin pastdagi **Sozlamalar**da istalgan bandni alohida yoqing/o'chiring.

### Savol turlari
| Tur | Qanday tekshiriladi |
|---|---|
| 🔘 Bitta javob | tanlangan variant |
| ☑️ Bir nechta javob | hammasi to'g'ri bo'lsa ball (yoki *qisman ball* sozlamasi) |
| ⚖️ To'g'ri / Noto'g'ri | — |
| ✏️ Qisqa javob | qabul qilinadigan javoblar ro'yxati (katta-kichik harf, tinish belgilari e'tiborga olinmaydi) |
| ✍️ Ieroglif yozish | HanziWriter chiziqma-chiziq tekshiradi; erkin yozuvni laoshi baholaydi |
| ⌨️ Ieroglif kiritish | ieroglif matn sifatida |
| 🔤 Pinyin | `nǐ hǎo` = `ni3 hao3`; ton majburiyligi sozlanadi |
| 🌐 Tarjima | bir nechta to'g'ri tarjima (`;` bilan) |
| 🔊 Diktant | so'z qurilma ovozida o'qiladi, o'quvchi ieroglifda yozadi |

Har bir savolga ball, rasm (havola), tartib (↑↓), nusxa (⧉) beriladi.

### Savollarni tez kiritish
- **📥 Matn / fayldan**: savollar `---` bilan ajratiladi, to'g'ri variant oldiga `#` qo'yiladi. Bir nechta `#` bo'lsa, ko'p javobli savol bo'ladi.
  Variantlar `To'g'ri`/`Noto'g'ri` bo'lsa, tf savol. `= javob` qatorlari qisqa javobli savol yasaydi. CSV: `Savol, A, B, C, D, To'g'ri`
  (oxirgi ustun `B` yoki `A,C`). Namuna fayllar tugmalari bor.
- **汉字 So'zlar bazasidan**: so'zlarni tanlang, savol turlarini belgilang. Har bir so'z × tur uchun savol avtomatik yasaladi.
- **📖 So'zlar** bo'limi: umumiy lug'at (ieroglif, pinyin, tarjima, HSK, teglar), CSV import/eksport, HSK 1 namuna so'zlari.

### Saqlash va tarqatish
**▶ Saqlash va ochish** bosilgach havola va QR chiqadi: **⛶ Katta QR** proyektorda ko'rsatish uchun.
Guruhli topshiriq o'quvchi portalida ham avtomatik ko'rinadi.

Ro'yxatdagi **⋯** menyusida: tahrirlash, ko'rib chiqish (o'quvchi ko'zi bilan, javoblar saqlanmaydi), yopish/ochish, nusxa, **🖥 Sinfda ko'rsatish**
(ieroglif kartochkalari, ovoz, chiziq tartibi animatsiyasi), **🖨 Qog'ozga chop etish** (javoblar kaliti alohida varaqda), o'chirish (korzinkaga).

**🌐 Kutubxona**: administrator topshiriqni umumiy qiladi, boshqa laoshilar **⧉ Nusxa olish** bilan o'ziga oladi.

## 7. Himoya (antichit) va blokdan chiqarish kodi

**Sozlamalar → 🛡 Himoya**:

| Sozlama | Ma'nosi |
|---|---|
| **O'quvchi testdan chiqib ketsa** | *Hech narsa qilmaslik*: chiqishlar faqat sanaladi. *Ogohlantirish*: oyna chiqadi, N-chiqishda blok. *Darhol bloklash*: birinchi chiqishdayoq blok |
| **Nechanchi chiqishda bloklansin** | Ogohlantirish rejimida. `0` = hech qachon bloklanmaydi |
| **Blokdan chiqarish kodi** | Yoqilgan bo'lsa, bloklangan o'quvchi **laoshi aytgan 4 xonali kod**ni kiritib, o'zi davom etadi. Laoshi ruxsatini kutish shart emas |
| **To'liq ekran majburiy** | To'liq ekrandan chiqish ham "chiqib ketish" hisoblanadi |
| **Nusxalash va qo'yishni taqiqlash** | Matnni belgilash, Ctrl+C/V va o'ng tugma o'chiriladi |

Kod muharrirda (🔁 bilan yangilanadi) va **📊 Natijalar** sahifasining tepasida katta harflarda ko'rinadi.
Kod serverda tekshiriladi: o'quvchi uni brauzer kodidan topa olmaydi.

Bloklangan o'quvchini laoshi **📊 Natijalar** sahifasidagi **🔓 Ruxsat** tugmasi bilan ham ochadi, yoki **Hammasini ochish** bilan barchasini birdaniga.
Ruxsat berilganda o'quvchi sahifasi o'zi ochiladi, yangilash shart emas.

Boshqa sozlamalar: vaqt, urinishlar soni, savollar/variantlarni aralashtirish, savollarni bittadan ko'rsatish (orqaga qaytish ruxsati bilan),
ball va to'g'ri javoblarni ko'rsatish (*darhol / test yopilgach / yo'q*), maksimal ball, baho mezoni (`86=5` kabi), ieroglif sozlamalari
(ton majburiyligi, ruxsat etilgan xatolar, necha xatodan keyin ko'rsatma, 田/米 katakcha).

## 8. Natijalar, tekshirish, Excel

**📊 Natijalar** → topshiriqni tanlang:
- **Jonli** jadval: holat (ishlamoqda / bloklangan / tugatdi / vaqt tugadi), jarayon, chiqishlar soni ⚠️, vaqt, ball.
  **⋯**: majburan yakunlash, +5 daqiqa, qayta topshirishga ruxsat, o'chirish.
- **🔍** — batafsil: har bir savolda o'quvchi javobi, to'g'ri javob, avtomatik baho. Laoshi ✓/✗ bilan bahoni o'zgartiradi, izoh yozadi,
  **Bahoni saqlash** yoki **Qayta ishlashga qaytarish** (o'quvchi javoblarini tuzatib qayta yuboradi). Ieroglif yozuvlari rasm sifatida ko'rinadi.
- **Savollar tahlili**: har bir savolga to'g'ri javob foizi va ko'p uchragan xato javob. Eng qiyin savollar tepada.
- **Tekshirish**: ieroglif yozish savollari bor, hali tekshirilmagan natijalar.
- **⬇ Excel**: 1-varaq — umumiy natijalar; 2-varaq — har bir savolga javoblar (✓/✗).

Apps Script sozlanmagan bo'lsa, natijalarni laoshi paneli **avtomatik** hisoblaydi (panel ochiq turganda).
**🧮 Qayta baholash** hammasini qayta hisoblaydi.

## 9. Davomat

**Davomat** bo'limi → **✅ Dars**:
1. Guruh, sana va dars raqamini tanlang (kuniga bir nechta dars bo'lsa, 2-dars, 3-dars).
2. **📱 QR bilan belgilash** → mavzu (ixtiyoriy), *necha daqiqadan keyin "kechikdi"*, *QR necha daqiqadan keyin yopilsin* → **Boshlash**.
3. Ekranda katta QR chiqadi va **har 15 soniyada almashadi**. O'quvchi telefon kamerasi bilan skanerlaydi → shaxsiy kodini kiritadi
   (birinchi marta; keyin telefon eslab qoladi) → **Belgilanish**. Laoshi ekranida ism shu zahoti paydo bo'ladi.
4. Qo'lda: har bir o'quvchi yonida **✓ Keldi / K Kechikdi / ✗ Kelmadi / S Sababli**, 📝 izoh. **✓ Hammasini "keldi"** tugmasi ham bor.
5. **⏹ Darsni yakunlash**: QR o'chadi, belgilanmaganlarni "kelmadi" deb belgilash taklif qilinadi.

Nega aldab bo'lmaydi:
- QR rasmini uydagi do'stga yuborsa, u ochguncha QR eskirgan bo'ladi.
- Har bir o'quvchi faqat o'z kodi bilan belgilanadi.
- Vaqt server bo'yicha yoziladi, kechikish chegarasidan keyin faqat "kechikdi" deb yoziladi.
- Bitta telefondan bir necha o'quvchi belgilansa, laoshi ro'yxatida ⚠️ belgisi chiqadi.

**📒 Jurnal**: oy bo'yicha jadval (o'quvchi × sana), har bir katakni bosib o'zgartirish, davomat foizi, **⬇ Excel** (izohlar alohida varaqda).
**📊 Hisobot**: tanlangan davr uchun barcha guruhlar bo'yicha statistika va davomati 75% dan past o'quvchilar ro'yxati.

## 10. O'quvchi uchun

- **Test**: laoshi bergan havola yoki QR → (guruhli bo'lsa) shaxsiy kod → **Boshlash**. Javoblar har bosishda saqlanadi.
  Internet uzilsa yoki telefon o'chsa, xuddi shu qurilmada havolani qayta ochsangiz, test davom etadi.
- **O'quvchi portali**: bosh sahifa → **Kod bilan kirish** → kod. Barcha topshiriqlar: yangi / boshlangan / topshirilgan / qayta ishlash, ballar.
- **Davomat**: dars boshida ekrandagi QR'ni skanerlang.

## 11. Doska va Dars jadvali

**Interaktiv doska** (TeachBoard Studio) to'liq kompyuterda ishlaydi: fayllar internetga yuklanmaydi. Xitoy tili qo'shildi.
Portalda tanlangan til doskaga o'tadi. Pastki chap burchakdagi logo bosh sahifaga qaytaradi. Qo'l harakati bilan boshqarish uchun
birinchi marta MediaPipe fayllari kerak, doska o'zi ko'rsatma beradi.

**Dars jadvali** (Smart Schedule Builder) ham brauzerda ishlaydi (localStorage). Muntazam **JSON backup** oling.
Bir nechta kompyuterda umumiy ishlash uchun ichidagi "Umumiy saqlash" funksiyasi bor: `jadval/backend/Code.gs` ni
alohida Apps Script sifatida joylab, jadval Sozlamalariga URL kiriting. Bu laoshi-zhuli serveridan alohida.

## 12. Apps Script (bepul server)

Sozlanmasa ham sayt ishlaydi. Sozlansa:
- natija o'quvchiga **darhol** chiqadi, laoshi paneli ochiq bo'lishi shart emas;
- admin **parolni 111111 ga tiklash** va o'chirilgan laoshining login hisobini butunlay o'chirish imkoniga ega bo'ladi.

**1) Service account**
1. https://console.cloud.google.com → yuqorida Firebase loyihangizni tanlang.
2. **IAM & Admin → Service Accounts → Create service account** (nom: `laoshi-server`).
3. Rollar: **Firebase Realtime Database Admin** va **Firebase Authentication Admin** → Done.
4. Hisobni oching → **Keys → Add key → Create new key → JSON**. Fayl yuklanadi, uni hech kimga bermang.

**2) Apps Script**
1. https://script.google.com → **New project** → `Code.gs` ichini o'chirib, repodagi `apps-script/Code.gs` ni to'liq joylang.
2. Fayl boshidagi 3 qatorni to'ldiring: `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_DB_URL` (config.js dagi bilan bir xil).
3. ⚙️ **Project Settings → Script Properties → Add**: nomi `SERVICE_ACCOUNT_JSON`, qiymati — JSON faylning butun matni.
4. Ro'yxatdan **testSetup** ni tanlab ▷ **Run** → ruxsat bering → *Execution log*da ✅ belgilar chiqishi kerak.
5. **Deploy → New deployment → ⚙️ Web app** → *Execute as: Me*, *Who has access: Anyone* → **Deploy** → URL'ni nusxalang.
6. `config.js` → `appsScriptUrl: "https://script.google.com/macros/s/…/exec"` → GitHub'ga qayta yuklang.

Kod o'zgarsa: **Deploy → Manage deployments → ✏️ → Version: New version** (URL o'zgarmaydi).

## 13. Administrator

- **📋 Barcha testlar**: barcha laoshilarning topshiriqlari, filtrlar, natijalar soni.
- **📢 E'lonlar**: barcha laoshilar panelida ko'rinadi.
- **🧾 Qaydlar**: kim, qachon, nima qildi. Qidiruv, filtr, CSV/JSON. Jurnalni faqat qo'shish mumkin, laoshi o'z izini o'chira olmaydi.
- **🗑 Korzinka**: o'chirilgan topshiriqlar (natijalari bilan), natijalar, guruhlar, hisoblar, e'lonlar 90 kun saqlanadi, ↺ tiklanadi.
  Laoshi faqat o'z korzinkasini ko'radi.
- **💾 Zaxira**: butun bazani bitta JSON faylga yuklab olish va undan tiklash. Login/parollar Firebase Authentication'da turadi va faylga kirmaydi.
- **📦 Eski "Laoshi Test" dan ko'chirish**: eski saytning 💾 Zaxira bo'limidan olingan JSON. Quyidagilar ko'chadi:
  - testlar;
  - Hanzi guruhlari (o'quvchi kodlari **o'zgarmaydi**);
  - so'zlar va Hanzi topshiriqlari.

  Egasi email bo'yicha topiladi, shuning uchun avval laoshilarni xuddi o'sha emaillar bilan oching. Eski o'quvchi natijalari ko'chmaydi,
  ularni eski saytdan Excel'ga saqlab oling.
- **🔐 Kirishlarim** (⋯ menyusida): qachon, qaysi qurilma/brauzer/IP dan kirilgan.

## 14. Xavfsizlik

Firebase emulyatorida haqiqiy hujum urinishlari bilan tekshirilgan:
- O'quvchi **to'g'ri javoblarni o'qiy olmaydi**: ular alohida `testKeys` bo'limida, faqat egasi va admin uchun ochiq.
- O'quvchi **o'ziga ball yoza olmaydi**: natija alohida `results` bo'limida, uni faqat laoshi yoki server yozadi.
- O'quvchi **chiqishlar sonini kamaytira olmaydi** va o'zini blokdan **kodsiz chiqara olmaydi**.
- Guruhli testni **kodsiz** boshlab bo'lmaydi va urinishlar soni server tomonda cheklangan. Vaqt chegarasi ham server vaqti bo'yicha.
- Boshqa o'quvchi nomidan davomat belgilab bo'lmaydi. Eskirgan QR ishlamaydi.
- O'quvchi kodlari ochiq saqlanmaydi, faqat SHA-256 xeshi ochiq.
- Laoshi o'zini admin qila olmaydi. Cheklangan laoshi hech narsa yoza olmaydi.

Qoidalarni o'zgartirish: `tools/build-rules.py` va `tools/rules-laoshi.py` → `python3 tools/build-rules.py` → yangi `database.rules.json` ni Firebase'ga joylang.

## 15. Ko'p so'raladigan savollar

**Firebase bepul rejasi yetadimi?** 7–8 laoshi va ~200 o'quvchi uchun saqlash (1 GB) va trafik (oyiga 10 GB) bemalol yetadi.
Asosiy cheklov — **bir vaqtda 100 ta ulanish** (har bir ochiq varaq = 1 ulanish). Sayt buni tejaydi: o'quvchi davomatga belgilangach,
testni yuborib natijasini ko'rgach yoki portalda ro'yxatni ochgach, uning sahifasi bazadan avtomatik uziladi. Bir nechta guruh bir vaqtda
katta imtihon topshiradigan bo'lsa, loyihani **Blaze** rejasiga o'tkazing (bepul limitlar o'sha-o'sha, ulanishlar 200 000 gacha;
bu hajmda to'lov amalda 0). Google Cloud'da byudjet ogohlantirishini qo'yib qo'ying. Holatni Realtime Database → **Usage** da kuzatasiz.

**"Ruxsat yo'q (Database Rules)" xatosi.** `database.rules.json` Firebase'ga joylanmagan yoki eski. 2-bo'lim, 3-qadam.

**Kirishda "auth/unauthorized-domain".** Firebase → Authentication → Settings → Authorized domains ga `…github.io` ni qo'shing.

**O'quvchi kodini unutdi.** Guruhlar → o'quvchi qatoridagi kodga qarang yoki 🔁 bilan yangisini bering.

**Natija o'quvchiga chiqmayapti.** "Ball ko'rsatilsinmi" sozlamasini tekshiring. Apps Script yo'q bo'lsa, laoshi Natijalar sahifasini ochganda hisoblanadi.

**Ieroglif yozish maydoni yuklanmayapti.** HanziWriter internetdan (jsDelivr) yuklanadi. Internet bo'lmasa, maydon avtomatik
erkin yozish rejimiga o'tadi va uni laoshi baholaydi.

**Telefon ovozi xitoychani o'qimayapti.** Telefonda xitoy (zh-CN) ovozi o'rnatilmagan. Sozlamalar → Til → Matnni ovozga aylantirish.

**Doska juda sekin ochiladi.** Fayl 30 MB, birinchi ochilishda yuklanadi, keyin brauzer keshlaydi.
