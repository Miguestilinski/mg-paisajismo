// scripts/sync.js
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { app, db } from './firebase-config.js'; 

const auth = getAuth(app);
const EMAIL_MONI = "mg_paisajismo@hotmail.com";

let debounceTimer;

// Inicializa la sesión y verifica si existe. Si no, pide la clave.
export function initSync() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                resolve(true); // Ya hay una cookie/sesión válida
            } else {
                const loggedIn = await pedirClaveYLogear();
                resolve(loggedIn);
            }
        });
    });
}

async function pedirClaveYLogear() {
    const clave = await window.customPrompt(
        "Seguridad de la Nube",
        "Ingresa la clave maestra para activar la sincronización:",
        "Contraseña"
    );
    
    if (!clave) {
        window.customAlert("Modo Local", "Trabajarás de forma local (Offline). Los datos no se respaldarán en la nube.", "bg-amber-500", "hover:bg-amber-600");
        return false;
    }

    try {
        await signInWithEmailAndPassword(auth, EMAIL_MONI, clave);
        window.customAlert("Conectado", "Sincronización en la nube activada correctamente.", "bg-emerald-500", "hover:bg-emerald-600");
        return true;
    } catch (error) {
        window.customAlert("Acceso Denegado", "Clave incorrecta. Trabajarás sin sincronización en la nube.", "bg-red-500", "hover:bg-red-600");
        return false;
    }
}

// Sincroniza los datos con Firebase usando Debounce (3 segundos)
export function syncToCloud(pData, indicadorCallback) {
    if (!auth.currentUser) return; // Freno de seguridad si está Offline

    clearTimeout(debounceTimer);
    
    if (indicadorCallback) indicadorCallback('syncing');

    debounceTimer = setTimeout(async () => {
        try {
            // Clon profundo para limpiar proxys o elementos de interfaz que no van a la BD
            const dataLimpia = JSON.parse(JSON.stringify(pData));
            dataLimpia.ultimaSincronizacion = new Date().toISOString();
            
            const docRef = doc(db, "presupuestos", dataLimpia.id);
            await setDoc(docRef, dataLimpia);
            
            if (indicadorCallback) indicadorCallback('synced');
        } catch (error) {
            console.error("Error sincronizando a Firebase:", error);
            if (indicadorCallback) indicadorCallback('error');
        }
    }, 3000);
}

// Rescata el documento más reciente si abrimos el sistema en otro computador
export async function descargarDesdeNube(id) {
    if (!auth.currentUser) return null;
    try {
        const docSnap = await getDoc(doc(db, "presupuestos", id));
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (e) {
        console.error("Error descargando de Firebase:", e);
    }
    return null;
}