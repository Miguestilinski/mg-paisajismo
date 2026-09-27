// scripts/importar.js

export function setupImport(pData, guardarCallback) {
    const btnImportar = document.getElementById('btn-pegar-riego');
    const modal = document.getElementById('modal-importar');
    const box = document.getElementById('modal-importar-box');
    const btnCancel = document.getElementById('btn-modal-importar-cancel');
    const btnOk = document.getElementById('btn-modal-importar-ok');
    const fileInput = document.getElementById('importar-file');

    if(!btnImportar || !modal) return;

    const cleanup = () => {
        box.classList.remove('scale-100');
        box.classList.add('scale-95');
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
        fileInput.value = '';
    };

    btnImportar.addEventListener('click', () => {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100');
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
        }, 10);
    });

    btnCancel.addEventListener('click', cleanup);

    btnOk.addEventListener('click', async () => {
        let texto = '';
        
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const nombreArchivo = file.name.toLowerCase();

            try {
                if (nombreArchivo.endsWith('.xlsx') || nombreArchivo.endsWith('.xls') || nombreArchivo.endsWith('.csv')) {
                    texto = await extraerTextoExcel(file);
                } else if (nombreArchivo.endsWith('.docx')) {
                    texto = await extraerTextoWord(file);
                } else {
                    texto = await file.text();
                }
            } catch (e) {
                window.customAlert("Error", "No se pudo leer el archivo adjunto.", "bg-red-500", "hover:bg-red-600");
                return;
            }
        } else {
            window.customAlert("Atención", "Por favor, selecciona un archivo para importar.", "bg-amber-500", "hover:bg-amber-600");
            return;
        }

        if (!texto) {
            window.customAlert("Atención", "El archivo está vacío o no se pudo extraer información.", "bg-amber-500", "hover:bg-amber-600");
            return;
        }

        procesarDatos(texto, pData, guardarCallback);
        cleanup();
    });
}

// Extrae texto de un archivo Excel usando SheetJS
async function extraerTextoExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                // Asumimos que la tabla principal está en la primera hoja
                const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
                // Convertimos la hoja a CSV (texto plano separado por comas/puntos y comas)
                const csvTexto = XLSX.utils.sheet_to_csv(primeraHoja, { FS: "\t" }); // Forzamos tabulaciones para compatibilidad con la heurística
                resolve(csvTexto);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Extrae texto de un archivo Word usando Mammoth.js
async function extraerTextoWord(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                .then(function(result) {
                    // Mammoth extrae todo el texto, las tablas pueden quedar separadas por \n
                    // Será procesado por la heurística de saltos de línea
                    resolve(result.value); 
                })
                .catch(reject);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function procesarDatos(texto, pData, guardarCallback) {
    let subitemsProcesados = [];

    // 1. Intentar parsear como JSON directo
    try {
        const json = JSON.parse(texto);
        if (Array.isArray(json)) {
            // Si es un array de objetos con formato similar a nuestros subitems
            subitemsProcesados = json.map(item => ({
                descripcion: item.descripcion || item.nombre || '',
                detalle: item.detalle || '',
                cantidad: parseFloat(item.cantidad) || 1,
                unidad: item.unidad || 'unid',
                precioUnitario: parseFloat(item.precioUnitario || item.precio) || 0,
                precioTotal: 0
            }));
        }
    } catch(e) {
        // No es JSON, procesar como Texto / TSV / CSV / Markdown (Heurística)
        const lineas = texto.split('\n').filter(l => l.trim().length > 0);

        lineas.forEach(linea => {
            // Separar por tabulaciones (clásico al pegar de Excel/Word) o pipes (Markdown)
            let columnas = linea.split('\t');
            if (columnas.length < 2) columnas = linea.split('|').filter(c => c.trim().length > 0);
            if (columnas.length < 2) columnas = [linea]; 

            columnas = columnas.map(c => c.trim());
            
            // Ignorar filas de encabezado comunes
            if (columnas[0].toLowerCase().includes('nombre') || columnas[0].includes('---')) return;

            // Construir el artículo intentando deducir el orden (Nombre, Detalle, Cantidad, Unidad, Precio)
            const art = {
                descripcion: columnas[0] || '',
                detalle: columnas[1] || '',
                cantidad: 1,
                unidad: 'unid',
                precioUnitario: 0,
                precioTotal: 0
            };

            if (columnas.length >= 3) {
                if (columnas.length >= 5) {
                    // Formato completo de 5 columnas
                    art.cantidad = parseFloat(columnas[2].replace(/[^0-9,.]/g, '').replace(',', '.')) || 1;
                    art.unidad = columnas[3] || 'unid';
                    art.precioUnitario = parseFloat(columnas[4].replace(/[^0-9]/g, '')) || 0;
                } else {
                    // Heurística simple: Asumimos que la última columna es el precio
                    art.precioUnitario = parseFloat(columnas[columnas.length - 1].replace(/[^0-9]/g, '')) || 0;
                }
            }
            
            subitemsProcesados.push(art);
        });
    }

    if (subitemsProcesados.length > 0) {
        // En lugar de sobreescribir todo, añadimos una nueva categoría
        pData.items.push({
            id: 'cat_import_' + Date.now(),
            titulo: 'DATOS IMPORTADOS',
            subitems: subitemsProcesados,
            subtotal: 0
        });
        
        window.customAlert("Éxito", `Se extrajeron ${subitemsProcesados.length} elementos. Se ha creado una nueva categoría "DATOS IMPORTADOS" al final del presupuesto.`, "bg-emerald-500", "hover:bg-emerald-600");
        guardarCallback();
    } else {
        window.customAlert("Error de Formato", "No se pudo reconocer la estructura de los datos. Asegúrate de copiar las columnas correctamente desde Excel.", "bg-red-500", "hover:bg-red-600");
    }
}