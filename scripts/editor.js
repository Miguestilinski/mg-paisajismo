import { localDB } from './db.js';

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

    // 1. Cargar datos del presupuesto
    const presupuestoActual = await localDB.presupuestos.get(id);
    
    if (presupuestoActual) {
        // Rellenar formulario inicial (Lo completaremos más adelante con todos los campos)
        if (!document.getElementById('fecha-input').value) {
            document.getElementById('fecha-input').value = `Santiago, ${obtenerFechaActual()}`;
        }
    }

    // 2. Reactividad UI Básica
    inputDestinatario.addEventListener('input', (e) => {
        const valor = e.target.value.trim();
        lblSaludoNombre.textContent = valor !== '' ? valor : '[Nombre]';
    });

    // 3. Evento de impresión
    btnImprimir.addEventListener('click', () => {
        window.print();
    });

    // 4. Auto-ajuste de altura para el área de texto (Carta)
    const textareaIntro = document.getElementById('intro-texto');
    
    function autoResizeTextarea() {
        this.style.height = 'auto'; // Resetea la altura para calcularla de nuevo
        this.style.height = this.scrollHeight + 'px'; // Ajusta al contenido real
    }
    
    // Escuchar cada vez que escribe
    textareaIntro.addEventListener('input', autoResizeTextarea);
    setTimeout(() => autoResizeTextarea.call(textareaIntro), 0);


    // ==========================================
    // ESTADO Y MOTOR DE CÁLCULO
    // ==========================================
    let pData = presupuestoActual; // Estado en memoria
    if (!pData.items) pData.items = []; // Asegurar que exista el array
    
    const itemsContainer = document.getElementById('items-container');
    const inputUtilidad = document.getElementById('input-utilidad');

    // Funciones de formato de dinero (1000000 -> 1.000.000)
    const formatCLP = (num) => new Intl.NumberFormat('es-CL').format(Math.round(num));
    const parseCLP = (str) => parseFloat(str.replace(/\./g, '').replace(/,/g, '')) || 0;

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
        
        pData.items.forEach((cat, catIndex) => {
            let htmlArticulos = cat.subitems.map((art, artIndex) => `
                <tr class="group" data-cat="${catIndex}" data-art="${artIndex}">
                    <td class="pr-2 pb-2"><input type="text" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="descripcion" value="${art.descripcion || ''}" placeholder="Ej. Quillay"></td>
                    <td class="pr-2 pb-2"><input type="text" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="detalle" value="${art.detalle || ''}" placeholder="Ej. 2 mts"></td>
                    <td class="pr-2 pb-2"><input type="number" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm text-center transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="cantidad" value="${art.cantidad || ''}"></td>
                    <td class="pr-2 pb-2">
                        <select class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:appearance-none print:border-0 print:bg-transparent print:p-0" data-campo="unidad">
                            <option value="unid" ${art.unidad === 'unid' ? 'selected' : ''}>unid</option>
                            <option value="m2" ${art.unidad === 'm2' ? 'selected' : ''}>m2</option>
                            <option value="m3" ${art.unidad === 'm3' ? 'selected' : ''}>m3</option>
                            <option value="ml" ${art.unidad === 'ml' ? 'selected' : ''}>ml</option>
                            <option value="gl" ${art.unidad === 'gl' ? 'selected' : ''}>gl</option>
                            <option value="Kg" ${art.unidad === 'Kg' ? 'selected' : ''}>Kg</option>
                        </select>
                    </td>
                    <td class="pr-2 pb-2 relative">
                        <span class="absolute left-3 top-2 text-zinc-400 print:hidden">$</span>
                        <input type="number" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 pl-6 text-sm text-right transition-colors print:border-0 print:bg-transparent print:p-0 print:pl-0" data-campo="precioUnitario" value="${art.precioUnitario || ''}">
                    </td>
                    <td class="pb-2 font-semibold text-right align-middle text-zinc-800">$${formatCLP(art.precioTotal)}</td>
                </tr>
            `).join('');

            const catHtml = `
                <div class="mb-8" data-cat-index="${catIndex}">
                    <h3 class="font-bold text-lg text-zinc-900 mb-4 border-b-2 border-zinc-200 pb-1 flex justify-between items-end">
                        <span>${catIndex + 1}. ${cat.titulo}</span>
                        <span class="text-sm font-bold text-zinc-600">Subtotal: $${formatCLP(cat.subtotal)}</span>
                    </h3>
                    
                    ${cat.subitems.length > 0 ? `
                        <div class="overflow-x-auto mb-3">
                            <table class="w-full text-left">
                                <thead>
                                    <tr class="text-xs text-zinc-500 uppercase tracking-wider">
                                        <th class="pb-2 w-[30%]">Descripción</th>
                                        <th class="pb-2 w-[25%]">Detalle</th>
                                        <th class="pb-2 w-[10%] text-center">Cant.</th>
                                        <th class="pb-2 w-[10%]">Unid.</th>
                                        <th class="pb-2 w-[15%] text-right">P. Unit</th>
                                        <th class="pb-2 w-[10%] text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>${htmlArticulos}</tbody>
                            </table>
                        </div>
                    ` : ''}
                    
                    <button class="btn-add-art text-sm text-zinc-600 hover:text-zinc-900 font-bold print:hidden flex items-center gap-1 mt-2 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded transition-colors" data-cat="${catIndex}">
                        + Añadir Artículo
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

        // Actualizar UI de totales
        document.getElementById('lbl-costo-directo').textContent = `$${formatCLP(pData.totales.costoDirectoTotal)}`;
        document.getElementById('lbl-gastos-generales').textContent = `$${formatCLP(pData.totales.gastosGeneralesMonto)}`;
        document.getElementById('lbl-sugerencia-utilidad').textContent = `$${formatCLP(pData.totales.gastosGeneralesMonto)}`;
        document.getElementById('lbl-total-neto').textContent = `$${formatCLP(pData.totales.totalNeto)}`;
    }

    async function guardarYRenderizar() {
        recalcularTotales();
        renderItems();
        pData.fechaModificacion = new Date().toISOString();
        await localDB.presupuestos.put(pData);
    }

    // Escuchar clics en botones generados dinámicamente (+ Añadir Artículo)
    itemsContainer.addEventListener('click', (e) => {
        const btnAdd = e.target.closest('.btn-add-art');
        if (btnAdd) {
            const catIndex = btnAdd.dataset.cat;
            pData.items[catIndex].subitems.push({
                descripcion: "", detalle: "", cantidad: "", unidad: "unid", precioUnitario: "", precioTotal: 0
            });
            guardarYRenderizar();
            
            // Foco automático en el primer input del nuevo artículo
            setTimeout(() => {
                const inputs = itemsContainer.querySelectorAll(`tr[data-cat="${catIndex}"]`).lastChild?.querySelectorAll('input');
                if(inputs) inputs[0].focus();
            }, 50);
        }
    });

    // Escuchar cambios en los inputs de los artículos
    itemsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('input-art')) {
            const tr = e.target.closest('tr');
            const catIndex = tr.dataset.cat;
            const artIndex = tr.dataset.art;
            const campo = e.target.dataset.campo;
            
            pData.items[catIndex].subitems[artIndex][campo] = e.target.value;
            
            // Si cambia cantidad o precio, recalculamos pero no re-renderizamos todo (para no perder el foco del teclado)
            if (campo === 'cantidad' || campo === 'precioUnitario') {
                recalcularTotales();
                // Actualizamos solo el texto del total de esa fila y del subtotal de categoría para no parpadear
                tr.querySelector('td:last-child').textContent = `$${formatCLP(pData.items[catIndex].subitems[artIndex].precioTotal)}`;
                tr.closest('[data-cat-index]').querySelector('h3 span:last-child').textContent = `Subtotal: $${formatCLP(pData.items[catIndex].subtotal)}`;
                localDB.presupuestos.put(pData); // Guardado silencioso
            } else {
                localDB.presupuestos.put(pData); // Guardado silencioso de textos
            }
        }
    });

    // Escuchar cambios en la Utilidad Manual
    inputUtilidad.addEventListener('input', (e) => {
        recalcularTotales();
        localDB.presupuestos.put(pData);
    });

    // Inicializar visualmente
    if(pData.totales.utilidadManual > 0) {
        inputUtilidad.value = pData.totales.utilidadManual;
    }
    guardarYRenderizar();

    function obtenerFechaActual() {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const fecha = new Date();
        return `${fecha.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    }
});