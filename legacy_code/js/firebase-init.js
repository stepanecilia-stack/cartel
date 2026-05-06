// ============================================
// FIREBASE INITIALIZATION (SHARED MODULE)
// Единый источник конфигурации Firebase
// Используется во всех страницах проекта
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAxsNe0j6NxMwLDeWrFpvdqRbBHFg5gdiw",
    authDomain: "cartel-academy.firebaseapp.com",
    projectId: "cartel-academy",
    storageBucket: "cartel-academy.firebasestorage.app",
    messagingSenderId: "988659631950",
    appId: "1:988659631950:web:ffb7ec4d4b5e0ec440401f"
};

// Инициализация Firebase (только если ещё не инициализирован)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase инициализирован из firebase-init.js');
} else {
    console.log('ℹ️ Firebase уже был инициализирован');
}

// Экспорт глобальных переменных для compat API (без bundler)
const db = firebase.firestore();
const auth = firebase.auth();

console.log('📦 firebase-init.js загружен');