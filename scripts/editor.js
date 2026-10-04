// scripts/editor/core.js

import { localDB } from './db.js';
import { renderizarRioVersiones } from './versions.js';
import { setupImport } from './importar.js';
import { setupModals } from './modals.js';
import { renderItemsHTML, formatCLP, parseCLP } from './editor-render.js';
import { initSync, syncToCloud, descargarDesdeNube } from './sync.js';
import { exportarPDF } from './exportar.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validar ID de Presupuesto
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    // 2. Inicializar Modales Custom
    setupModals();

    // 3. Variables Globales, Estado y Conexión Nube
    let pDataLocal = await localDB.presupuestos.get(id) || null;

    // Conexión silenciosa: Verifica si ya hay sesión pero NO pide clave
    const isOnline = await initSync({ askForPassword: false });
    
    let pDataNube = null;
    if (isOnline) {
        pDataNube = await descargarDesdeNube(id);
    }

    // Resolutor de conflictos: Gana la versión más reciente
    let pData = { id: id };
    if (pDataNube && (!pDataLocal || new Date(pDataNube.ultimaSincronizacion) > new Date(pDataLocal.fechaModificacion || 0))) {
        pData = pDataNube;
        await localDB.presupuestos.put(pData);
    } else if (pDataLocal) {
        pData = pDataLocal;
    }

    if (!pData.items) pData.items = [];
    if (!pData.cliente) pData.cliente = {};
    
    // Limpiamos historialVersiones de elementos nulos o defectuosos que provengan de la nube
    pData.historialVersiones = (pData.historialVersiones || []).filter(v => v != null);

    // MIGRACIÓN ESTRUCTURAL INVISIBLE (Convierte datos viejos a la nueva nomenclatura)
    pData.items.forEach(cat => {
        if (cat.subitems && cat.subitems.length > 0 && !cat.elementos && (!cat.modo || cat.modo === 'simple')) {
            cat.elementos = cat.subitems;
            delete cat.subitems;
        }
        if (cat.subgrupos) {
            cat.subitems = cat.subgrupos;
            delete cat.subgrupos;
        }
        if (!cat.elementos) cat.elementos = [];
        if (!cat.subitems) cat.subitems = [];
        
        cat.subitems.forEach(sub => {
            if (sub.subitems && sub.subitems.length > 0 && !sub.elementos) {
                sub.elementos = sub.subitems;
                delete sub.subitems;
            }
            if (!sub.elementos) sub.elementos = [];
            if (sub.tituloSubgrupo) {
                sub.titulo = sub.tituloSubgrupo;
                delete sub.tituloSubgrupo;
            }
        });
    });

    let isEditMode = false; 
    let timeoutGuardado = null;

    // Referencias UI Principales
    const inputDestinatario = document.getElementById('destinatario-input');
    const inputConstructora = document.getElementById('constructora-input');
    const inputProyecto = document.getElementById('proyecto-input');
    const introTexto = document.getElementById('intro-texto');
    const inputUtilidad = document.getElementById('input-utilidad');
    const lblSaludoNombre = document.getElementById('saludo-nombre');
    const btnImprimir = document.getElementById('btn-imprimir');
    const inputFecha = document.getElementById('fecha-input');
    const txtFechaImpresa = document.getElementById('fecha-impresa');
    const btnFechaHoy = document.getElementById('btn-fecha-hoy');
    const itemsContainer = document.getElementById('items-container');

    // ==========================================
    // LÓGICA DE FECHAS (FLATPICKR)
    // ==========================================
    const fp = flatpickr(inputFecha, {
        locale: "es",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d \\de F \\de Y",
        allowInput: false,
        onChange: function(selectedDates, dateStr) {
            pData.cliente.fecha = dateStr;
            actualizarFechaImpresa(dateStr);
            localDB.presupuestos.put(pData);
        }
    });

    function setFechaHoy(conAnimacion = false) {
        const hoy = new Date();
        fp.setDate(hoy, true); 
        
        if (conAnimacion) {
            const originalText = btnFechaHoy.innerHTML;
            btnFechaHoy.innerHTML = '<svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> ¡Actualizado!';
            btnFechaHoy.classList.add('bg-emerald-100', 'text-emerald-700', 'border-emerald-300');
            btnFechaHoy.classList.remove('bg-zinc-100', 'text-zinc-600', 'border-zinc-200');
            
            setTimeout(() => {
                btnFechaHoy.innerHTML = originalText;
                btnFechaHoy.classList.remove('bg-emerald-100', 'text-emerald-700', 'border-emerald-300');
                btnFechaHoy.classList.add('bg-zinc-100', 'text-zinc-600', 'border-zinc-200');
            }, 2000);
        }
    }

    function actualizarFechaImpresa(dateStr) {
        if (!dateStr) return;
        const [year, month, day] = dateStr.split('-');
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        txtFechaImpresa.textContent = `Santiago, ${parseInt(day)} de ${meses[parseInt(month) - 1]} ${year}`;
    }

    btnFechaHoy.addEventListener('click', () => {
        setFechaHoy(true);
        pData.fechaModificacion = new Date().toISOString();
        guardarYRenderizar();
    });

    // ==========================================
    // INICIALIZACIÓN DE LA UI
    // ==========================================
    if (pData.cliente) {
        inputDestinatario.value = pData.cliente.destinatario || '';
        inputConstructora.value = pData.cliente.constructora || '';
        lblSaludoNombre.textContent = pData.cliente.destinatario || '[Nombre]';
    }
    
    inputProyecto.value = pData.codigoProyecto || '';
    introTexto.value = pData.encabezadoTexto || '';
    if(pData.totales && pData.totales.utilidadManual > 0) {
        inputUtilidad.value = formatCLP(pData.totales.utilidadManual);
    }

    if (!pData.cliente.fecha) {
        setFechaHoy(false);
    } else {
        fp.setDate(pData.cliente.fecha, false);
        actualizarFechaImpresa(pData.cliente.fecha);
    }

    // Auto-ajuste de textarea inicial
    const autoResizeTextarea = function() {
        this.style.height = 'auto'; 
        this.style.height = this.scrollHeight + 'px';
    };
    introTexto.addEventListener('input', autoResizeTextarea);
    setTimeout(() => autoResizeTextarea.call(introTexto), 0);

    // Toggle Historial Panel
    const btnToggleHistorial = document.getElementById('btn-toggle-historial');
    const btnCerrarHistorialMovil = document.getElementById('btn-cerrar-historial-movil');
    const panelHistorial = document.getElementById('panel-historial');
    
    let historialVisible = localStorage.getItem('historialVisible');
    historialVisible = historialVisible !== null ? JSON.parse(historialVisible) : true;

    // En pantallas pequeñas, forzamos que inicie cerrado para no bloquear la pantalla
    if (window.innerWidth < 768) {
        historialVisible = false;
    }

    const aplicarEstadoHistorial = (sinAnimacion = false) => {
        if (sinAnimacion) panelHistorial.classList.add('duration-0');
        
        if (historialVisible) {
            panelHistorial.classList.remove('w-0', 'border-0', 'opacity-0', 'pointer-events-none');
            panelHistorial.classList.add('w-80', 'border-l');
        } else {
            panelHistorial.classList.add('w-0', 'border-0', 'opacity-0', 'pointer-events-none');
            panelHistorial.classList.remove('w-80', 'border-l');
        }
        
        if (sinAnimacion) setTimeout(() => panelHistorial.classList.remove('duration-0'), 100);
    };

    aplicarEstadoHistorial(true);

    const toggleHistorial = () => {
        historialVisible = !historialVisible;
        localStorage.setItem('historialVisible', JSON.stringify(historialVisible));
        aplicarEstadoHistorial();
    };

    btnToggleHistorial.addEventListener('click', toggleHistorial);
    if (btnCerrarHistorialMovil) btnCerrarHistorialMovil.addEventListener('click', toggleHistorial);

    // ==========================================
    // MOTOR DE GUARDADO Y SEMÁFORO
    // ==========================================
    const semaforoUI = document.getElementById('semaforo-guardado');
    const semaforoDot = semaforoUI.querySelector('.indicator-dot');
    const semaforoText = semaforoUI.querySelector('.indicator-text');

    function indicarGuardando() {
        semaforoUI.className = "flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-zinc-200 text-xs font-medium text-amber-500 transition-colors duration-300";
        semaforoDot.className = "w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] indicator-dot animate-pulse";
        semaforoText.textContent = "Guardando...";
    }

    function indicarGuardadoOK() {
        semaforoUI.className = "flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-zinc-200 text-xs font-medium text-zinc-600 transition-colors duration-300";
        semaforoDot.className = "w-2 h-2 rounded-full bg-zinc-500 indicator-dot";
        semaforoText.textContent = "Guardado local";
    }

    function indicarSinDatos() {
        semaforoUI.className = "flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-zinc-200 text-xs font-medium text-zinc-400 transition-colors duration-300";
        semaforoDot.className = "w-2 h-2 rounded-full bg-zinc-300 indicator-dot";
        semaforoText.textContent = "Sin datos";
    }

    function indicarSincronizando() {
        semaforoUI.className = "flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-blue-200 text-xs font-medium text-blue-600 transition-colors duration-300";
        semaforoDot.className = "w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] indicator-dot animate-pulse";
        semaforoText.textContent = "Respaldando";
    }

    function indicarSincronizadoOK() {
        semaforoUI.className = "flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-emerald-200 text-xs font-medium text-emerald-600 transition-colors duration-300";
        semaforoDot.className = "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] indicator-dot";
        semaforoText.textContent = "Guardado en nube";
    }

    const manejadorSyncUI = (estado) => {
        if (estado === 'syncing') indicarSincronizando();
        if (estado === 'synced') setTimeout(indicarSincronizadoOK, 500); // Pequeño delay visual para que no salte brusco
    };

    function isHojaVacia() {
        return (!pData.cliente?.destinatario && 
                !pData.cliente?.constructora && 
                (!pData.codigoProyecto || pData.codigoProyecto === "Nuevo Proyecto") && 
                pData.items.length === 0);
    }

    function hayCambiosSinConfirmar() {
        if (isHojaVacia()) return false; 
        
        // Filtramos para asegurarnos de comparar contra la última versión que NO sea un autoguardado de la nube
        const versionesReales = (pData.historialVersiones || []).filter(v => v.etiqueta !== "Autoguardado en Nube");
        if (versionesReales.length === 0) return true;
        
        const ultimaVersion = versionesReales[versionesReales.length - 1];
        
        const limpiarDataParaComparar = (data) => {
            if (!data) return {};
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

        return limpiarDataParaComparar(pData) !== limpiarDataParaComparar(ultimaVersion.snapshot);
    }

    function recalcularTotales() {
        let costoDirectoTotal = 0;

        pData.items.forEach(cat => {
            if (!cat.modo) cat.modo = (cat.subitems && cat.subitems.length > 0) ? 'compuesto' : 'simple';
            if (!cat.subitems) cat.subitems = [];
            if (!cat.elementos) cat.elementos = [];
            
            let catSubtotal = 0;
            
            if (cat.modo === 'simple') {
                cat.elementos.forEach(art => {
                    const cant = parseFloat(art.cantidad) || 0;
                    const precio = parseFloat(art.precioUnitario) || 0;
                    art.precioTotal = cant * precio;
                    catSubtotal += art.precioTotal;
                });
            } else {
                cat.subitems.forEach(sub => {
                    let subTotal = 0;
                    if (!sub.elementos) sub.elementos = [];
                    sub.elementos.forEach(art => {
                        const cant = parseFloat(art.cantidad) || 0;
                        const precio = parseFloat(art.precioUnitario) || 0;
                        art.precioTotal = cant * precio;
                        subTotal += art.precioTotal;
                    });
                    sub.subtotal = subTotal;
                    catSubtotal += subTotal;
                });
            }
            
            cat.subtotal = catSubtotal;
            costoDirectoTotal += catSubtotal;
        });

        pData.totales.costoDirectoTotal = costoDirectoTotal;
        pData.totales.gastosGeneralesMonto = costoDirectoTotal * 0.10; 
        
        const utilidadIngresada = parseCLP(inputUtilidad.value);
        pData.totales.utilidadManual = utilidadIngresada;
        pData.totales.totalNeto = costoDirectoTotal + pData.totales.gastosGeneralesMonto + utilidadIngresada;

        const utilidadSugeridaRedondeada = Math.round(pData.totales.gastosGeneralesMonto / 1000000) * 1000000;

        document.getElementById('lbl-costo-directo').textContent = `$${formatCLP(pData.totales.costoDirectoTotal)}`;
        document.getElementById('lbl-gastos-generales').textContent = `$${formatCLP(pData.totales.gastosGeneralesMonto)}`;
        document.getElementById('lbl-sugerencia-utilidad').textContent = `$${formatCLP(utilidadSugeridaRedondeada)}`;
        document.getElementById('lbl-total-neto').textContent = `$${formatCLP(pData.totales.totalNeto)}`;
    }

    async function guardarYRenderizar() {
        const vacia = isHojaVacia();
        if (!vacia) indicarGuardando();
        
        recalcularTotales();
        renderItemsHTML(pData, isEditMode);
        pData.fechaModificacion = new Date().toISOString();
        
        const renderizarConFantasma = hayCambiosSinConfirmar();
        renderizarRioVersiones(pData.historialVersiones, restaurarVersion, renderizarConFantasma, pData, versionEnVistaPrevia?.versionId);
        
        await localDB.presupuestos.put(pData);
        if (!enModoVistaPrevia) syncToCloud(pData, manejadorSyncUI);
        
        clearTimeout(timeoutGuardado);
        if (vacia) {
            timeoutGuardado = setTimeout(indicarSinDatos, 100);
        } else {
            timeoutGuardado = setTimeout(indicarGuardadoOK, 800);
        }
    }

    async function guardarSilencioso() {
        pData.fechaModificacion = new Date().toISOString();
        await localDB.presupuestos.put(pData);
        if (!enModoVistaPrevia) syncToCloud(pData, manejadorSyncUI);
        
        const renderizarConFantasma = hayCambiosSinConfirmar();
        renderizarRioVersiones(pData.historialVersiones, restaurarVersion, renderizarConFantasma, pData, versionEnVistaPrevia?.versionId);
        
        indicarGuardando();
        clearTimeout(timeoutGuardado);
        timeoutGuardado = setTimeout(indicarGuardadoOK, 800);
    }

    // ==========================================
    // MODO VISTA PREVIA Y ESTADO
    // ==========================================
    const barraVistaPrevia = document.getElementById('barra-vista-previa');
    const barraHerramientas = document.getElementById('barra-herramientas-principal'); 
    const lblVistaPreviaTexto = document.getElementById('lbl-vista-previa-texto');
    const btnCancelarVP = document.getElementById('btn-cancelar-vista-previa');
    const btnRestaurarVP = document.getElementById('btn-restaurar-vista-previa');
    const hojaPresupuesto = document.getElementById('hoja-presupuesto');
    
    let enModoVistaPrevia = false;
    let backupPDataTemporal = null; // Guarda el presente
    let versionEnVistaPrevia = null; // Guarda los metadatos de lo que estamos viendo

    const salirModoVistaPrevia = async () => {
        enModoVistaPrevia = false;
        pData = backupPDataTemporal;
        backupPDataTemporal = null;
        versionEnVistaPrevia = null;
        
        if (barraHerramientas) {
            barraHerramientas.classList.remove('hidden');
            barraHerramientas.classList.add('flex');
        }
        if (barraVistaPrevia) {
            barraVistaPrevia.classList.add('hidden');
            barraVistaPrevia.classList.remove('flex');
        }
        
        hojaPresupuesto.classList.remove('modo-vista-previa');
        await guardarYRenderizar();
    };

    // Recibe isExitIntent=true cuando se hace clic en el "Fantasma" o "Actual" para salir
    const restaurarVersion = async (snapshot, versionMeta, isExitIntent = false) => {
        if (isExitIntent) {
            salirModoVistaPrevia();
            return;
        }

        // Si no estábamos en vista previa, guardamos el presente
        if (!enModoVistaPrevia) {
            backupPDataTemporal = JSON.parse(JSON.stringify(pData));
        }

        enModoVistaPrevia = true;
        versionEnVistaPrevia = versionMeta;
        
        // Mostrar Barra de Alerta y ocultar barra superior
        if (barraHerramientas) {
            barraHerramientas.classList.add('hidden');
            barraHerramientas.classList.remove('flex');
        }
        if (barraVistaPrevia) {
            barraVistaPrevia.classList.remove('hidden');
            barraVistaPrevia.classList.add('flex');
        }
        
        lblVistaPreviaTexto.textContent = `Viendo "${versionMeta.etiqueta || 'Versión antigua'}".`;
        
        // Inyectar datos en pantalla (sin guardar a la base de datos)
        pData = JSON.parse(JSON.stringify(snapshot));
        pData.historialVersiones = backupPDataTemporal.historialVersiones; // Mantenemos el historial real
        
        renderTodoSinGuardar();
    };

    const renderTodoSinGuardar = () => {
        inputDestinatario.value = pData.cliente.destinatario || '';
        inputConstructora.value = pData.cliente.constructora || '';
        inputProyecto.value = pData.codigoProyecto || '';
        introTexto.value = pData.encabezadoTexto || '';
        inputUtilidad.value = pData.totales.utilidadManual > 0 ? formatCLP(pData.totales.utilidadManual) : '';
        lblSaludoNombre.textContent = pData.cliente.destinatario || '[Nombre]';
        
        if (pData.cliente.fecha) {
            fp.setDate(pData.cliente.fecha, false);
            actualizarFechaImpresa(pData.cliente.fecha);
        }
        recalcularTotales();
        renderItemsHTML(pData, false); // Forzamos EditMode false visualmente
        hojaPresupuesto.classList.add('modo-vista-previa');
        
        // Determinamos si hay cambios reales en el borrador para saber si renderizar con fantasma
        const stringifyParaComparar = (data) => JSON.stringify({ cliente: data.cliente || {}, codigoProyecto: data.codigoProyecto || "", encabezadoTexto: data.encabezadoTexto || "", items: data.items || [], totales: data.totales || {} });
        const hayCambiosEnBorrador = stringifyParaComparar(backupPDataTemporal) !== stringifyParaComparar(backupPDataTemporal.historialVersiones[backupPDataTemporal.historialVersiones.length - 1]?.snapshot || {});

        renderizarRioVersiones(pData.historialVersiones, restaurarVersion, hayCambiosEnBorrador, backupPDataTemporal, versionEnVistaPrevia.versionId);
    };

    btnCancelarVP.addEventListener('click', salirModoVistaPrevia);

    btnRestaurarVP.addEventListener('click', async () => {
        // Al restaurar, avanzamos en el tiempo creando un nuevo nodo basado en la vista previa
        pData.historialVersiones.push({
            versionId: `v_restored_${Date.now()}`,
            fechaHora: new Date().toISOString(),
            etiqueta: `Restaurado de: ${versionEnVistaPrevia.etiqueta}`,
            snapshot: JSON.parse(JSON.stringify(pData)) 
        });

        enModoVistaPrevia = false;
        backupPDataTemporal = null;
        versionEnVistaPrevia = null;
        
        if (barraHerramientas) {
            barraHerramientas.classList.remove('hidden');
            barraHerramientas.classList.add('flex');
        }
        if (barraVistaPrevia) {
            barraVistaPrevia.classList.add('hidden');
            barraVistaPrevia.classList.remove('flex');
        }
        hojaPresupuesto.classList.remove('modo-vista-previa');
        
        await guardarYRenderizar();
    });

    // ==========================================
    // DELEGACIÓN DE EVENTOS (INTERACCIÓN USUARIO)
    // ==========================================
    
    // Header Inputs (Auto-save)
    [inputDestinatario, inputConstructora, inputProyecto, introTexto].forEach(contenedor => {
        contenedor.addEventListener('input', async (e) => {
            if (e.target.id === 'destinatario-input') {
                pData.cliente.destinatario = e.target.value;
                lblSaludoNombre.textContent = e.target.value.trim() !== '' ? e.target.value.trim() : '[Nombre]';
            }
            if (e.target.id === 'constructora-input') pData.cliente.constructora = e.target.value;
            if (e.target.id === 'intro-texto') pData.encabezadoTexto = e.target.value;
            if (e.target.id === 'proyecto-input') pData.codigoProyecto = e.target.value;
            await guardarYRenderizar();
        });
    });

    // Guardado Manual (Botón Guardar)
    document.getElementById('btn-guardar-version').addEventListener('click', async () => {
        const etiqueta = await window.customPrompt(
            "Guardar Versión", 
            "Ingresa un nombre para recordar este punto:", 
            "Ej: Opción sin juegos infantiles"
        );
        if (etiqueta === null) return; 
        
        recalcularTotales(); // Normalizar la data antes de tomar la fotografía para evitar nodos fantasmas

        pData.historialVersiones.push({
            versionId: `v_${Date.now()}`,
            fechaHora: new Date().toISOString(),
            etiqueta: etiqueta || "Guardado manual",
            snapshot: JSON.parse(JSON.stringify(pData)) 
        });
        await guardarYRenderizar(); 
    });

    // Evento Terminar (Imprimir / PDF)
    btnImprimir.addEventListener('click', () => {
        // Se importa dinámicamente desde exportar.js para no saturar core.js
        import('./exportar.js').then(module => {
            module.manejarExportacionPDF(pData, hayCambiosSinConfirmar, guardarYRenderizar);
        });
    });

    // Modo Edición Toggle
    const btnToggleEdit = document.getElementById('btn-toggle-edit');
    if (btnToggleEdit) {
        btnToggleEdit.addEventListener('click', () => {
            isEditMode = !isEditMode;
            btnToggleEdit.classList.toggle('text-blue-600', isEditMode);
            btnToggleEdit.classList.toggle('bg-blue-100', isEditMode);
            btnToggleEdit.classList.toggle('text-zinc-500', !isEditMode);
            btnToggleEdit.classList.toggle('bg-zinc-100', !isEditMode);
            renderItemsHTML(pData, isEditMode); 
        });
    }

    // Lógica Dropdown Añadir Ítem
    const btnToggleCat = document.getElementById('btn-toggle-cat');
    const dropdownCat = document.getElementById('dropdown-cat');
    const btnAddCustomCat = document.getElementById('btn-add-cat-personalizada');
    const inputCustomCat = document.getElementById('input-cat-personalizada');

    btnToggleCat.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownCat.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (dropdownCat && !dropdownCat.contains(e.target) && e.target !== btnToggleCat) {
            dropdownCat.classList.add('hidden');
        }
        if (!e.target.classList.contains('input-unidad')) {
            document.querySelectorAll('.dropdown-unidad').forEach(d => d.classList.add('hidden'));
        }
    });

    const agregarItem = (nombre) => {
        if (!nombre.trim()) return;
        pData.items.push({
            id: 'cat_' + Date.now(),
            titulo: nombre.toUpperCase(),
            elementos: [],
            subitems: [],
            subtotal: 0
        });
        dropdownCat.classList.add('hidden');
        inputCustomCat.value = '';
        guardarYRenderizar();
    };

    document.querySelectorAll('.opcion-cat').forEach(btn => {
        btn.addEventListener('click', () => agregarItem(btn.dataset.nombre));
    });
    btnAddCustomCat.addEventListener('click', () => agregarItem(inputCustomCat.value));

    // Clicks en la tabla (Añadir, Eliminar, Subir, Bajar elementos)
    itemsContainer.addEventListener('click', (e) => {
        const btnUnidad = e.target.closest('.opcion-unidad');
        if (btnUnidad) {
            const tr = btnUnidad.closest('tr');
            // Dependiendo del modo, actualizamos la unidad en 'elementos'
            const catIndex = tr.dataset.cat;
            const subIndex = tr.dataset.subitem;
            const artIndex = tr.dataset.art;
            const targetArray = subIndex !== undefined ? pData.items[catIndex].subitems[subIndex].elementos : pData.items[catIndex].elementos;
            
            targetArray[artIndex].unidad = btnUnidad.dataset.valor;
            guardarYRenderizar();
            return;
        }

        if (e.target.classList.contains('input-unidad')) {
            document.querySelectorAll('.dropdown-unidad').forEach(d => d.classList.add('hidden'));
            e.target.nextElementSibling.classList.remove('hidden');
        }

        const btnAdd = e.target.closest('.btn-add-art');
        const btnDelArt = e.target.closest('.btn-del-art');
        const btnDelCat = e.target.closest('.btn-del-cat');
        const btnUpCat = e.target.closest('.btn-up-cat');
        const btnDownCat = e.target.closest('.btn-down-cat');
        const btnUpArt = e.target.closest('.btn-up-art');
        const btnDownArt = e.target.closest('.btn-down-art');
        const btnSetModo = e.target.closest('.btn-set-modo');
        const btnAddSubitem = e.target.closest('.btn-add-subitem');
        const btnDelSubitem = e.target.closest('.btn-del-subitem');

        // Establecer Modo (Simple o Compuesto)
        if (btnSetModo) {
            const catIndex = btnSetModo.dataset.cat;
            const modo = btnSetModo.dataset.modo;
            pData.items[catIndex].modo = modo;
            
            if (modo === 'compuesto') {
                pData.items[catIndex].subitems.push({ id: 'sub_' + Date.now(), titulo: "", elementos: [], subtotal: 0 });
                
                recalcularTotales();
                renderItemsHTML(pData, isEditMode);
                
                const newTitleInput = document.querySelector(`.input-subitem-titulo[data-cat="${catIndex}"][data-subitem="0"]`);
                if (newTitleInput) {
                    newTitleInput.focus();
                    newTitleInput.select();
                    newTitleInput.classList.add('ring-2', 'ring-indigo-300', 'bg-white');
                    setTimeout(() => newTitleInput.classList.remove('ring-2', 'ring-indigo-300', 'bg-white'), 1500);
                }
                guardarSilencioso();
            } else {
                pData.items[catIndex].elementos.push({ descripcion: "", detalle: "", cantidad: "", unidad: "unid", precioUnitario: "", precioTotal: 0 });
                guardarYRenderizar();
            }
            return;
        }

        // Añadir/Eliminar Subítem
        if (btnAddSubitem) {
            const catIndex = btnAddSubitem.dataset.cat;
            pData.items[catIndex].subitems.push({ id: 'sub_' + Date.now(), titulo: "", elementos: [], subtotal: 0 });
            
            recalcularTotales();
            renderItemsHTML(pData, isEditMode);
            
            const newSubIndex = pData.items[catIndex].subitems.length - 1;
            const newTitleInput = document.querySelector(`.input-subitem-titulo[data-cat="${catIndex}"][data-subitem="${newSubIndex}"]`);
            if (newTitleInput) {
                newTitleInput.focus();
                newTitleInput.select();
                newTitleInput.classList.add('ring-2', 'ring-indigo-300', 'bg-white');
                setTimeout(() => newTitleInput.classList.remove('ring-2', 'ring-indigo-300', 'bg-white'), 1500);
            }
            guardarSilencioso();
            return;
        } else if (btnDelSubitem) {
            const catIndex = btnDelSubitem.dataset.cat;
            const subIndex = btnDelSubitem.dataset.subitem;
            pData.items[catIndex].subitems.splice(subIndex, 1);
            if (pData.items[catIndex].subitems.length === 0) pData.items[catIndex].modo = 'simple'; // Resetea si borras el último
            guardarYRenderizar();
            return;
        }

        // Recuperar Arrays Correctos para Elementos
        const getTargetArray = (cIdx, sIdx) => sIdx !== undefined ? pData.items[cIdx].subitems[sIdx].elementos : pData.items[cIdx].elementos;

        if (btnAdd) {
            const catIndex = btnAdd.dataset.cat;
            const subIndex = btnAdd.dataset.subitem;
            const targetArray = getTargetArray(catIndex, subIndex);
            
            targetArray.push({
                descripcion: "", detalle: "", cantidad: "", unidad: "unid", precioUnitario: "", precioTotal: 0
            });
            guardarYRenderizar();
        } else if (btnDelArt) {
            const catIndex = parseInt(btnDelArt.dataset.cat);
            const subIndex = btnDelArt.dataset.subitem;
            getTargetArray(catIndex, subIndex).splice(parseInt(btnDelArt.dataset.art), 1);
            guardarYRenderizar();
        } else if (btnDelCat) {
            const cIdx = parseInt(btnDelCat.dataset.cat);
            window.customConfirm(
                "Eliminar Ítem",
                `¿Seguro que deseas eliminar el ítem <b>"${pData.items[cIdx].titulo}"</b> y todos sus elementos?`,
                "Sí, eliminar"
            ).then((confirmed) => {
                if (confirmed) {
                    pData.items.splice(cIdx, 1);
                    guardarYRenderizar();
                }
            });
        } else if (btnUpCat) {
            const cIdx = parseInt(btnUpCat.dataset.cat);
            if (cIdx > 0) {
                [pData.items[cIdx - 1], pData.items[cIdx]] = [pData.items[cIdx], pData.items[cIdx - 1]];
                guardarYRenderizar();
            }
        } else if (btnDownCat) {
            const cIdx = parseInt(btnDownCat.dataset.cat);
            if (cIdx < pData.items.length - 1) {
                [pData.items[cIdx + 1], pData.items[cIdx]] = [pData.items[cIdx], pData.items[cIdx + 1]];
                guardarYRenderizar();
            }
        } else if (btnUpArt) {
            const cIdx = parseInt(btnUpArt.dataset.cat);
            const sIdx = btnUpArt.dataset.subitem;
            const aIdx = parseInt(btnUpArt.dataset.art);
            const arr = getTargetArray(cIdx, sIdx);
            if (aIdx > 0) {
                [arr[aIdx - 1], arr[aIdx]] = [arr[aIdx], arr[aIdx - 1]];
                guardarYRenderizar();
            }
        } else if (btnDownArt) {
            const cIdx = parseInt(btnDownArt.dataset.cat);
            const sIdx = btnDownArt.dataset.subitem;
            const aIdx = parseInt(btnDownArt.dataset.art);
            const arr = getTargetArray(cIdx, sIdx);
            if (aIdx < arr.length - 1) {
                [arr[aIdx + 1], arr[aIdx]] = [arr[aIdx], arr[aIdx + 1]];
                guardarYRenderizar();
            }
        }
    });

    // Bloquear edición si estamos en vista previa
    itemsContainer.addEventListener('click', (e) => {
        if (enModoVistaPrevia) {
            e.stopPropagation();
            window.customAlert("Modo Vista Previa", "No puedes editar mientras visualizas una versión antigua. Vuelve al borrador o restaura la versión.", "bg-amber-600", "hover:bg-amber-700");
            return;
        }
    }, true);

    // Inputs en la tabla (Montos, nombres, detalles)
    itemsContainer.addEventListener('input', (e) => {
        if (enModoVistaPrevia) return;

        if (e.target.classList.contains('input-cat-titulo')) {
            pData.items[e.target.dataset.cat].titulo = e.target.value;
            guardarSilencioso();
            return;
        }
        if (e.target.classList.contains('input-subitem-titulo')) {
            pData.items[e.target.dataset.cat].subitems[e.target.dataset.subitem].titulo = e.target.value;
            guardarSilencioso();
            return;
        }

        if (e.target.classList.contains('input-art')) {
            const campo = e.target.dataset.campo;
            if (campo === 'cantidad' || campo === 'precioUnitario') {
                const rawString = e.target.value.replace(/[^0-9]/g, ''); 
                e.target.value = rawString !== '' ? formatCLP(rawString) : '';
            }

            const tr = e.target.closest('tr');
            const catIndex = tr.dataset.cat;
            const subIndex = tr.dataset.subitem;
            const artIndex = tr.dataset.art;
            
            const targetArray = subIndex !== undefined ? pData.items[catIndex].subitems[subIndex].elementos : pData.items[catIndex].elementos;
            
            targetArray[artIndex][campo] = (campo === 'cantidad' || campo === 'precioUnitario') 
                ? parseCLP(e.target.value) 
                : e.target.value;
            
            if (campo === 'cantidad' || campo === 'precioUnitario') {
                recalcularTotales();
                tr.querySelector('.art-total').textContent = `$${formatCLP(targetArray[artIndex].precioTotal)}`;
                
                // Actualiza totales UI de forma eficiente
                const contenedorRaiz = tr.closest('[data-cat-index]');
                if (subIndex !== undefined) {
                    // Refresca el subtotal del subítem localmente
                    tr.closest(`[data-subitem-index="${subIndex}"]`).querySelector('.subitem-subtotal-val').textContent = `$${formatCLP(pData.items[catIndex].subitems[subIndex].subtotal)}`;
                    // Y luego refresca el total general de la categoría (modo compuesto)
                    const totalGralElement = contenedorRaiz.querySelector('.cat-subtotal');
                    if(totalGralElement) totalGralElement.textContent = `$${formatCLP(pData.items[catIndex].subtotal)}`;
                } else {
                    // Refresca el total general de la categoría (modo simple)
                    const totalGralElement = contenedorRaiz.querySelector('.cat-subtotal');
                    if(totalGralElement) totalGralElement.textContent = `$${formatCLP(pData.items[catIndex].subtotal)}`;
                }
            }
            guardarSilencioso();
        }
    });

    // Input Utilidad
    inputUtilidad.addEventListener('input', (e) => {
        const rawString = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = rawString !== '' ? formatCLP(rawString) : '';
        recalcularTotales();
        guardarSilencioso();
    });

    // ==========================================
    // ARRANQUE
    // ==========================================
    guardarYRenderizar();
    setupImport(pData, guardarYRenderizar);
});