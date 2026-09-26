// Este script manejará el historial local de un presupuesto activo.

export function renderizarRioVersiones(versiones) {
    const contenedor = document.getElementById('rio-versiones');
    // Limpiamos contenido manteniendo la línea base
    contenedor.innerHTML = '<div class="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>';

    if (!versiones || versiones.length === 0) {
        contenedor.innerHTML += `
            <div class="relative z-10 pl-16 py-4 text-sm text-gray-500 italic">
                Aún no hay puntos de guardado.
            </div>
        `;
        return;
    }

    versiones.forEach((ver, index) => {
        const isLatest = index === 0; // Asumimos que la lista viene ordenada del más nuevo al más viejo
        const colorPunto = isLatest ? 'bg-blue-500 ring-blue-200' : 'bg-gray-400 ring-gray-100';
        const colorTexto = isLatest ? 'text-gray-900 font-bold' : 'text-gray-600';
        
        const nodoHtml = `
            <div class="relative z-10 flex items-start mb-6 group cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded transition-colors">
                <!-- Círculo del Nodo -->
                <div class="absolute left-4 top-4 w-4 h-4 rounded-full ${colorPunto} ring-4 shadow-sm"></div>
                
                <div class="pl-14 w-full">
                    <p class="text-xs text-gray-500 mb-1">${formatearHora(ver.fechaHora)}</p>
                    <p class="text-sm ${colorTexto}">${ver.etiqueta || 'Guardado automático'}</p>
                    <p class="text-xs font-semibold text-green-700 mt-1">Neto: $${ver.montoNetoFormateado}</p>
                </div>
            </div>
        `;
        contenedor.insertAdjacentHTML('beforeend', nodoHtml);
    });
}

function formatearHora(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('es-CL');
}

// Ejemplo temporal para verificar que se ve bien en la UI:
document.addEventListener('DOMContentLoaded', () => {
    const mockVersiones = [
        { fechaHora: new Date().toISOString(), etiqueta: 'Versión actual', montoNetoFormateado: '93.967.498' },
        { fechaHora: new Date(Date.now() - 3600000).toISOString(), etiqueta: 'Agregado juegos infantiles', montoNetoFormateado: '85.450.000' }
    ];
    renderizarRioVersiones(mockVersiones);
});