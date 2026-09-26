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

    // Delegación de eventos para inputs numéricos (Autoguardado al soltar la tecla)
    const hojaPresupuesto = document.getElementById('hoja-presupuesto');
    hojaPresupuesto.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            console.log("Cambio registrado para autoguardado en Dexie");
            // Aquí enlazaremos la matemática pronto
        }
    });

    function obtenerFechaActual() {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const fecha = new Date();
        return `${fecha.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    }
});