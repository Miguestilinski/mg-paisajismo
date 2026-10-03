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

function pedirClaveYLogear() {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-login');
        const box = document.getElementById('modal-login-box');
        const inputClave = document.getElementById('login-password');
        const btnLogin = document.getElementById('btn-login');
        const btnOffline = document.getElementById('btn-offline');
        const lblError = document.getElementById('login-error-msg');
        const btnTogglePwd = document.getElementById('btn-toggle-password');
        const iconEye = document.getElementById('icon-eye');
        const iconEyeOff = document.getElementById('icon-eye-off');

        if (!modal) {
            // Si por alguna razón no está el modal en el DOM (ej. en editor.html), forzamos offline temporal
            resolve(false); 
            return;
        }

        const mostrarAlerta = (titulo, mensaje, colorBase, colorHover) => {
            if (typeof window.customAlert === 'function') window.customAlert(titulo, mensaje, colorBase, colorHover);
            else alert(titulo + ": " + mensaje);
        };

        const cleanup = () => {
            box.classList.remove('scale-100'); box.classList.add('scale-95');
            modal.classList.remove('opacity-100'); modal.classList.add('opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 200);
            btnLogin.removeEventListener('click', onLogin);
            btnOffline.removeEventListener('click', onOffline);
            inputClave.removeEventListener('keydown', onKey);
            if(btnTogglePwd) btnTogglePwd.removeEventListener('click', onTogglePwd);
            
            inputClave.value = '';
            inputClave.type = 'password';
            if(iconEye) iconEye.classList.remove('hidden');
            if(iconEyeOff) iconEyeOff.classList.add('hidden');
        };

        const onTogglePwd = () => {
            if (inputClave.type === 'password') {
                inputClave.type = 'text';
                iconEye.classList.add('hidden');
                iconEyeOff.classList.remove('hidden');
            } else {
                inputClave.type = 'password';
                iconEye.classList.remove('hidden');
                iconEyeOff.classList.add('hidden');
            }
        };

        const onLogin = async () => {
            const clave = inputClave.value.trim();
            if (!clave) {
                lblError.textContent = "Por favor, ingresa la clave.";
                lblError.classList.remove('hidden');
                return;
            }

            btnLogin.disabled = true;
            btnLogin.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Conectando...`;
            
            try {
                await signInWithEmailAndPassword(auth, EMAIL_MONI, clave);
                cleanup();
                mostrarAlerta("Conectado", "Sincronización activada correctamente.", "bg-emerald-500", "hover:bg-emerald-600");
                resolve(true);
            } catch (error) {
                console.error("Firebase Auth Error:", error.code);
                btnLogin.disabled = false;
                btnLogin.innerHTML = `Iniciar Sesión Seguro`;
                lblError.textContent = "Clave incorrecta. Inténtalo de nuevo.";
                lblError.classList.remove('hidden');
            }
        };

        const onOffline = () => {
            cleanup();
            mostrarAlerta("Modo Local", "Trabajarás de forma local. Recuerda que si el equipo falla, los datos no estarán en la nube.", "bg-amber-500", "hover:bg-amber-600");
            resolve(false);
        };

        const onKey = (e) => { if (e.key === 'Enter') onLogin(); };

        btnLogin.addEventListener('click', onLogin);
        btnOffline.addEventListener('click', onOffline);
        inputClave.addEventListener('keydown', onKey);
        if(btnTogglePwd) btnTogglePwd.addEventListener('click', onTogglePwd);

        lblError.classList.add('hidden');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0'); modal.classList.add('opacity-100');
            box.classList.remove('scale-95'); box.classList.add('scale-100');
            inputClave.focus();
        }, 10);
    });
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