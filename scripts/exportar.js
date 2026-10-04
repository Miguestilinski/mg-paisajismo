// scripts/editor/exportar.js

/**
 * Modifica temporalmente el título del documento para que al imprimir/exportar a PDF,
 * el navegador sugiera el nombre de archivo basado en el nombre del proyecto.
 * 
 * @param {string} nombreProyecto - El código o nombre del proyecto actual.
 * @param {Function} printCallback - La función que llama a window.print()
 */
export function exportarPDF(nombreProyecto, printCallback) {
    const tituloOriginal = document.title;
    
    // Normalizar el nombre (Capitalizar cada palabra para que quede bonito "Edificio Av...")
    let nombreLimpio = (nombreProyecto || "Sin Nombre").trim().toLowerCase();
    
    // Capitalizar la primera letra de cada palabra
    nombreLimpio = nombreLimpio.replace(/\b\w/g, function(l) { return l.toUpperCase() });
    
    // Limpiar caracteres que puedan ser problemáticos en nombres de archivo
    nombreLimpio = nombreLimpio.replace(/[/\\?%*:|"<>]/g, '-');
    
    // Cambiar el título del documento temporalmente
    document.title = `Presupuesto ${nombreLimpio}`;
    
    // Ejecutar la impresión nativa (el navegador congelará la página aquí hasta que el usuario cierre el diálogo)
    printCallback();
    
    // Pequeño timeout para restaurar el título original después de que el diálogo de impresión se cierre o se despache
    setTimeout(() => {
        document.title = tituloOriginal;
    }, 1000);
}