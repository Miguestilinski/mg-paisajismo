// scripts/sync.js
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { app, db } from './firebase-config.js'; 

const auth = getAuth(app);

// Diccionario de usuarios permitidos
const USERS = {
    "moni": { email: "mg_paisajismo@hotmail.com", nombre: "Mónica" },
    "roberto": { email: "robertomunozg@hotmail.com", nombre: "Roberto" }
};

let debounceTimer;

// Inicializa la sesión. Si options.askForPassword es true, pide clave. Si es false, verifica silenciosamente.
export function initSync(options = { askForPassword: false }) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Inferir el nombre del usuario basado en el email logueado y guardarlo localmente
                const matchedUser = Object.values(USERS).find(u => u.email === user.email);
                if (matchedUser) {
                    localStorage.setItem('appUserName', matchedUser.nombre);
                }
                resolve(true); // Ya hay una cookie/sesión válida
            } else {
                if (options.askForPassword) {
                    const loggedIn = await pedirClaveYLogear();
                    resolve(loggedIn);
                } else {
                    resolve(false); // Estamos offline pero en silencio
                }
            }
        });
    });
}

function pedirClaveYLogear() {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-login');
        const box = document.getElementById('modal-login-box');
        const selectUsuario = document.getElementById('login-usuario');
        const inputClave = document.getElementById('login-password');
        const btnLogin = document.getElementById('btn-login');
        const btnOffline = document.getElementById('btn-offline');
        const lblError = document.getElementById('login-error-msg');
        const btnTogglePwd = document.getElementById('btn-toggle-password');
        const iconEye = document.getElementById('icon-eye');
        const iconEyeOff = document.getElementById('icon-eye-off');

        if (!modal || !selectUsuario) {
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
            const usuarioKey = selectUsuario.value;
            const clave = inputClave.value.trim();
            
            if (!clave) {
                lblError.textContent = "Por favor, ingresa tu clave.";
                lblError.classList.remove('hidden');
                return;
            }

            btnLogin.disabled = true;
            btnLogin.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Conectando...`;
            
            try {
                await signInWithEmailAndPassword(auth, USERS[usuarioKey].email, clave);
                localStorage.setItem('appUserName', USERS[usuarioKey].nombre);
                cleanup();
                mostrarAlerta("Conectado", "Sincronización activada correctamente.", "bg-emerald-500", "hover:bg-emerald-600");
                resolve(true);
            } catch (error) {
                console.error("Firebase Auth Error:", error.code);
                btnLogin.disabled = false;
                btnLogin.innerHTML = `Iniciar Sesión`;
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
    if (!auth.currentUser || !navigator.onLine) return; // Freno de seguridad si está sin sesión o sin internet

    clearTimeout(debounceTimer);
    
    if (indicadorCallback) indicadorCallback('syncing');

    debounceTimer = setTimeout(async () => {
        try {
            // Función auxiliar recursiva para eliminar 'historialVersiones' de cualquier parte del objeto
            const purgarHistorialRecursivo = (obj) => {
                if (Array.isArray(obj)) {
                    obj.forEach(item => purgarHistorialRecursivo(item));
                } else if (obj !== null && typeof obj === 'object') {
                    if ('historialVersiones' in obj) {
                        delete obj.historialVersiones;
                    }
                    Object.keys(obj).forEach(key => purgarHistorialRecursivo(obj[key]));
                }
            };

            // Clon profundo para limpiar proxys o elementos de interfaz que no van a la BD
            const dataLimpia = JSON.parse(JSON.stringify(pData));
            dataLimpia.ultimaSincronizacion = new Date().toISOString();
            
            // Filtramos cualquier elemento nulo (huecos) y todos los autoguardados previos para que Firebase reciba un array limpio
            dataLimpia.historialVersiones = (dataLimpia.historialVersiones || []).filter(v => v != null && v.etiqueta !== "Autoguardado en Nube");

            // Curamos el historial entero eliminando anidaciones infinitas
            purgarHistorialRecursivo(dataLimpia.historialVersiones);

            // Función auxiliar para comparar el estado actual con la última versión manual guardada
            const hayCambiosSinConfirmar = () => {
                if (dataLimpia.historialVersiones.length === 0) return true;
                const ultimaVersion = dataLimpia.historialVersiones[dataLimpia.historialVersiones.length - 1];
                
                const limpiarDataParaComparar = (data) => {
                    if (!data) return {};
                    const clean = {
                        cliente: data.cliente || {},
                        codigoProyecto: data.codigoProyecto || "",
                        encabezadoTexto: data.encabezadoTexto || "",
                        items: JSON.parse(JSON.stringify(data.items || [])),
                        totales: data.totales || {}
                    };
                    return JSON.stringify(clean);
                };
                return limpiarDataParaComparar(dataLimpia) !== limpiarDataParaComparar(ultimaVersion.snapshot);
            };

            // Si hay un borrador activo real, lo agregamos como un único nodo temporal al final
            if (hayCambiosSinConfirmar()) {
                const snapshotActual = JSON.parse(JSON.stringify(dataLimpia));
                // Eliminamos cualquier historial anidado del nuevo snapshot antes de subirlo
                purgarHistorialRecursivo(snapshotActual); 
                
                dataLimpia.historialVersiones.push({
                    versionId: `v_auto_${Date.now()}`,
                    fechaHora: new Date().toISOString(),
                    etiqueta: "Autoguardado en Nube",
                    autor: localStorage.getItem('appUserName') || 'Usuario',
                    snapshot: snapshotActual
                });
            }
            
            // Referencia a presupuestos/{id} en Realtime Database
            const dbRef = ref(db, 'presupuestos/' + dataLimpia.id);
            await set(dbRef, dataLimpia);
            
            if (indicadorCallback) indicadorCallback('synced');
        } catch (error) {
            console.error("Error sincronizando a Firebase RTDB:", error);
            if (indicadorCallback) indicadorCallback('error');
        }
    }, 3000);
}

// Rescata el documento más reciente si abrimos el sistema en otro computador
export async function descargarDesdeNube(id) {
    if (!auth.currentUser || !navigator.onLine) return null;
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `presupuestos/${id}`));
        if (snapshot.exists()) {
            return snapshot.val();
        }
    } catch (e) {
        console.error("Error descargando de Firebase RTDB:", e);
    }
    return null;
}

// Rescata TODOS los documentos (Para mantener sincronizada la página de inicio en todos los dispositivos)
export async function descargarTodosDesdeNube() {
    if (!auth.currentUser || !navigator.onLine) return null;
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `presupuestos`));
        if (snapshot.exists()) {
            return snapshot.val();
        }
    } catch (e) {
        console.error("Error descargando todos los presupuestos de Firebase RTDB:", e);
    }
    return null;
}

// Elimina un proyecto completamente de la nube
export async function borrarDeNube(id) {
    if (!auth.currentUser || !navigator.onLine) return;
    try {
        await set(ref(db, `presupuestos/${id}`), null);
    } catch (error) {
        console.error("Error borrando de Firebase:", error);
    }
}