// ============================================
// FIREBASE INITIALIZATION (SHARED MODULE) — legacy HTML
// ============================================
// Конфиг не хранится в git: подставьте те же значения, что в корневом .env.local
// (переменные VITE_FIREBASE_*), только без префикса VITE_ и без кавычек «undefined».
// Папка legacy_code — ориентир старой вёрстки; основное приложение — React в /src.

const firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
};

const canInit = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
);

/** Глобальные для страниц legacy (script.js и *.html). */
var db = null;
var auth = null;

if (canInit) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase инициализирован из firebase-init.js');
    } else {
        console.log('ℹ️ Firebase уже был инициализирован');
    }
    db = firebase.firestore();
    auth = firebase.auth();
} else {
    console.warn(
        '[Cartel legacy] Заполните объект firebaseConfig в legacy_code/js/firebase-init.js значениями из Firebase Console (как для VITE_FIREBASE_* в .env.local).',
    );
}

console.log('📦 firebase-init.js загружен');
