/* ============================================================================
   Laoshi Zhuli — sozlamalar. Bu faylni "config.js" nomi bilan nusxalang va to'ldiring.
   Qiymatlar Firebase Console → ⚙️ Project settings → General → Your apps → Web app (</>)
   bo'limidan olinadi. Bu qiymatlar parol emas (brauzerda baribir ko'rinadi) — haqiqiy
   himoyani database.rules.json qoidalari beradi. Batafsil: QOLLANMA.md, 2-bo'lim.
   ============================================================================ */
window.CI_CONFIG = {
  firebase: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",        // ← muhim! Realtime Database manzili (https://....firebasedatabase.app yoki ...firebaseio.com)
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // Google Apps Script Web App manzili (apps-script/Code.gs). Bepul. U quyidagilar uchun kerak:
  //  • testlarni serverda baholash (to'g'ri javoblar o'quvchilardan yashirin turadi, natija darhol chiqadi);
  //  • admin uchun "parolni 111111 ga tiklash" tugmasi.
  // Bo'sh qolsa ham sayt ishlaydi: natijalarni laoshi o'z panelida "Baholash" tugmasi bilan hisoblaydi.
  appsScriptUrl: "",

  // Institut nomi (sarlavhada). Bo'sh qoldirsangiz — standart nom.
  institute: {
    uz: "Samarqand Konfutsiy instituti",
    ru: "Институт Конфуция в Самарканде",
    en: "Confucius Institute in Samarkand",
    zh: "撒马尔罕孔子学院"
  }
};
