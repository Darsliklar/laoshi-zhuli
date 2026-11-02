/* ============================================================================
   Laoshi Zhuli — sozlamalar. Bu faylni "config.js" nomi bilan nusxalang va to'ldiring.
   Qiymatlar Firebase Console → ⚙️ Project settings → General → Your apps → Web app (</>)
   bo'limidan olinadi. Bu qiymatlar parol emas (brauzerda baribir ko'rinadi) — haqiqiy
   himoyani database.rules.json qoidalari beradi. Batafsil: QOLLANMA.md, 2-bo'lim.
   ============================================================================ */
window.CI_CONFIG = {
  firebase: {
    apiKey: "AIzaSyAfTbwtGd7JFqSEAGoxHn2uXivwMCfJ94Y",
    authDomain: "laoshi-zhuli.firebaseapp.com",
    databaseURL: "https://laoshi-zhuli-default-rtdb.firebaseio.com",        // ← muhim! Realtime Database manzili (https://....firebasedatabase.app yoki ...firebaseio.com)
    projectId: "laoshi-zhuli",
    storageBucket: "laoshi-zhuli.firebasestorage.app",
    messagingSenderId: "830119962176",
    appId: "1:830119962176:web:e3c68f7e7956fec97ce1a5"
  },

  // Google Apps Script Web App manzili (apps-script/Code.gs). Bepul. U quyidagilar uchun kerak:
  //  • testlarni serverda baholash (to'g'ri javoblar o'quvchilardan yashirin turadi, natija darhol chiqadi);
  //  • admin uchun "parolni 111111 ga tiklash" tugmasi.
  // Bo'sh qolsa ham sayt ishlaydi: natijalarni laoshi o'z panelida "Baholash" tugmasi bilan hisoblaydi.
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxFjYh373DF1Xoob8W8O0phN4nVinIlACTupiUCAJhO_d7ZV-ghMbMdvubxc1U2WMTN/exec",

  // Institut nomi (sarlavhada). Bo'sh qoldirsangiz — standart nom.
  institute: {
    uz: "Samarqand Konfutsiy instituti",
    ru: "Институт Конфуция в Самарканде",
    en: "Confucius Institute in Samarkand",
    zh: "撒马尔罕孔子学院"
  }
};
