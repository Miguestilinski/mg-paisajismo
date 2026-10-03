// Importamos desde los CDN para usar JS modular sin instalar npm
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOifFCG79vQjxK28pSg5-VuKem8UC328U",
  authDomain: "mg-paisajismo.firebaseapp.com",
  projectId: "mg-paisajismo",
  storageBucket: "mg-paisajismo.firebasestorage.app",
  messagingSenderId: "113291048562",
  appId: "1:113291048562:web:14e4f21eb542c8d6c974eb",
  databaseURL: "https://mg-paisajismo-default-rtdb.firebaseio.com" // Obligatorio para Realtime Database
};

const app = initializeApp(firebaseConfig);

// Inicializamos Realtime Database
const db = getDatabase(app);

export { app, db };