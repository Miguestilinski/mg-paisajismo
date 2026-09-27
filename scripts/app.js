import { db as nubeDB } from './firebase-config.js';
import { localDB } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // SISTEMA DE MODALES CUSTOM
    // ==========================================
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

    const btnNuevo = document.getElementById('btn-nuevo-presupuesto');
    const btnToggleEdicionGlobal = document.getElementById('btn-toggle-edicion-global');
    const inputFiltroTexto = document.getElementById('filtro-texto');
    const inputFiltroFecha = document.getElementById('filtro-fecha');
    const btnLimpiarFecha = document.getElementById('btn-limpiar-fecha');
    const contadorResultados = document.getElementById('contador-resultados');
    
    let isGlobalEditMode = false;
    let presupuestosMemoria = []; // Aquí guardaremos los presupuestos válidos tras la limpieza
    let filtroTexto = "";
    let filtroFechaSeleccionada = null; // Guardará el objeto Date si se selecciona

    // Inicializar Flatpickr para el filtro de fechas
    const fpFiltro = flatpickr(inputFiltroFecha, {
        locale: "es",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y", 
        allowInput: false,
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                filtroFechaSeleccionada = selectedDates[0];
                btnLimpiarFecha.classList.remove('hidden');
            } else {
                filtroFechaSeleccionada = null;
                btnLimpiarFecha.classList.add('hidden');
            }
            renderizarTablaFiltrada();
        }
    });

    btnLimpiarFecha.addEventListener('click', () => {
        fpFiltro.clear();
        filtroFechaSeleccionada = null;
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
            
            // Filtro Fecha (Compara ignorando la hora)
            let matchFecha = true;
            if (filtroFechaSeleccionada) {
                const fMod = new Date(p.fechaModificacion);
                matchFecha = fMod.getFullYear() === filtroFechaSeleccionada.getFullYear() &&
                             fMod.getMonth() === filtroFechaSeleccionada.getMonth() &&
                             fMod.getDate() === filtroFechaSeleccionada.getDate();
            }

            return matchTexto && matchFecha;
        });

        // Actualizar contador
        contadorResultados.textContent = `Mostrando ${presupuestosFiltrados.length} resultado${presupuestosFiltrados.length !== 1 ? 's' : ''}`;

        if (presupuestosFiltrados.length === 0) {
            lista.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-zinc-500 font-medium">No se encontraron proyectos.</td></tr>`;
            return;
        }

        const formatCLP = (num) => new Intl.NumberFormat('es-CL').format(Math.round(num));
        const formatFecha = (isoString) => {
            const date = new Date(isoString);
            const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
        };

        presupuestosFiltrados.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `hover:bg-zinc-50/80 transition-colors group border-b border-zinc-100 ${!isGlobalEditMode ? 'cursor-pointer' : ''}`;

            const badgeLocal = `<span class="bg-zinc-200 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg> Local</span>`;
            const badgeNube = p.cloudId ? `<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg> Nube</span>` : '';

            const nombreProyecto = p.codigoProyecto && p.codigoProyecto !== "Nuevo Proyecto" ? p.codigoProyecto : "Proyecto sin nombre";
            const nombreConstructora = p.cliente?.constructora || 'Sin constructora especificada';
            const totalNeto = p.totales?.totalNeto || 0;

            tr.innerHTML = `
                <td class="p-5 text-zinc-500 text-sm whitespace-nowrap align-middle">${formatFecha(p.fechaModificacion)}</td>
                <td class="p-5 align-middle">
                    <div class="flex items-center gap-3 mb-0.5">
                        <span class="font-bold text-zinc-900 text-base truncate max-w-[280px]" title="${nombreProyecto}">${nombreProyecto}</span>
                        <div class="flex items-center gap-1.5">
                            ${badgeLocal}
                            ${badgeNube}
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