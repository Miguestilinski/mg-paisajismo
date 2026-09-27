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
    const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let categoriasImportadas = [];
    let categoriaActual = { titulo: "DATOS IMPORTADOS", subitems: [] };
    let tituloPendiente = "DATOS IMPORTADOS";

    // Parseo seguro de números formato Chile (Ej: 1.300 -> 1300 | 0,7 -> 0.7)
    const parseNum = (str) => {
        if (!str) return NaN;
        let s = str.toString().trim();
        if (s.includes(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            if ((s.match(/\./g) || []).length > 1) {
                s = s.replace(/\./g, '');
            } else if (/\.\d{3}$/.test(s)) {
                s = s.replace('.', '');
            }
        }
        return parseFloat(s);
    };
    const parsePrecio = (str) => parseInt(str.toString().replace(/[^0-9]/g, ''), 10) || 0;

    lineas.forEach(linea => {
        let cols = linea.split('\t').map(c => c.trim()).filter(c => c !== '');
        if (cols.length < 2) cols = linea.split('|').map(c => c.trim()).filter(c => c !== '');
        cols = cols.filter(c => c !== '' && c !== '-');

        // Posible título de categoría o texto basura
        if (cols.length < 2) {
            let posibleTitulo = linea.trim();
            // Ignorar líneas muy largas (párrafos), totales, o números aislados
            if (posibleTitulo.length > 65 || /total/i.test(posibleTitulo) || !isNaN(parseNum(posibleTitulo))) {
                return; 
            }
            tituloPendiente = posibleTitulo;
            return;
        }

        // Evaluar si es un Ítem usando Heurística Estricta
        let art = null;
        const numCol0 = parseNum(cols[0]);
        const numCol2 = cols.length > 2 ? parseNum(cols[2]) : NaN;

        // Formato 1 (Documento Word de la Moni): Cantidad | Unidad | Descripcion | Precio | Total
        if (!isNaN(numCol0) && numCol0 > 0 && cols.length >= 3 && isNaN(parseNum(cols[1]))) {
            art = {
                descripcion: cols[2] || '',
                detalle: '',
                cantidad: numCol0,
                unidad: cols[1] || 'unid',
                precioUnitario: cols[3] ? parsePrecio(cols[3]) : 0,
                precioTotal: 0
            };
        } 
        // Formato 2 (Excel Estándar App): Descripcion | Detalle | Cantidad | Unidad | Precio | Total
        else if (!isNaN(numCol2) && numCol2 > 0 && isNaN(numCol0) && cols.length >= 4) {
            art = {
                descripcion: cols[0] || '',
                detalle: cols[1] || '',
                cantidad: numCol2,
                unidad: cols[3] || 'unid',
                precioUnitario: cols[4] ? parsePrecio(cols[4]) : 0,
                precioTotal: 0
            };
        }

        // Si detectamos un ítem válido (que tenga nombre real y precio/cantidad > 0)
        if (art && art.descripcion.trim().length > 2 && !/nombre|descripci[óo]n/i.test(art.descripcion)) {
            // Iniciar nueva categoría si teníamos un título pendiente
            if (tituloPendiente && categoriaActual.subitems.length > 0) {
                categoriasImportadas.push(categoriaActual);
                categoriaActual = { titulo: tituloPendiente.toUpperCase(), subitems: [] };
            } else if (tituloPendiente && categoriaActual.subitems.length === 0) {
                categoriaActual.titulo = tituloPendiente.toUpperCase();
            }
            
            categoriaActual.subitems.push(art);
            tituloPendiente = null; // Título consumido
        }
    });

    // Agregamos la última categoría procesada
    if (categoriaActual.subitems.length > 0) {
        categoriasImportadas.push(categoriaActual);
    }

    if (categoriasImportadas.length > 0) {
        let itemsAñadidos = 0;
        
        categoriasImportadas.forEach(catImport => {
            // Buscar si ya existe una categoría con ese nombre exacto en el editor
            const catExistenteIndex = pData.items.findIndex(c => c.titulo.toUpperCase().trim() === catImport.titulo.trim());
            
            if (catExistenteIndex !== -1) {
                // Existe, fusionar elementos si está en modo simple (si es compuesto, por ahora la forzamos a simple o creamos nueva, pero asumimos simple por defecto para importar)
                if(!pData.items[catExistenteIndex].modo || pData.items[catExistenteIndex].modo === 'simple') {
                    pData.items[catExistenteIndex].subitems.push(...catImport.subitems);
                } else {
                    // Si es compuesto, creamos un subgrupo temporal llamado "Importados"
                    pData.items[catExistenteIndex].subgrupos.push({
                        id: 'sub_import_' + Date.now(),
                        tituloSubgrupo: "Importados",
                        subitems: catImport.subitems,
                        subtotal: 0
                    });
                }
            } else {
                // No existe, crear nueva categoría al final
                pData.items.push({
                    id: 'cat_import_' + Date.now() + Math.random().toString(36).substring(2, 6),
                    titulo: catImport.titulo,
                    modo: 'simple', 
                    subitems: catImport.subitems,
                    subgrupos: [],
                    subtotal: 0
                });
            }
            itemsAñadidos += catImport.subitems.length;
        });
        
        window.customAlert("Importación Exitosa", `Se extrajeron <b>${itemsAñadidos} elementos</b>. Se fusionaron inteligentemente en las categorías correspondientes.`, "bg-emerald-500", "hover:bg-emerald-600");
        guardarCallback();
    } else {
        window.customAlert("Atención", "No se detectaron elementos con formato de presupuesto (Cantidad > 0, Nombre, Precio) en el documento.", "bg-amber-500", "hover:bg-amber-600");
    }
}