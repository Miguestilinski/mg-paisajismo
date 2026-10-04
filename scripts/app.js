import { db as nubeDB } from './firebase-config.js';
import { localDB } from './db.js';
import { initSync } from './sync.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    // SISTEMA DE MODALES CUSTOM
    // ==========================================
    window.customAlert = function(title, message, okColorBase = "bg-zinc-800", okColorHover = "hover:bg-zinc-900") {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-alert');
            const box = document.getElementById('modal-alert-box');
            const btnOk = document.getElementById('btn-modal-alert-ok');

            if (!modal) {
                alert(title + ": " + message);
                resolve();
                return;
            }

            document.getElementById('modal-alert-title').textContent = title;
            document.getElementById('modal-alert-message').innerHTML = message;
            
            btnOk.className = `px-5 py-2 rounded-lg font-bold text-white transition-colors shadow-sm ${okColorBase} ${okColorHover}`;

            const cleanup = () => {
                box.classList.remove('scale-100'); box.classList.add('scale-95');
                modal.classList.remove('opacity-100'); modal.classList.add('opacity-0');
                setTimeout(() => modal.classList.add('hidden'), 200);
                btnOk.removeEventListener('click', onOk);
            };

            const onOk = () => { cleanup(); resolve(); };
            btnOk.addEventListener('click', onOk);

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0'); modal.classList.add('opacity-100');
                box.classList.remove('scale-95'); box.classList.add('scale-100');
            }, 10);
        });
    };

    window.customConfirm = function(title, message, okText = "Aceptar", okColorBase = "bg-red-500", okColorHover = "hover:bg-red-600") {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-confirm');
            const box = document.getElementById('modal-confirm-box');
            const btnOk = document.getElementById('btn-modal-confirm-ok');
            const btnCancel = document.getElementById('btn-modal-confirm-cancel');

            document.getElementById('modal-confirm-title').textContent = title;
            document.getElementById('modal-confirm-message').innerHTML = message;
            
            btnOk.textContent = okText;
            btnOk.className = `px-4 py-2 rounded-lg font-bold text-white transition-colors shadow-sm ${okColorBase} ${okColorHover}`;

            const cleanup = () => {
                box.classList.remove('scale-100'); box.classList.add('scale-95');
                modal.classList.remove('opacity-100'); modal.classList.add('opacity-0');
                setTimeout(() => modal.classList.add('hidden'), 200);
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
            };

            const onOk = () => { cleanup(); resolve(true); };
            const onCancel = () => { cleanup(); resolve(false); };

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0'); modal.classList.add('opacity-100');
                box.classList.remove('scale-95'); box.classList.add('scale-100');
            }, 10);
        });
    };

    window.customPrompt = function(title, message, placeholder, defaultValue = "") {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-prompt');
            const box = document.getElementById('modal-prompt-box');
            const input = document.getElementById('modal-prompt-input');
            const btnOk = document.getElementById('btn-modal-prompt-ok');
            const btnCancel = document.getElementById('btn-modal-prompt-cancel');

            document.getElementById('modal-prompt-title').textContent = title;
            document.getElementById('modal-prompt-message').textContent = message;
            input.placeholder = placeholder;
            input.value = defaultValue;

            const cleanup = () => {
                box.classList.remove('scale-100'); box.classList.add('scale-95');
                modal.classList.remove('opacity-100'); modal.classList.add('opacity-0');
                setTimeout(() => modal.classList.add('hidden'), 200);
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
                input.removeEventListener('keydown', onKey);
            };

            const onOk = () => { cleanup(); resolve(input.value.trim()); };
            const onCancel = () => { cleanup(); resolve(null); };
            const onKey = (e) => { if (e.key === 'Enter') onOk(); if (e.key === 'Escape') onCancel(); };

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);
            input.addEventListener('keydown', onKey);

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0'); modal.classList.add('opacity-100');
                box.classList.remove('scale-95'); box.classList.add('scale-100');
                input.focus();
                input.select();
            }, 10);
        });
    };

    // Inicializar sincronización en la página principal tras cargar los modales (Pide clave si no hay sesión)
    await initSync({ askForPassword: true });

    const btnNuevo = document.getElementById('btn-nuevo-presupuesto');
    const btnToggleEdicionGlobal = document.getElementById('btn-toggle-edicion-global');
    const inputFiltroTexto = document.getElementById('filtro-texto');
    const inputFiltroFecha = document.getElementById('filtro-fecha');
    const btnLimpiarFecha = document.getElementById('btn-limpiar-fecha');
    const contadorResultados = document.getElementById('contador-resultados');
    
    let isGlobalEditMode = false;
    let presupuestosMemoria = []; 
    let filtroTexto = "";
    let filtroRangoFechas = []; // [DateStart, DateEnd]

    // Inicializar Flatpickr en modo Rango
    const fpFiltro = flatpickr(inputFiltroFecha, {
        mode: "range",
        locale: "es",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M", 
        allowInput: false,
        onChange: function(selectedDates) {
            // Flatpickr envía 1 fecha cuando inicia la selección, y 2 cuando la termina.
            if (selectedDates.length === 2) {
                filtroRangoFechas = selectedDates;
                btnLimpiarFecha.classList.remove('hidden');
                renderizarTablaFiltrada();
            } else if (selectedDates.length === 0) {
                filtroRangoFechas = [];
                btnLimpiarFecha.classList.add('hidden');
                renderizarTablaFiltrada();
            }
        }
    });

    btnLimpiarFecha.addEventListener('click', () => {
        fpFiltro.clear();
        filtroRangoFechas = [];
        btnLimpiarFecha.classList.add('hidden');
        renderizarTablaFiltrada();
    });

    inputFiltroTexto.addEventListener('input', (e) => {
        filtroTexto = e.target.value.toLowerCase();
        renderizarTablaFiltrada();
    });

    btnToggleEdicionGlobal.addEventListener('click', () => {
        isGlobalEditMode = !isGlobalEditMode;
        if (isGlobalEditMode) {
            btnToggleEdicionGlobal.classList.add('bg-blue-50', 'text-blue-600', 'border-blue-200');
            btnToggleEdicionGlobal.classList.remove('bg-white', 'text-zinc-600', 'border-zinc-200');
        } else {
            btnToggleEdicionGlobal.classList.remove('bg-blue-50', 'text-blue-600', 'border-blue-200');
            btnToggleEdicionGlobal.classList.add('bg-white', 'text-zinc-600', 'border-zinc-200');
        }
        cargarPresupuestos(); // Recarga la tabla con el nuevo modo
    });

    btnNuevo.addEventListener('click', async () => {
        const presupuestoActualId = `presupuesto_${Date.now()}`;
        const nuevoPresupuesto = {
            id: presupuestoActualId,
            codigoProyecto: "Nuevo Proyecto",
            fechaCreacion: new Date().toISOString(),
            fechaModificacion: new Date().toISOString(),
            cliente: { destinatario: "", constructora: "", ubicacion: "" },
            encabezadoTexto: "Según lo solicitado por Uds., referente al presupuesto de paisajismo y riego...",
            items: [],
            totales: { costoDirectoTotal: 0, gastosGeneralesMonto: 0, utilidadManual: 0, totalNeto: 0 },
            historialVersiones: []
        };

        // Guardamos en la base local (Dexie)
        await localDB.presupuestos.put(nuevoPresupuesto);
        
        // Redirigir a la página del editor pasando el ID
        window.location.href = `editor.html?id=${presupuestoActualId}`;
    });

    // Carga inicial y auto-limpieza
    async function cargarPresupuestos() {
        const presupuestosRaw = await localDB.presupuestos.toArray();
        const presupuestosValidos = [];
        
        // --- GARBAGE COLLECTION ---
        for (const p of presupuestosRaw) {
            const isVacio = (!p.cliente?.destinatario && 
                             !p.cliente?.constructora && 
                             (!p.codigoProyecto || p.codigoProyecto === "Nuevo Proyecto") && 
                             (!p.items || p.items.length === 0));
            
            if (isVacio) {
                await localDB.presupuestos.delete(p.id);
            } else {
                presupuestosValidos.push(p);
            }
        }

        // Ordenamos por modificación (Más recientes arriba)
        presupuestosMemoria = presupuestosValidos.sort((a, b) => new Date(b.fechaModificacion) - new Date(a.fechaModificacion));
        renderizarTablaFiltrada();
    }

    // Renderizar la tabla aplicando filtros
    function renderizarTablaFiltrada() {
        const lista = document.getElementById('lista-presupuestos');
        lista.innerHTML = ''; 

        // Filtrado
        const presupuestosFiltrados = presupuestosMemoria.filter(p => {
            // Filtro Texto
            const matchTexto = !filtroTexto || 
                (p.codigoProyecto && p.codigoProyecto.toLowerCase().includes(filtroTexto)) || 
                (p.cliente?.constructora && p.cliente.constructora.toLowerCase().includes(filtroTexto));
            
            // Filtro Rango de Fecha
            let matchFecha = true;
            if (filtroRangoFechas.length === 2) {
                const fMod = new Date(p.fechaModificacion);
                // Reseteamos las horas para una comparación limpia por día
                fMod.setHours(0,0,0,0);
                const start = new Date(filtroRangoFechas[0]); start.setHours(0,0,0,0);
                const end = new Date(filtroRangoFechas[1]); end.setHours(23,59,59,999);
                
                matchFecha = fMod >= start && fMod <= end;
            }

            return matchTexto && matchFecha;
        });

        // Actualizar contador
        contadorResultados.textContent = `Mostrando ${presupuestosFiltrados.length} resultado${presupuestosFiltrados.length !== 1 ? 's' : ''}`;

        if (presupuestosFiltrados.length === 0) {
            lista.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-zinc-500 font-medium">No se encontraron proyectos.</td></tr>`;
            return;
        }

        onst formatCLP = (num) => new Intl.NumberFormat('es-CL').format(Math.round(num));
        const formatFecha = (isoString) => {
            const date = new Date(isoString);
            const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            return `${date.getDate()} ${meses[date.getMonth()]}${date.getFullYear()}`;
        };

        const stringifyParaComparar = (data) => {
            if (!data) return "{}";
            const clean = {
                cliente: data.cliente || {},
                codigoProyecto: data.codigoProyecto || "",
                encabezadoTexto: data.encabezadoTexto || "",
                items: JSON.parse(JSON.stringify(data.items || [])),
                totales: data.totales || {}
            };
            clean.items.forEach(cat => {
                if (!cat.modo) cat.modo = (cat.subitems && cat.subitems.length > 0) ? 'compuesto' : 'simple';
                if (!cat.subitems) cat.subitems = [];
                if (!cat.elementos) cat.elementos = [];
            });
            return JSON.stringify(clean);
        };

        presupuestosFiltrados.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `hover:bg-zinc-50/80 transition-colors group border-b border-zinc-100 ${!isGlobalEditMode ? 'cursor-pointer' : ''}`;

            // Determinar el Estado de Sincronización
            let estadoUI = '';
            const isVacio = (!p.cliente?.destinatario && !p.cliente?.constructora && p.items.length === 0);
            
            if (isVacio) {
                estadoUI = `<span class="bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm border border-zinc-200"><span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> Vacío</span>`;
            } else {
                const arrVersiones = (p.historialVersiones || []).filter(v => v != null);
                const versionesReales = arrVersiones.filter(v => v.etiqueta !== "Autoguardado en Nube");
                
                // Tiene versiones guardadas manualmente
                if (versionesReales.length > 0) {
                    const ultimaVersionManual = versionesReales[versionesReales.length - 1];
                    const diffManual = stringifyParaComparar(p) !== stringifyParaComparar(ultimaVersionManual.snapshot);
                    
                    if (diffManual) {
                        // Hay cambios sin guardar manualmente (Fantasma). Verificamos si al menos el fantasma subió a la nube.
                        const lastSyncTime = p.ultimaSincronizacion ? new Date(p.ultimaSincronizacion).getTime() : 0;
                        const lastModTime = p.fechaModificacion ? new Date(p.fechaModificacion).getTime() : 0;
                        
                        // Si la última sincronización es muy reciente respecto a la modificación (margen de 5 segs por el debounce), asumimos que el fantasma está en la nube.
                        if (lastSyncTime > 0 && (lastModTime - lastSyncTime < 5000)) {
                             estadoUI = `<span class="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm border border-zinc-200"><span class="w-1.5 h-1.5 rounded-full bg-zinc-500"></span> Borrador en Nube</span>`;
                        } else {
                             estadoUI = `<span class="bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm border border-zinc-200"><span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> Borrador Local</span>`;
                        }
                    } else {
                        // El borrador local es idéntico al último guardado manual. Verificamos si ese guardado llegó a la nube.
                        const lastSyncTime = p.ultimaSincronizacion ? new Date(p.ultimaSincronizacion).getTime() : 0;
                        const versionManualTime = new Date(ultimaVersionManual.fechaHora).getTime();
                        
                        if (lastSyncTime >= versionManualTime) {
                            estadoUI = `<span class="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm border border-blue-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg> Sincronizado</span>`;
                        } else {
                            estadoUI = `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Guardado Local</span>`;
                        }
                    }
                } else {
                    // No hay versiones manuales aún, pero tiene datos.
                    estadoUI = `<span class="bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm border border-zinc-200"><span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> Borrador Local</span>`;
                }
            }

            const nombreProyecto = p.codigoProyecto && p.codigoProyecto !== "Nuevo Proyecto" ? p.codigoProyecto : "Proyecto sin nombre";
            const nombreConstructora = p.cliente?.constructora || 'Sin constructora especificada';
            const totalNeto = p.totales?.totalNeto || 0;

            tr.innerHTML = `
                <td class="p-5 text-zinc-500 text-sm whitespace-nowrap align-middle">${formatFecha(p.fechaModificacion)}</td>
                <td class="p-5 align-middle">
                    <div class="flex items-center gap-3 mb-0.5">
                        <span class="font-bold text-zinc-900 text-base truncate max-w-[280px]" title="${nombreProyecto}">${nombreProyecto}</span>
                        <div class="flex items-center gap-1.5">
                            ${estadoUI}
                        </div>
                    </div>
                    <div class="text-sm text-zinc-500 font-normal truncate max-w-sm">${nombreConstructora}</div>
                </td>
                <td class="p-5 font-extrabold text-zinc-800 whitespace-nowrap align-middle">$${formatCLP(totalNeto)}</td>
                <td class="p-5 text-right whitespace-nowrap align-middle w-48">
                    ${!isGlobalEditMode ? `
                        <div class="flex items-center justify-end w-full gap-1 text-zinc-400 group-hover:text-zinc-900 font-bold transition-colors">
                            Abrir
                            <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                    ` : `
                        <div class="flex items-center justify-end gap-3">
                            <button class="btn-editar-nombre text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-colors p-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium" data-id="${p.id}" data-nombre="${nombreProyecto}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                Editar
                            </button>
                            <button class="btn-eliminar-proyecto text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors p-1.5 rounded-md" data-id="${p.id}" data-nombre="${nombreProyecto}" title="Eliminar proyecto">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    `}
                </td>
            `;

            tr.addEventListener('click', (e) => {
                if (isGlobalEditMode) return;
                if (e.target.closest('button')) return;
                window.location.href = `editor.html?id=${p.id}`;
            });

            lista.appendChild(tr);
        });

        // Lógica para GUARDAR NOMBRE usando el Modal Custom
        document.querySelectorAll('.btn-editar-nombre').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Evita que se abra el proyecto
                const id = btn.dataset.id;
                const nombreActual = btn.dataset.nombre;
                
                const nuevoNombre = await window.customPrompt(
                    "Renombrar Proyecto", 
                    "Modifica el nombre con el que identificarás este presupuesto:", 
                    "Ej: Edificio Rivas Vicuña",
                    nombreActual === "Proyecto sin nombre" ? "" : nombreActual
                );

                if (nuevoNombre !== null && nuevoNombre.trim() !== "") {
                    const presupuesto = await localDB.presupuestos.get(id);
                    if (presupuesto) {
                        presupuesto.codigoProyecto = nuevoNombre.trim();
                        presupuesto.fechaModificacion = new Date().toISOString();
                        await localDB.presupuestos.put(presupuesto);
                        cargarPresupuestos(); // Recargar tabla
                    }
                }
            });
        });

        // Lógica para ELIMINAR PROYECTO usando el Modal Custom
        document.querySelectorAll('.btn-eliminar-proyecto').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Evita que se abra el proyecto
                const id = btn.dataset.id;
                const nombre = btn.dataset.nombre;
                
                const confirmado = await window.customConfirm(
                    "Eliminar Presupuesto", 
                    `¿Estás segura de que deseas eliminar permanentemente <b>"${nombre}"</b>?<br><br>Esta acción no se puede deshacer.`,
                    "Sí, eliminar",
                    "bg-red-500",
                    "hover:bg-red-600"
                );

                if (confirmado) {
                    await localDB.presupuestos.delete(id);
                    cargarPresupuestos(); // Recargar tabla
                }
            });
        });
    }

    // Inicializar la tabla al cargar la página
    cargarPresupuestos();
});