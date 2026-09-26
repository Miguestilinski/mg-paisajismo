// scripts/db.js
// Inicializamos la base de datos local usando Dexie (IndexedDB wrapper)

const localDB = new Dexie('MGPaisajismoDB');

// Definimos la estructura. 'id' es la llave primaria. 
// Los demás campos son índices por los que podemos buscar o ordenar.
localDB.version(1).stores({
    presupuestos: 'id, fechaCreacion, fechaModificacion, codigoProyecto'
});

export { localDB };