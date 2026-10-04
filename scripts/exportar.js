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
        // Skip hidden inputs
        if (input.classList.contains('hidden')) return;

        let valor = input.value;
        const esVacio = valor.trim() === '';
        
        // Si es el detalle (que tiene placeholder pero no valor), lo dejamos totalmente vacío
        if (esVacio && input.dataset.campo === 'detalle') valor = '';
        // Si es cantidad o precio (numéricos) vacíos, dejamos vacío para que no salgan símbolos raros
        else if (esVacio && input.dataset.campo !== 'descripcion') valor = '';
        // Para textos generales vacíos, un espacio duro mantiene la altura de línea
        else if (esVacio) valor = '&nbsp;';

        const span = document.createElement(input.tagName.toLowerCase() === 'textarea' ? 'div' : 'div');
        
        // Copiamos clases críticas de alineación y tipografía, omitiendo 'w-full' que rompe celdas de tabla
        const clasesParaCopiar = ['text-center', 'text-right', 'font-bold', 'text-sm', 'text-lg', 'font-semibold', 'pl-6'];
        const clasesBase = input.className.split(' ').filter(c => clasesParaCopiar.includes(c)).join(' ');
        
        // Estilos específicos
        let estilosExtra = '';
        if (input.tagName.toLowerCase() === 'textarea') {
            estilosExtra = 'whitespace-pre-wrap word-break-normal pt-2';
            if (esVacio) estilosExtra += ' hidden'; 
        } else {
            // Un div bloque asegura que la alineación (text-right) funcione igual que en el input
            estilosExtra = 'block w-full px-1.5 py-0.5 text-zinc-900 truncate'; 
            
            // Fix para los inputs de cantidad y precio (que tienen pl-6 por el signo $)
            if(input.dataset.campo === 'precioUnitario') {
                estilosExtra = estilosExtra.replace('px-1.5', '');
            }
        }

        span.className = `${clasesBase} ${estilosExtra} print-text-element`;
        span.innerHTML = valor;
        
        // Ocultar input nativo, mostrar texto plano
        input.classList.add('print:hidden');
        input.parentNode.insertBefore(span, input.nextSibling);
    });
}

function restaurarInputsPostImpresion() {
    // Eliminar los spans de texto plano
    document.querySelectorAll('.print-text-element').forEach(el => el.remove());
    // Restaurar los inputs
    document.querySelectorAll('#hoja-presupuesto .print\\:hidden').forEach(el => el.classList.remove('print:hidden'));
}