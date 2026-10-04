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
        
        // Si está vacío, le ponemos un espacio irrompible para mantener la altura y alineación en la tabla
        if (esVacio) valor = '&nbsp;';
        // Si es el detalle (que tiene placeholder pero no valor), lo dejamos vacío
        if (esVacio && input.dataset.campo === 'detalle') valor = '';

        const span = document.createElement(input.tagName.toLowerCase() === 'textarea' ? 'div' : 'span');
        
        // Copiamos clases críticas de alineación y tipografía, pero omitimos bordes, fondos y anchos forzados
        const clasesParaCopiar = ['text-center', 'text-right', 'font-bold', 'text-sm', 'text-lg', 'font-semibold', 'w-full', 'pl-6'];
        const clasesBase = input.className.split(' ').filter(c => clasesParaCopiar.includes(c)).join(' ');
        
        // Estilos específicos para emular textarea
        let estilosExtra = '';
        if (input.tagName.toLowerCase() === 'textarea') {
            estilosExtra = 'whitespace-pre-wrap word-break-normal min-h-[120px] p-3';
            // Si el textarea está vacío (y no es el saludo), lo colapsamos en la impresión
            if (esVacio) estilosExtra += ' hidden'; 
        } else {
            // Padding equivalente al input para que no salte el texto
            estilosExtra = 'p-1.5 inline-block'; 
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