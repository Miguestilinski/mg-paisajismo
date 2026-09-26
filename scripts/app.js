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

    btnVolver.addEventListener('click', () => {
        // TODO: Disparar autoguardado antes de salir
        editorView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    btnImprimir.addEventListener('click', () => {
        window.print();
    });

    // === REACTIVIDAD UI ===

    // Reflejar el nombre del destinatario en el saludo de la carta
    inputDestinatario.addEventListener('input', (e) => {
        const valor = e.target.value.trim();
        lblSaludoNombre.textContent = valor !== '' ? valor : '[Nombre]';
    });

    // Delegación de eventos para inputs numéricos (Autoguardado y Cálculo al soltar la tecla)
    const hojaPresupuesto = document.getElementById('hoja-presupuesto');
    hojaPresupuesto.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Aquí llamaremos a la función recalcularTotales() más adelante
            console.log("Detectado cambio en:", e.target.id || "campo dinámico");
            // Aquí dispararemos el guardado en Dexie/IndexedDB local
        }
    });

    // Funciones Auxiliares
    function resetearEditor() {
        document.getElementById('fecha-input').value = `Santiago, ${obtenerFechaActual()}`;
        inputDestinatario.value = '';
        document.getElementById('constructora-input').value = '';
        document.getElementById('proyecto-input').value = '';
        document.getElementById('intro-texto').value = 'Según lo solicitado por Uds., referente al presupuesto de paisajismo y riego...';
        lblSaludoNombre.textContent = '[Nombre]';
        document.getElementById('items-container').innerHTML = ''; // Limpia ítems
        // Reset totales
        document.getElementById('lbl-costo-directo').textContent = '$0';
        document.getElementById('lbl-gastos-generales').textContent = '$0';
        document.getElementById('input-utilidad').value = '';
        document.getElementById('lbl-total-neto').textContent = '$0';
    }

    function obtenerFechaActual() {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const fecha = new Date();
        return `${fecha.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    }
});