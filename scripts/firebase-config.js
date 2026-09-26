// Importamos desde los CDN para usar JS modular sin instalar npm
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOifFCG79vQjxK28pSg5-VuKem8UC328U",
  authDomain: "mg-paisajismo.firebaseapp.com",
  projectId: "mg-paisajismo",
  storageBucket: "mg-paisajismo.firebasestorage.app",
  messagingSenderId: "113291048562",
  appId: "1:113291048562:web:14e4f21eb542c8d6c974eb",
  // databaseURL: "https://mg-paisajismo-default-rtdb.firebaseio.com" // Esta línea es de Realtime Database, no afecta si la dejas
};

// Inicializamos Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Habilitamos la persistencia offline (El "salvavidas" para la Moni)
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("Múltiples pestañas abiertas, la persistencia solo funciona en una.");
    } else if (err.code == 'unimplemented') {
      console.warn("El navegador no soporta persistencia offline.");
    }
  });

// Exportamos 'db' para usarlo en app.js y versions.js
export { db };