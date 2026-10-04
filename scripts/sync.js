// scripts/sync.js
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { app, db } from './firebase-config.js'; 

const auth = getAuth(app);

// Diccionario de usuarios permitidos
const USERS = {
    "moni": { email: "mg_paisajismo@hotmail.com", nombre: "Mónica" },
    "roberto": { email: "robertomunozg@hotmail.cl", nombre: "Roberto" }
};

let debounceTimer;

// Inicializa la sesión de forma estricta. Si forceLogin es true (en index) o si no hay sesión iniciada (en editor), bloquea el paso.
export function initSync(forceLogin = false) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const matchedUser = Object.values(USERS).find(u => u.email === user.email);
                if (matchedUser) {
                    localStorage.setItem('appUserName', matchedUser.nombre);
                }
                resolve(true); // Hay una sesión válida (online o cacheada offline en IndexedDB)
            } else {
                if (forceLogin) {
                    const loggedIn = await pedirClaveYLogear();
                    resolve(loggedIn);
                } else {
                    window.location.href = 'index.html'; // Expulsar al usuario al index para que inicie sesión
                    resolve(false); 
                }
            }
        });
    });
}

function pedirClaveYLogear() {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-login');
        const box = document.getElementById('modal-login-box');
        const inputUsuario = document.getElementById('login-usuario');
        const loginMoni = document.getElementById('login-moni');
        const loginRoberto = document.getElementById('login-roberto');
        const inputClave = document.getElementById('login-password');
        const btnLogin = document.getElementById('btn-login');
        const lblError = document.getElementById('login-error-msg');
        const btnTogglePwd = document.getElementById('btn-toggle-password');
        const iconEye = document.getElementById('icon-eye');
        const iconEyeOff = document.getElementById('icon-eye-off');

        if (!modal || !inputUsuario) {
            resolve(false); 
            return;
        }

        // Lógica visual de los botones de selección de usuario (Radio cards)
        if (loginMoni && loginRoberto) {
            const setActive = (activeBtn, inactiveBtn, val) => {
                inputUsuario.value = val;
                activeBtn.classList.replace('border-zinc-200', 'border-blue-500');
                activeBtn.classList.replace('bg-zinc-50', 'bg-blue-50');
                activeBtn.classList.replace('text-zinc-600', 'text-blue-700');
                inactiveBtn.classList.replace('border-blue-500', 'border-zinc-200');
                inactiveBtn.classList.replace('bg-blue-50', 'bg-zinc-50');
                inactiveBtn.classList.replace('text-blue-700', 'text-zinc-600');
            };
            loginMoni.addEventListener('click', () => setActive(loginMoni, loginRoberto, 'moni'));
            loginRoberto.addEventListener('click', () => setActive(loginRoberto, loginMoni, 'roberto'));
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
            const usuarioKey = inputUsuario.value;
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
                mostrarAlerta("Conectado", "Sesión iniciada correctamente.", "bg-emerald-500", "hover:bg-emerald-600");
                resolve(true);
            } catch (error) {
                console.error("Firebase Auth Error:", error.code);
                btnLogin.disabled = false;
                btnLogin.innerHTML = `Iniciar Sesión`;
                lblError.textContent = "Clave incorrecta. Inténtalo de nuevo.";
                lblError.classList.remove('hidden');
            }
        };

        const onKey = (e) => { if (e.key === 'Enter') onLogin(); };

        btnLogin.addEventListener('click', onLogin);
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