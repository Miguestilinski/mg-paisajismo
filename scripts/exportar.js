// scripts/editor/exportar.js

/**
 * Prepara el DOM para impresión (convirtiendo inputs a texto), actualiza el historial de versiones,
 * y lanza el diálogo de impresión nativo.
 */
export async function manejarExportacionPDF(pData, hayCambiosSinConfirmar, guardarYRenderizar) {
    const isDirty = hayCambiosSinConfirmar();
    const versionesReales = (pData.historialVersiones || []).filter(v => v.etiqueta !== "Autoguardado en Nube");
    
    // 1. Lógica del Historial (Crear nodo o poner badge)
    if (versionesReales.length > 0) {
        if (isDirty) {
            const snapshotLimpio = JSON.parse(JSON.stringify(pData));
            delete snapshotLimpio.historialVersiones;
            pData.historialVersiones = versionesReales;
            
            pData.historialVersiones.push({
                versionId: `v_pdf_${Date.now()}`,
                fechaHora: new Date().toISOString(),
                etiqueta: "Autoguardado (Impresión)",
                isPdfExport: true,
                snapshot: snapshotLimpio
            });
        } else {
            pData.historialVersiones[pData.historialVersiones.length - 1].isPdfExport = true;
        }
    } else {
        const snapshotLimpio = JSON.parse(JSON.stringify(pData));
        delete snapshotLimpio.historialVersiones;
        
        pData.historialVersiones = [{
            versionId: `v_pdf_${Date.now()}`,
            fechaHora: new Date().toISOString(),
            etiqueta: "Primera exportación",
            isPdfExport: true,
            snapshot: snapshotLimpio
        }];
    }
    
    await guardarYRenderizar();

    // 2. Preparar el DOM para impresión (Inputs a Texto)
    prepararInputsParaImpresion();

    // 3. Modificar el título para el nombre del archivo PDF
    const tituloOriginal = document.title;
    let nombreLimpio = (pData.codigoProyecto || "Sin Nombre").trim().toLowerCase();
    nombreLimpio = nombreLimpio.replace(/\b\w/g, l => l.toUpperCase()).replace(/[/\\?%*:|"<>]/g, '-');
    document.title = `Presupuesto ${nombreLimpio}`;
    
    // 4. Imprimir (El navegador bloquea aquí)
    window.print();
    
    // 5. Restaurar el DOM a la normalidad
    restaurarInputsPostImpresion();
    setTimeout(() => document.title = tituloOriginal, 1000);
}

function prepararInputsParaImpresion() {
    const inputs = document.querySelectorAll('#hoja-presupuesto input[type="text"], #hoja-presupuesto textarea');
    inputs.forEach(input => {
        // Ignorar inputs que ya están ocultos (ej. placeholders nativos de Flatpickr)
        if (input.classList.contains('hidden')) return;

        let valor = input.value;
        const esVacio = valor.trim() === '';
        
        if (esVacio && input.dataset.campo === 'detalle') valor = '';
        else if (esVacio && input.dataset.campo !== 'descripcion') valor = '';
        else if (esVacio) valor = '&nbsp;';

        const span = document.createElement('div');
        
        const clasesParaCopiar = ['text-center', 'text-right', 'font-bold', 'text-sm', 'text-lg', 'font-semibold', 'pl-6'];
        const clasesBase = input.className.split(' ').filter(c => clasesParaCopiar.includes(c)).join(' ');
        
        let estilosExtra = 'print:whitespace-normal print:break-words '; // Asegura que textos largos no se corten
        
        if (input.tagName.toLowerCase() === 'textarea') {
            estilosExtra += 'whitespace-pre-wrap word-break-normal pt-2';
            if (esVacio) estilosExtra += ' hidden'; 
        } else {
            // Reemplazamos truncate por comportamiento normal
            estilosExtra += 'block w-full px-1.5 py-0.5 text-zinc-900'; 
            
            if(input.dataset.campo === 'precioUnitario') {
                estilosExtra = estilosExtra.replace('px-1.5', '');
            }
        }

        span.className = `${clasesBase} ${estilosExtra} print-text-element`;
        span.innerHTML = valor;
        
        // Etiquetar el input para saber cuál ocultamos nosotros y no romper otros print:hidden
        input.classList.add('hide-for-print-swap', 'print:hidden');
        input.parentNode.insertBefore(span, input.nextSibling);
    });
}

function restaurarInputsPostImpresion() {
    document.querySelectorAll('.print-text-element').forEach(el => el.remove());
    document.querySelectorAll('.hide-for-print-swap').forEach(el => {
        el.classList.remove('print:hidden', 'hide-for-print-swap');
    });
}