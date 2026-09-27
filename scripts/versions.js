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

    versionesOrdenadas.forEach((ver, index) => {
        // Si hay fantasma, NINGUNA versión guardada es la "latest" visualmente activa
        const isLatest = index === 0 && !mostrarFantasma; 
        const colorPunto = isLatest ? 'bg-zinc-800 ring-zinc-200' : 'bg-zinc-300 ring-white';
        const colorTexto = isLatest ? 'text-zinc-900 font-bold' : 'text-zinc-600 font-medium';

        const nodoHtml = document.createElement('div');
        nodoHtml.className = "relative z-10 flex items-start mb-6 group cursor-pointer hover:bg-white p-2 -ml-2 rounded-lg transition-colors border border-transparent hover:border-zinc-200 shadow-sm hover:shadow";
        nodoHtml.innerHTML = `
            <div class="absolute left-4 top-4 w-3.5 h-3.5 rounded-full ${colorPunto} ring-4 shadow-sm"></div>
            <div class="pl-12 w-full">
                <p class="text-xs text-zinc-400 mb-0.5">${formatearHora(ver.fechaHora)}</p>
                <p class="text-sm ${colorTexto} leading-tight">${ver.etiqueta || 'Guardado manual'}</p>
                <p class="text-xs font-bold text-zinc-800 mt-1.5 bg-zinc-100 inline-block px-2 py-0.5 rounded">Neto: $${formatCLP(ver.snapshot.totales.totalNeto)}</p>
            </div>
        `;

        nodoHtml.addEventListener('click', () => {
            // Llamamos a la función asíncrona del Modal Custom inyectada desde editor.js
            window.customConfirm(
                "Restaurar Versión", 
                `¿Restaurar la versión "${ver.etiqueta}" de las ${formatearHora(ver.fechaHora)}?<br><br>Los cambios actuales no guardados se perderán.`,
                "Sí, restaurar",
                "bg-blue-600",
                "hover:bg-blue-700"
            ).then((confirmed) => {
                if(confirmed) onRestoreCallback(ver.snapshot);
            });
        });

        contenedor.appendChild(nodoHtml);
    });
}

function formatearHora(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('es-CL');
}