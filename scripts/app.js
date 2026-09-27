import { db as nubeDB } from './firebase-config.js';
import { localDB } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnNuevo = document.getElementById('btn-nuevo-presupuesto');

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

    // Función para renderizar la lista de presupuestos
    async function cargarPresupuestos() {
        const lista = document.getElementById('lista-presupuestos');
        lista.innerHTML = ''; // Limpiar lista

        // Obtener todos y ordenar por fecha de modificación (Más recientes arriba)
        const presupuestos = await localDB.presupuestos.toArray();
        presupuestos.sort((a, b) => new Date(b.fechaModificacion) - new Date(a.fechaModificacion));

        if (presupuestos.length === 0) {
            lista.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-zinc-500 font-medium">Aún no tienes presupuestos creados. ¡Comienza uno nuevo!</td></tr>`;
            return;
        }

        const formatCLP = (num) => new Intl.NumberFormat('es-CL').format(Math.round(num));
        const formatFecha = (isoString) => {
            const date = new Date(isoString);
            const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
        };

        presupuestos.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-zinc-50/80 transition-colors group cursor-pointer border-b border-zinc-100";

            // Lógica de Badges (Actualmente todos son locales, la lógica Nube se completará con Firebase)
            const badgeLocal = `<span class="bg-zinc-200 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg> Local</span>`;
            
            // Ejemplo: si existiera un campo cloudId, mostramos el badge
            const badgeNube = p.cloudId ? `<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg> Nube</span>` : '';

            const nombreProyecto = p.codigoProyecto && p.codigoProyecto !== "Nuevo Proyecto" ? p.codigoProyecto : "Proyecto sin nombre";
            const nombreConstructora = p.cliente?.constructora || 'Sin constructora especificada';
            const totalNeto = p.totales?.totalNeto || 0;

            tr.innerHTML = `
                <td class="p-5 text-zinc-500 text-sm whitespace-nowrap align-middle">${formatFecha(p.fechaModificacion)}</td>
                <td class="p-5 align-middle">
                    <div class="flex items-center gap-2 mb-0.5">
                        <input type="text" class="input-nombre-proyecto bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900 rounded-md px-1.5 py-0.5 -ml-1.5 font-bold text-zinc-900 transition-all w-full max-w-sm text-base truncate outline-none" value="${nombreProyecto}" data-id="${p.id}" title="Haz clic para editar">
                        ${badgeLocal}
                        ${badgeNube}
                    </div>
                    <div class="text-sm text-zinc-500 font-normal truncate max-w-sm">${nombreConstructora}</div>
                </td>
                <td class="p-5 font-extrabold text-zinc-800 whitespace-nowrap align-middle">$${formatCLP(totalNeto)}</td>
                <td class="p-5 text-right whitespace-nowrap align-middle">
                    <button class="text-zinc-400 group-hover:text-zinc-900 font-bold transition-colors flex items-center justify-end w-full gap-1">
                        Abrir
                        <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </td>
            `;

            // Navegar al editor si se hace clic en la fila (excepto en el input del nombre)
            tr.addEventListener('click', (e) => {
                if (e.target.classList.contains('input-nombre-proyecto')) return;
                window.location.href = `editor.html?id=${p.id}`;
            });

            lista.appendChild(tr);
        });

        // Lógica para guardar la edición del nombre del proyecto
        document.querySelectorAll('.input-nombre-proyecto').forEach(input => {
            // Evitar que el click en el input abra la fila
            input.addEventListener('click', (e) => e.stopPropagation());
            
            // Guardar al perder el foco o presionar Enter
            const guardarNombre = async (e) => {
                const id = e.target.dataset.id;
                const nuevoNombre = e.target.value.trim() || 'Proyecto sin nombre';
                const presupuesto = await localDB.presupuestos.get(id);
                
                if (presupuesto && presupuesto.codigoProyecto !== nuevoNombre) {
                    presupuesto.codigoProyecto = nuevoNombre;
                    presupuesto.fechaModificacion = new Date().toISOString();
                    await localDB.presupuestos.put(presupuesto);
                    // Opcionalmente podemos volver a cargar para que suba al principio por la modificación:
                    // cargarPresupuestos(); 
                }
            };

            input.addEventListener('change', guardarNombre);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur(); // Dispara el evento change automáticamente
                }
            });
        });
    }

    // Inicializar la tabla al cargar la página
    cargarPresupuestos();
});