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

    // Todo: Función para renderizar la lista de presupuestos desde Dexie en el Dashboard
});