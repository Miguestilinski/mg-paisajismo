// Este script manejará el historial local de un presupuesto activo.

export function renderizarRioVersiones(versiones, onRestoreCallback, mostrarFantasma = false, pDataActual = null) {
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

    // 1. Inyectar el "Fantasma" del Autoguardado si aplica (Siempre va arriba)
    if (mostrarFantasma && pDataActual) {
        const nodoFantasma = document.createElement('div');
        nodoFantasma.className = "relative z-10 flex items-start mb-6 group p-2 -ml-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 cursor-default opacity-80";
        nodoFantasma.innerHTML = `
            <div class="absolute left-4 top-4 w-3.5 h-3.5 rounded-full border-2 border-dashed border-zinc-400 bg-transparent ring-4 ring-white shadow-sm"></div>
            <div class="pl-12 w-full">
                <p class="text-xs text-zinc-400 mb-0.5 animate-pulse">Guardando...</p>
                <p class="text-sm text-zinc-600 font-medium leading-tight">Borrador actual</p>
                <p class="text-xs font-bold text-zinc-600 mt-1.5 bg-zinc-200/50 inline-block px-2 py-0.5 rounded">Neto: $${formatCLP(pDataActual.totales.totalNeto)}</p>
            </div>
        `;
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
        // Si hay fantasma, NINGUNA versión guardada es la "latest" visualmente activa
        const isLatest = index === 0 && !mostrarFantasma; 
        const colorPunto = isLatest ? 'bg-zinc-800 ring-zinc-200' : 'bg-zinc-300 ring-white';
        const colorTexto = isLatest ? 'text-zinc-900 font-bold' : 'text-zinc-600 font-medium';

        // Check for PDF export badge
        const badgePdf = ver.isPdfExport ? `<span class="ml-2 inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-white"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Exportado</span>` : '';

        const nodoHtml = document.createElement('div');
        nodoHtml.className = "relative z-10 flex items-start mb-6 group cursor-pointer hover:bg-white p-2 -ml-2 rounded-lg transition-colors border border-transparent hover:border-zinc-200 shadow-sm hover:shadow";
        nodoHtml.innerHTML = `
            <div class="absolute left-4 top-4 w-3.5 h-3.5 rounded-full ${colorPunto} ring-4 shadow-sm"></div>
            <div class="pl-12 w-full">
                <p class="text-xs text-zinc-400 mb-0.5">${formatearHora(ver.fechaHora)}</p>
                <p class="text-sm ${colorTexto} leading-tight flex items-center">${ver.etiqueta || 'Guardado manual'}${badgePdf}</p>
                <p class="text-xs font-bold text-zinc-800 mt-1.5 bg-zinc-100 inline-block px-2 py-0.5 rounded">Neto: $${formatCLP(ver.snapshot.totales.totalNeto)}</p>
            </div>
        `;

        nodoHtml.addEventListener('click', () => {
            const isIdentical = pDataActual && (stringifyParaComparar(ver.snapshot) === stringifyParaComparar(pDataActual));

            if (isIdentical) {
                // Alerta nativa a través del modal custom si no hay cambios
                window.customAlert(
                    "Versión Actual", 
                    "Ya estás visualizando esta versión. No hay cambios pendientes que restaurar.",
                    "bg-zinc-800",
                    "hover:bg-zinc-900"
                );
            } else {
                // Confirmación para sobreescribir borrador si hay cambios
                window.customConfirm(
                    "Restaurar Versión", 
                    `¿Restaurar la versión <b>"${ver.etiqueta}"</b> de las ${formatearHora(ver.fechaHora)}?<br><br>Cualquier modificación actual que no hayas guardado se perderá.`,
                    "Sí, restaurar",
                    "bg-blue-600",
                    "hover:bg-blue-700"
                ).then((confirmed) => {
                    if(confirmed) onRestoreCallback(ver.snapshot);
                });
            }
        });

        contenedor.appendChild(nodoHtml);
    });
}

function formatearHora(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('es-CL');
}