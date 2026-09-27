import { localDB } from './db.js';
import { renderizarRioVersiones } from './versions.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Obtener ID desde la URL (ej: editor.html?id=presupuesto_123)
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = 'index.html'; // Redirigir si no hay ID
        return;
    }

    const inputDestinatario = document.getElementById('destinatario-input');
    const lblSaludoNombre = document.getElementById('saludo-nombre');
    const btnImprimir = document.getElementById('btn-imprimir');
    const inputFecha = document.getElementById('fecha-input');
    const txtFechaImpresa = document.getElementById('fecha-impresa');
    const btnFechaHoy = document.getElementById('btn-fecha-hoy');

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
                box.classList.remove('scale-100');
                box.classList.add('scale-95');
                modal.classList.remove('opacity-100');
                modal.classList.add('opacity-0');
                setTimeout(() => modal.classList.add('hidden'), 200);
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
            };

            const onOk = () => { cleanup(); resolve(true); };
            const onCancel = () => { cleanup(); resolve(false); };

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);

            modal.classList.remove('hidden');
            // Timeout para que la animación de Tailwind agarre
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.classList.add('opacity-100');
                box.classList.remove('scale-95');
                box.classList.add('scale-100');
            }, 10);
        });
    };

    window.customPrompt = function(title, message, placeholder) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-prompt');
            const box = document.getElementById('modal-prompt-box');
            const input = document.getElementById('modal-prompt-input');
            const btnOk = document.getElementById('btn-modal-prompt-ok');
            const btnCancel = document.getElementById('btn-modal-prompt-cancel');

            document.getElementById('modal-prompt-title').textContent = title;
            document.getElementById('modal-prompt-message').textContent = message;
            input.placeholder = placeholder;
            input.value = '';

            const cleanup = () => {
                box.classList.remove('scale-100');
                box.classList.add('scale-95');
                modal.classList.remove('opacity-100');
                modal.classList.add('opacity-0');
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
                modal.classList.remove('opacity-0');
                modal.classList.add('opacity-100');
                box.classList.remove('scale-95');
                box.classList.add('scale-100');
                input.focus();
            }, 10);
        });
    };

    // ==========================================
    // ESTADO GLOBAL EN MEMORIA
    // ==========================================
    let pData = await localDB.presupuestos.get(id) || {};
    if (!pData.items) pData.items = [];
    if (!pData.cliente) pData.cliente = {};

    // 1. Lógica de Fechas (Flatpickr - Estilo Airbnb)
    const fp = flatpickr(inputFecha, {
        locale: "es",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d \\de F \\de Y", // Muestra: "26 de Septiembre de 2026"
        allowInput: false,
        onChange: function(selectedDates, dateStr, instance) {
            pData.cliente.fecha = dateStr;
            actualizarFechaImpresa(dateStr);
            localDB.presupuestos.put(pData);
        }
    });

    function setFechaHoy(conAnimacion = false) {
        const hoy = new Date();
        fp.setDate(hoy, true); // "true" dispara el guardado automático
        
        if (conAnimacion) {
            const originalText = btnFechaHoy.innerHTML;
            // Animación: Cambia ícono y colores a verde
            btnFechaHoy.innerHTML = '<svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> ¡Actualizado!';
            btnFechaHoy.classList.add('bg-emerald-100', 'text-emerald-700', 'border-emerald-300');
            btnFechaHoy.classList.remove('bg-zinc-100', 'text-zinc-600', 'border-zinc-200');
            
            // Regresa a la normalidad después de 2 segundos
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

    // Inicializar fecha
    if (!pData.cliente.fecha) {
        setFechaHoy(false); // Día actual por defecto
    } else {
        fp.setDate(pData.cliente.fecha, false);
        actualizarFechaImpresa(pData.cliente.fecha);
    }

    btnFechaHoy.addEventListener('click', () => setFechaHoy(true));

    // 2. Toggle del Panel Historial con Memoria (Local Storage)
    const btnToggleHistorial = document.getElementById('btn-toggle-historial');
    const panelHistorial = document.getElementById('panel-historial');
    
    // Cargar estado previo o defecto true
    let historialVisible = localStorage.getItem('historialVisible');
    historialVisible = historialVisible !== null ? JSON.parse(historialVisible) : true;

    // Aplicar estado inicial sin animaciones para que no salte
    if (!historialVisible) {
        panelHistorial.classList.add('w-0', 'border-0', 'opacity-0', 'duration-0');
        panelHistorial.classList.remove('w-80', 'border-l');
        setTimeout(() => panelHistorial.classList.remove('duration-0'), 100);
    }

    btnToggleHistorial.addEventListener('click', () => {
        historialVisible = !historialVisible;
        localStorage.setItem('historialVisible', JSON.stringify(historialVisible));
        
        if (historialVisible) {
            panelHistorial.classList.remove('w-0', 'border-0', 'opacity-0');
            panelHistorial.classList.add('w-80', 'border-l');
        } else {
            panelHistorial.classList.add('w-0', 'border-0', 'opacity-0');
            panelHistorial.classList.remove('w-80', 'border-l');
        }
    });

    // 4. Reactividad UI Básica
    inputDestinatario.addEventListener('input', (e) => {
        const valor = e.target.value.trim();
        lblSaludoNombre.textContent = valor !== '' ? valor : '[Nombre]';
    });

    // 5. Evento de impresión (Crea versión automática)
    btnImprimir.addEventListener('click', async () => {
        // Autoguardar un hito antes de imprimir
        pData.historialVersiones.push({
            versionId: `v_pdf_${Date.now()}`,
            fechaHora: new Date().toISOString(),
            etiqueta: "PDF Generado",
            snapshot: JSON.parse(JSON.stringify(pData))
        });
        await guardarYRenderizar();
        
        window.print();
    });

    // 6. Auto-ajuste de altura para el área de texto (Carta)
    const textareaIntro = document.getElementById('intro-texto');
    
    function autoResizeTextarea() {
        this.style.height = 'auto'; // Resetea la altura para calcularla de nuevo
        this.style.height = this.scrollHeight + 'px'; // Ajusta al contenido real
    }
    
    // Escuchar cada vez que escribe
    textareaIntro.addEventListener('input', autoResizeTextarea);
    setTimeout(() => autoResizeTextarea.call(textareaIntro), 0);


    // ==========================================
    // MOTOR DE CÁLCULO Y TABLAS
    // ==========================================
    let isEditMode = false; // Estado del modo de edición
    let timeoutGuardado = null; // Timer para el semáforo

    const semaforoUI = document.getElementById('semaforo-guardado');
    const semaforoDot = semaforoUI.querySelector('.indicator-dot');
    const semaforoText = semaforoUI.querySelector('.indicator-text');

    function indicarGuardando() {
        semaforoUI.className = "flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-zinc-200 text-xs font-medium text-amber-500 transition-colors duration-300";
        semaforoDot.className = "w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] indicator-dot animate-pulse";
        semaforoText.textContent = "Guardando...";
    }

    function indicarGuardadoOK() {
        semaforoUI.className = "flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-zinc-200 text-xs font-medium text-emerald-600 transition-colors duration-300";
        semaforoDot.className = "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] indicator-dot";
        semaforoText.textContent = "Guardado";
    }

    function indicarSinDatos() {
        semaforoUI.className = "flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-zinc-200 text-xs font-medium text-zinc-400 transition-colors duration-300";
        semaforoDot.className = "w-2 h-2 rounded-full bg-zinc-300 indicator-dot";
        semaforoText.textContent = "Sin datos";
    }

    // Evalúa si la hoja está totalmente vacía
    function isHojaVacia() {
        return (!pData.cliente?.destinatario && 
                !pData.cliente?.constructora && 
                (!pData.codigoProyecto || pData.codigoProyecto === "Nuevo Proyecto") && 
                pData.items.length === 0);
    }

    // Evalúa si el estado actual es igual al último hito guardado (o si nunca se ha guardado uno pero hay datos)
    function hayCambiosSinConfirmar() {
        if (isHojaVacia()) return false; // Si está vacía, no hay nada que confirmar
        if (pData.historialVersiones.length === 0) return true; // Hay datos pero 0 versiones
        
        // Comparamos la fecha de modificación actual con la del último snapshot guardado
        // Como guardamos profundo, una simple diferencia de tiempo al teclear nos basta
        const ultimaVersion = pData.historialVersiones[pData.historialVersiones.length - 1];
        return pData.fechaModificacion !== ultimaVersion.fechaHora; 
    }

    // --- Historial de Versiones (Hitos) ---
    if (!pData.historialVersiones) pData.historialVersiones = [];
    
    const restaurarVersion = async (snapshot) => {
        // Clon profundo del snapshot para no cruzar referencias
        pData = JSON.parse(JSON.stringify(snapshot));
        pData.fechaModificacion = new Date().toISOString();
        
        // Actualizar inputs UI principales
        inputDestinatario.value = pData.cliente.destinatario || '';
        document.getElementById('constructora-input').value = pData.cliente.constructora || '';
        document.getElementById('proyecto-input').value = pData.codigoProyecto || '';
        document.getElementById('intro-texto').value = pData.encabezadoTexto || '';
        inputUtilidad.value = pData.totales.utilidadManual > 0 ? formatCLP(pData.totales.utilidadManual) : '';
        lblSaludoNombre.textContent = pData.cliente.destinatario || '[Nombre]';
        
        if (pData.cliente.fecha) {
            fp.setDate(pData.cliente.fecha, false);
            actualizarFechaImpresa(pData.cliente.fecha);
        }

        await guardarYRenderizar(); // Recalcula y dibuja todo
    };

    renderizarRioVersiones(pData.historialVersiones, restaurarVersion);

    document.getElementById('btn-guardar-version').addEventListener('click', async () => {
        const etiqueta = await window.customPrompt(
            "Guardar Versión", 
            "Ingresa un nombre para recordar este punto:", 
            "Ej: Opción sin juegos infantiles"
        );
        
        if (etiqueta === null) return; // Canceló

        const nuevaVersion = {
            versionId: `v_${Date.now()}`,
            fechaHora: new Date().toISOString(),
            etiqueta: etiqueta || "Guardado manual",
            snapshot: JSON.parse(JSON.stringify(pData)) // Clon completo
        };

        pData.historialVersiones.push(nuevaVersion);
        await guardarYRenderizar(); // Guarda la nueva array en Dexie
    });

    const itemsContainer = document.getElementById('items-container');
    const inputUtilidad = document.getElementById('input-utilidad');
    const btnToggleEdit = document.getElementById('btn-toggle-edit');

    // Funciones de formato de dinero (1000000 -> 1.000.000)
    const formatCLP = (num) => new Intl.NumberFormat('es-CL').format(Math.round(num));
    const parseCLP = (str) => parseFloat(str.toString().replace(/\./g, '').replace(/,/g, '')) || 0;

    // --- Modo Edición Toggle ---
    btnToggleEdit.addEventListener('click', () => {
        isEditMode = !isEditMode;
        btnToggleEdit.classList.toggle('text-blue-600', isEditMode);
        btnToggleEdit.classList.toggle('bg-blue-100', isEditMode);
        btnToggleEdit.classList.toggle('text-zinc-500', !isEditMode);
        btnToggleEdit.classList.toggle('bg-zinc-100', !isEditMode);
        renderItems(); // Re-renderizar para mostrar/ocultar botones de borrar
    });

    // --- 0. UNIDADES DINÁMICAS ---
    let unidadesBase = ['unid', 'm2', 'm3', 'ml', 'gl', 'Kg'];

    // --- 1. LÓGICA DEL DROPDOWN ---
    const btnToggleCat = document.getElementById('btn-toggle-cat');
    const dropdownCat = document.getElementById('dropdown-cat');
    const btnAddCustomCat = document.getElementById('btn-add-cat-personalizada');
    const inputCustomCat = document.getElementById('input-cat-personalizada');

    btnToggleCat.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownCat.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownCat.contains(e.target) && e.target !== btnToggleCat) {
            dropdownCat.classList.add('hidden');
        }
        if (!e.target.classList.contains('input-unidad')) {
            document.querySelectorAll('.dropdown-unidad').forEach(d => d.classList.add('hidden'));
        }
    });

    const agregarItem = (nombre) => {
        if (!nombre.trim()) return;
        const nuevaCat = {
            id: 'cat_' + Date.now(),
            titulo: nombre.toUpperCase(),
            subitems: [],
            subtotal: 0
        };
        pData.items.push(nuevaCat);
        dropdownCat.classList.add('hidden');
        inputCustomCat.value = '';
        guardarYRenderizar();
    };

    document.querySelectorAll('.opcion-cat').forEach(btn => {
        btn.addEventListener('click', () => agregarItem(btn.dataset.nombre));
    });

    btnAddCustomCat.addEventListener('click', () => agregarItem(inputCustomCat.value));

    // --- 2. RENDERIZADO DE TABLAS ---
    function renderItems() {
        itemsContainer.innerHTML = '';

        // Recolectar unidades nuevas antes de renderizar
        let unidadesDisponibles = [...unidadesBase];
        pData.items.forEach(cat => cat.subitems.forEach(art => {
            if (art.unidad && !unidadesDisponibles.includes(art.unidad)) unidadesDisponibles.push(art.unidad);
        }));
        
        pData.items.forEach((cat, catIndex) => {
            let htmlelementos = cat.subitems.map((art, artIndex) => `
                <tr class="group" data-cat="${catIndex}" data-art="${artIndex}">
                    <td class="pr-2 pb-2"><input type="text" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="descripcion" value="${art.descripcion || ''}" placeholder="Ej. Quillay"></td>
                    <td class="pr-2 pb-2"><input type="text" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="detalle" value="${art.detalle || ''}" placeholder="Ej. 2 mts"></td>
                    <td class="pr-2 pb-2"><input type="text" inputmode="numeric" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm text-center transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="cantidad" value="${art.cantidad ? formatCLP(art.cantidad) : ''}"></td>
                    <td class="pr-2 pb-2 relative">
                        <input type="text" class="input-art input-unidad w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="unidad" value="${art.unidad || 'unid'}">
                        <!-- Z-index elevado y quitamos overflow hidden para que desborde de la tabla -->
                        <div class="dropdown-unidad hidden absolute top-[calc(100%-8px)] left-0 w-24 bg-white border border-zinc-200 rounded-md shadow-xl z-[100] print:hidden">
                            <div class="flex flex-col py-1">
                                ${unidadesDisponibles.map(u => `<button type="button" class="opcion-unidad text-left px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors" data-valor="${u}">${u}</button>`).join('')}
                            </div>
                        </div>
                    </td>
                    <td class="pr-2 pb-2 relative">
                        <span class="absolute left-3 top-2 text-zinc-400 print:hidden">$</span>
                        <input type="text" inputmode="numeric" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 pl-6 text-sm text-right transition-colors print:border-0 print:bg-transparent print:p-0 print:pl-0" data-campo="precioUnitario" value="${art.precioUnitario ? formatCLP(art.precioUnitario) : ''}">                     </td>                     <td class="pb-2 font-semibold text-right align-middle text-zinc-800 art-total">$${formatCLP(art.precioTotal)}</td>
                    <td class="pb-2 w-16 text-center print:hidden ${isEditMode ? '' : 'hidden'}">
                        <div class="flex items-center justify-center gap-1">
                            <div class="flex flex-col">
                                <button class="btn-up-art text-zinc-400 hover:text-zinc-800 p-0.5 disabled:opacity-30" data-cat="${catIndex}" data-art="${artIndex}" ${artIndex === 0 ? 'disabled' : ''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg></button>
                                <button class="btn-down-art text-zinc-400 hover:text-zinc-800 p-0.5 disabled:opacity-30" data-cat="${catIndex}" data-art="${artIndex}" ${artIndex === cat.subitems.length - 1 ? 'disabled' : ''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>
                            </div>
                            <button class="btn-del-art text-red-400 hover:text-red-600 transition-colors p-1" data-cat="${catIndex}" data-art="${artIndex}" title="Eliminar elemento">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            const catHtml = `
                <div class="mb-8 relative" data-cat-index="${catIndex}">
                    <div class="font-bold text-lg text-zinc-900 mb-4 border-b-2 border-zinc-900 pb-1 flex justify-between items-end">
                        <div class="flex items-center flex-1 pr-4">
                            <span class="mr-2">${catIndex + 1}.</span>
                            <input type="text" class="input-cat-titulo w-full bg-transparent border-0 p-0 font-bold text-lg focus:ring-0 ${isEditMode ? 'border border-zinc-300 bg-zinc-50 cursor-text rounded-md px-2 py-1 -ml-2' : 'pointer-events-none cursor-default'}" data-cat="${catIndex}" value="${cat.titulo}">
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex gap-1 print:hidden ${isEditMode ? '' : 'hidden'}">
                                <button class="btn-up-cat text-zinc-400 hover:text-zinc-800 p-1 disabled:opacity-30" data-cat="${catIndex}" ${catIndex === 0 ? 'disabled' : ''}><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg></button>
                                <button class="btn-down-cat text-zinc-400 hover:text-zinc-800 p-1 disabled:opacity-30" data-cat="${catIndex}" ${catIndex === pData.items.length - 1 ? 'disabled' : ''}><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>
                                <button class="btn-del-cat text-red-400 hover:text-red-600 p-1 ml-2" data-cat="${catIndex}" title="Eliminar Ítem Completo"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    </div>
                    
                    ${cat.subitems.length > 0 ? `
                        <div class="overflow-x-auto mb-3">
                            <table class="w-full text-left table-fixed">
                                <thead>
                                    <tr class="text-xs text-zinc-500 uppercase tracking-wider">
                                        <th class="pb-2 w-[28%] pl-1">Nombre</th>
                                        <th class="pb-2 w-[28%]">Detalle</th>
                                        <th class="pb-2 w-[10%] text-center">Cant.</th>
                                        <th class="pb-2 w-[10%]">Unid.</th>
                                        <th class="pb-2 w-[12%] text-right">P. Unit</th>
                                        <th class="pb-2 w-[12%] text-right pr-1">Total</th>
                                        <th class="pb-2 w-8 print:hidden ${isEditMode ? '' : 'hidden'}"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${htmlelementos}                                 </tbody>                                 <tfoot>                                     <tr>                                         <td colspan="5" class="text-right py-3 pr-4 font-bold text-zinc-600">Subtotal:</td>                                         <td class="py-3 text-right font-bold text-zinc-900 border-t border-zinc-300 cat-subtotal">$${formatCLP(cat.subtotal)}</td>
                                        <td class="print:hidden ${isEditMode ? '' : 'hidden'}"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ` : ''}
                    
                    <button class="btn-add-art text-sm text-zinc-600 hover:text-zinc-900 font-bold print:hidden flex items-center gap-1 mt-2 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded transition-colors" data-cat="${catIndex}">
                        + Añadir Elemento
                    </button>
                </div>
            `;
            itemsContainer.insertAdjacentHTML('beforeend', catHtml);
        });
    }

    // --- 3. RECALCULAR Y DELEGACIÓN DE EVENTOS ---
    function recalcularTotales() {
        let costoDirectoTotal = 0;

        pData.items.forEach(cat => {
            let catSubtotal = 0;
            cat.subitems.forEach(art => {
                const cant = parseFloat(art.cantidad) || 0;
                const precio = parseFloat(art.precioUnitario) || 0;
                art.precioTotal = cant * precio;
                catSubtotal += art.precioTotal;
            });
            cat.subtotal = catSubtotal;
            costoDirectoTotal += catSubtotal;
        });

        pData.totales.costoDirectoTotal = costoDirectoTotal;
        pData.totales.gastosGeneralesMonto = costoDirectoTotal * 0.10; // 10% Fijo
        
        const utilidadIngresada = parseCLP(inputUtilidad.value);
        pData.totales.utilidadManual = utilidadIngresada;
        pData.totales.totalNeto = costoDirectoTotal + pData.totales.gastosGeneralesMonto + utilidadIngresada;

        // Sugerencia de utilidad redondeada al millón (Ej: 8.6M -> 9.0M, o 7.2M -> 7.0M)
        const utilidadSugeridaRedondeada = Math.round(pData.totales.gastosGeneralesMonto / 1000000) * 1000000;

        // Actualizar UI de totales
        document.getElementById('lbl-costo-directo').textContent = `$${formatCLP(pData.totales.costoDirectoTotal)}`;
        document.getElementById('lbl-gastos-generales').textContent = `$${formatCLP(pData.totales.gastosGeneralesMonto)}`;
        document.getElementById('lbl-sugerencia-utilidad').textContent = `$${formatCLP(utilidadSugeridaRedondeada)}`;
        document.getElementById('lbl-total-neto').textContent = `$${formatCLP(pData.totales.totalNeto)}`;
    }

    async function guardarYRenderizar() {
        const vacia = isHojaVacia();
        if (!vacia) indicarGuardando();
        
        recalcularTotales();
        renderItems();
        pData.fechaModificacion = new Date().toISOString();
        
        // Calculamos el nodo fantasma
        const renderizarConFantasma = hayCambiosSinConfirmar();
        renderizarRioVersiones(pData.historialVersiones, restaurarVersion, renderizarConFantasma, pData);
        
        await localDB.presupuestos.put(pData);
        
        clearTimeout(timeoutGuardado);
        if (vacia) {
            timeoutGuardado = setTimeout(indicarSinDatos, 100);
        } else {
            timeoutGuardado = setTimeout(indicarGuardadoOK, 800);
        }
    }

    // Delegación de eventos para botones dinámicos (Añadir, Eliminar, Reordenar)
    itemsContainer.addEventListener('click', (e) => {
        const btnUnidad = e.target.closest('.opcion-unidad');
        if (btnUnidad) {
            const tr = btnUnidad.closest('tr');
            const catIndex = tr.dataset.cat;
            const artIndex = tr.dataset.art;
            
            pData.items[catIndex].subitems[artIndex].unidad = btnUnidad.dataset.valor;
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

        if (btnAdd) {
            const catIndex = btnAdd.dataset.cat;
            pData.items[catIndex].subitems.push({
                descripcion: "", detalle: "", cantidad: "", unidad: "unid", precioUnitario: "", precioTotal: 0
            });
            guardarYRenderizar();
            
            setTimeout(() => {
                const inputs = itemsContainer.querySelectorAll(`tr[data-cat="${catIndex}"]`).lastChild?.querySelectorAll('input');
                if(inputs) inputs[0].focus();
            }, 50);
        } else if (btnDelArt) {
            const cIdx = parseInt(btnDelArt.dataset.cat);
            const aIdx = parseInt(btnDelArt.dataset.art);
            pData.items[cIdx].subitems.splice(aIdx, 1);
            guardarYRenderizar();
        } else if (btnDelCat) {
            const cIdx = parseInt(btnDelCat.dataset.cat);
            window.customConfirm(
                "Eliminar Ítem",
                `¿Seguro que deseas eliminar el ítem <b>"${pData.items[cIdx].titulo}"</b> y todos sus elementos?`,
                "Sí, eliminar",
                "bg-red-500",
                "hover:bg-red-600"
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
            const aIdx = parseInt(btnUpArt.dataset.art);
            if (aIdx > 0) {
                [pData.items[cIdx].subitems[aIdx - 1], pData.items[cIdx].subitems[aIdx]] = [pData.items[cIdx].subitems[aIdx], pData.items[cIdx].subitems[aIdx - 1]];
                guardarYRenderizar();
            }
        } else if (btnDownArt) {
            const cIdx = parseInt(btnDownArt.dataset.cat);
            const aIdx = parseInt(btnDownArt.dataset.art);
            if (aIdx < pData.items[cIdx].subitems.length - 1) {
                [pData.items[cIdx].subitems[aIdx + 1], pData.items[cIdx].subitems[aIdx]] = [pData.items[cIdx].subitems[aIdx], pData.items[cIdx].subitems[aIdx + 1]];
                guardarYRenderizar();
            }
        }
    });

    // Escuchar cambios y formatear en vivo
    itemsContainer.addEventListener('input', (e) => {
        // Renombrar Categoría / Ítem
        if (e.target.classList.contains('input-cat-titulo')) {
            const catIndex = e.target.dataset.cat;
            pData.items[catIndex].titulo = e.target.value;
            localDB.presupuestos.put(pData); // Guardar silenciosamente sin perder foco
            return;
        }

        if (e.target.classList.contains('input-art')) {
            const campo = e.target.dataset.campo;
            
            // Si es número o precio, forzamos el formato de miles al vuelo
            if (campo === 'cantidad' || campo === 'precioUnitario') {
                const rawString = e.target.value.replace(/[^0-9]/g, ''); // Limpiar no-números
                if (rawString !== '') {
                    e.target.value = formatCLP(rawString);
                } else {
                    e.target.value = '';
                }
            }

            const tr = e.target.closest('tr');
            const catIndex = tr.dataset.cat;
            const artIndex = tr.dataset.art;
            
            // Guardar valor real (sin puntos) en la memoria
            let valorGuardar = e.target.value;
            if (campo === 'cantidad' || campo === 'precioUnitario') {
                valorGuardar = parseCLP(e.target.value);
            }
            
            pData.items[catIndex].subitems[artIndex][campo] = valorGuardar;
            
            if (campo === 'cantidad' || campo === 'precioUnitario') {
                recalcularTotales();
                tr.querySelector('.art-total').textContent = `$${formatCLP(pData.items[catIndex].subitems[artIndex].precioTotal)}`;
                
                // Actualiza ambos elementos del subtotal (El del título y el del pie de tabla)
                const catContainer = tr.closest('[data-cat-index]');
                catContainer.querySelectorAll('.cat-subtotal').forEach(el => {
                    // Si es la celda de la tabla, quitamos el texto "Subtotal: " que ya tiene en la celda anterior
                    if (el.tagName === 'TD') {
                        el.textContent = `$${formatCLP(pData.items[catIndex].subtotal)}`;
                    } else {
                        el.textContent = `Subtotal: $${formatCLP(pData.items[catIndex].subtotal)}`;
                    }
                });
                
                localDB.presupuestos.put(pData);
            } else {
                localDB.presupuestos.put(pData);
            }
        }
    });

    // Escuchar cambios en la Utilidad Manual con formato en vivo
    inputUtilidad.addEventListener('input', (e) => {
        const rawString = e.target.value.replace(/[^0-9]/g, '');
        if (rawString !== '') {
            e.target.value = formatCLP(rawString);
        } else {
            e.target.value = '';
        }
        recalcularTotales();
        localDB.presupuestos.put(pData);
    });

    // Inicializar visualmente
    if(pData.totales.utilidadManual > 0) {
        inputUtilidad.value = formatCLP(pData.totales.utilidadManual);
    }
    guardarYRenderizar();

    // Escuchar cambios en los inputs del encabezado (Destinatario, Constructora, Proyecto, Intro)
    const containerHeader = document.querySelector('section.grid');
    const containerIntro = document.querySelector('section.mb-10');
    const inputProyecto = document.getElementById('proyecto-input');
    
    [containerHeader, containerIntro, inputProyecto].forEach(contenedor => {
        if(!contenedor) return;
        contenedor.addEventListener('input', (e) => {
            indicarGuardando();
            if (e.target.id === 'fecha-input') pData.cliente.fecha = e.target.value;
            if (e.target.id === 'destinatario-input') pData.cliente.destinatario = e.target.value;
            if (e.target.id === 'constructora-input') pData.cliente.constructora = e.target.value;
            if (e.target.id === 'intro-texto') pData.encabezadoTexto = e.target.value;
            if (e.target.id === 'proyecto-input') pData.codigoProyecto = e.target.value;
            
            pData.fechaModificacion = new Date().toISOString();
            localDB.presupuestos.put(pData);
            
            clearTimeout(timeoutGuardado);
            timeoutGuardado = setTimeout(indicarGuardadoOK, 800);
        });
    });

});