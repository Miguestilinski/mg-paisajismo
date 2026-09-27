// Este script manejará el historial local de un presupuesto activo.

export function renderizarRioVersiones(versiones, onRestoreCallback, mostrarFantasma = false, pDataActual = null, idVersionVistaPrevia = null) {
    const contenedor = document.getElementById('rio-versiones');
    contenedor.innerHTML = '<div class="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-200 z-0"></div>';
    
    const formatCLP = (num) => new Intl.NumberFormat('es-CL').format(Math.round(num));

    if ((!versiones || versiones.length === 0) && !mostrarFantasma) {
        contenedor.innerHTML += `
            <div class="relative z-10 pl-14 py-4 text-sm text-zinc-500 italic">
                Aún no hay versiones guardadas.
            </div>
        `;
        return;
    }

    const esVistaPreviaActiva = idVersionVistaPrevia !== null;

    // 1. Inyectar el "Fantasma" del Autoguardado SOLO si hay cambios sin confirmar
    if ((mostrarFantasma && pDataActual) || (esVistaPreviaActiva && pDataActual && mostrarFantasma)) {
        const nodoFantasma = document.createElement('div');
        
        // Si hay una vista previa activa, el borrador actual se vuelve clickeable para salir
        if (esVistaPreviaActiva) {
            nodoFantasma.className = "relative z-10 flex items-start mb-6 group p-2 -ml-2 rounded-lg border-2 border-dashed border-zinc-300 bg-white cursor-pointer hover:bg-zinc-50 transition-colors shadow-sm";
            nodoFantasma.innerHTML = `
                <div class="absolute left-4 top-4 w-3.5 h-3.5 rounded-full border-2 border-dashed border-zinc-400 bg-transparent ring-4 ring-white shadow-sm"></div>
                <div class="pl-10 w-full flex flex-col justify-center min-h-[14px]">
                    <span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 border border-emerald-200 self-start">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Actual
                    </span>
                    <p class="text-sm text-zinc-900 font-bold leading-tight mt-1">Volver al borrador</p>
                    <p class="text-xs text-zinc-500 mt-0.5">Click para salir de la vista previa</p>
                </div>
            `;
            // Clickeable: Llama al callback pasando NULL para indicar "salir"
            nodoFantasma.addEventListener('click', () => onRestoreCallback(null, null, true));
        } else {
            nodoFantasma.className = "relative z-10 flex items-start mb-6 group p-2 -ml-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 cursor-default opacity-80";
            nodoFantasma.innerHTML = `
                <div class="absolute left-4 top-4 w-3.5 h-3.5 rounded-full border-2 border-dashed border-zinc-400 bg-transparent ring-4 ring-white shadow-sm"></div>
                <div class="pl-10 w-full flex flex-col justify-center min-h-[14px]">
                    <span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 border border-emerald-200 self-start">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Actual
                    </span>
                    <p class="text-sm text-zinc-600 font-medium leading-tight mt-1">Borrador actual</p>
                    <div><p class="text-xs font-bold text-zinc-600 mt-1 bg-zinc-200/50 inline-block px-2 py-0.5 rounded">Neto: $${formatCLP(pDataActual.totales.totalNeto)}</p></div>
                </div>
            `;
        }
        
        contenedor.appendChild(nodoFantasma);
    }

    // Ordenar del más nuevo (arriba) al más viejo (abajo)
    const versionesOrdenadas = [...(versiones || [])].sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));

    const stringifyParaComparar = (data) => {
        if (!data) return "";
        return JSON.stringify({
            cliente: data.cliente || {},
            codigoProyecto: data.codigoProyecto || "",
            encabezadoTexto: data.encabezadoTexto || "",
            items: data.items || [],
            totales: data.totales || {}
        });
    };

    versionesOrdenadas.forEach((ver, index) => {
        // Si no hay fantasma (no hay cambios sin confirmar), el índice 0 ES la versión actual.
        const isLatest = index === 0 && !mostrarFantasma; 
        const isEnVistaPrevia = ver.versionId === idVersionVistaPrevia;
        
        let colorPunto = 'bg-zinc-300 ring-white';
        let colorTexto = 'text-zinc-600 font-medium';
        let animacionPunto = '';
        let badgeActual = '';

        if (isEnVistaPrevia) {
            colorPunto = 'bg-amber-500 ring-amber-200';
            colorTexto = 'text-amber-900 font-bold';
            animacionPunto = '<div class="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-75"></div>';
        } else if (isLatest) {
            colorPunto = 'bg-zinc-800 ring-zinc-200';
            colorTexto = 'text-zinc-900 font-bold';
            badgeActual = `<span class="ml-2 inline-flex items-center gap-1 rounded bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 ${esVistaPreviaActiva ? '' : 'animate-pulse'}"></span> Actual</span>`;
        }

        const badgePdf = ver.isPdfExport ? `<span class="ml-2 inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-white"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Exportado</span>` : '';

        const nodoHtml = document.createElement('div');
        nodoHtml.className = `relative z-10 flex items-start mb-6 group cursor-pointer hover:bg-white p-2 -ml-2 rounded-lg transition-colors border ${isEnVistaPrevia ? 'border-amber-300 bg-amber-50/30' : 'border-transparent hover:border-zinc-200 hover:shadow-sm'}`;
        
        // Instrucción de salida si hacemos clic en el nodo actual durante vista previa
        let instruccionSalida = (isLatest && esVistaPreviaActiva && !isEnVistaPrevia) ? `<p class="text-[11px] text-zinc-500 mt-1 font-medium">Click para salir de vista previa</p>` : '';

        nodoHtml.innerHTML = `
            <div class="absolute left-4 top-4 w-3.5 h-3.5 rounded-full ${colorPunto} ring-4 shadow-sm">
                ${animacionPunto}
            </div>
            <div class="pl-10 w-full flex flex-col justify-center min-h-[14px]">
                <p class="text-xs text-zinc-400 mb-0.5">${formatearHora(ver.fechaHora)}</p>
                <p class="text-sm ${colorTexto} leading-tight flex flex-wrap items-center gap-y-1">${ver.etiqueta || 'Guardado manual'}${badgeActual}${badgePdf}</p>
                ${instruccionSalida}
                <div><p class="text-xs font-bold text-zinc-800 mt-1.5 bg-zinc-100 inline-block px-2 py-0.5 rounded">Neto: $${formatCLP(ver.snapshot.totales.totalNeto)}</p></div>
            </div>
        `;

        nodoHtml.addEventListener('click', () => {
            // Si hacemos clic en la versión que ya estamos previsualizando o en el nodo Actual para salir
            if (isEnVistaPrevia || (isLatest && esVistaPreviaActiva)) {
                onRestoreCallback(null, null, true);
                return;
            }

            const isIdentical = pDataActual && (stringifyParaComparar(ver.snapshot) === stringifyParaComparar(pDataActual));

            if (isIdentical && !esVistaPreviaActiva) {
                window.customAlert(
                    "Versión Actual", 
                    "Ya estás visualizando esta versión o su contenido exacto.",
                    "bg-zinc-800",
                    "hover:bg-zinc-900"
                );
            } else {
                // Dispara el callback pero en Modo Vista Previa
                onRestoreCallback(ver.snapshot, ver);
            }
        });

        contenedor.appendChild(nodoHtml);
    });
}

function formatearHora(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('es-CL');
}