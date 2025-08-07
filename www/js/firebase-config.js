// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyDv1pYOabEzKjw7xFaaB2FYUa_SO9ATcfA",
  authDomain: "ship-crash-web.firebaseapp.com",
  projectId: "ship-crash-web",
  storageBucket: "ship-crash-web.firebasestorage.app",
  messagingSenderId: "599520985723",
  appId: "1:599520985723:web:4748e98190d1cac69098de",
  measurementId: "G-Y1D4QTEJVQ"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
try { 
    if (typeof firebase.analytics === 'function') {
        firebase.analytics(); 
    }
}
catch(e){ 
    console.warn("Analytics não disponível:", e); 
}
