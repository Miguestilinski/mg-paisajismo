// Este script manejará el historial local de un presupuesto activo.

export function renderizarRioVersiones(versiones, onRestoreCallback) {
    const contenedor = document.getElementById('rio-versiones');
    contenedor.innerHTML = '<div class="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-200 z-0"></div>';

    if (!versiones || versiones.length === 0) {
        contenedor.innerHTML += `
            <div class="relative z-10 pl-14 py-4 text-sm text-zinc-500 italic">
                Aún no hay versiones guardadas.
            </div>
        `;
        return;
    }

    // Ordenar del más nuevo (arriba) al más viejo (abajo)
    const versionesOrdenadas = [...versiones].sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));

    versionesOrdenadas.forEach((ver, index) => {
        const isLatest = index === 0;
        const colorPunto = isLatest ? 'bg-zinc-800 ring-zinc-200' : 'bg-zinc-300 ring-white';
        const colorTexto = isLatest ? 'text-zinc-900 font-bold' : 'text-zinc-600 font-medium';
        const formatCLP = (num) => new Intl.NumberFormat('es-CL').format(Math.round(num));

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
            if (confirm(`¿Restaurar la versión "${ver.etiqueta}" de las ${formatearHora(ver.fechaHora)}?\n\nLos cambios actuales no guardados se perderán.`)) {
                onRestoreCallback(ver.snapshot);
            }
        });

        contenedor.appendChild(nodoHtml);
    });
}

function formatearHora(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('es-CL');
}