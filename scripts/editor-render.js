// scripts/editor/render.js

// Funciones de formato de dinero (1000000 -> 1.000.000)
export const formatCLP = (num) => new Intl.NumberFormat('es-CL').format(Math.round(num));
export const parseCLP = (str) => parseFloat(str.toString().replace(/\./g, '').replace(/,/g, '')) || 0;

export function renderItemsHTML(pData, isEditMode) {
    const itemsContainer = document.getElementById('items-container');
    itemsContainer.innerHTML = '';
    const unidadesBase = ['unid', 'm2', 'm3', 'ml', 'gl', 'Kg'];

    // Recolectar unidades nuevas antes de renderizar
    let unidadesDisponibles = [...unidadesBase];
    pData.items.forEach(cat => cat.subitems.forEach(art => {
        if (art.unidad && !unidadesDisponibles.includes(art.unidad)) unidadesDisponibles.push(art.unidad);
    }));
    
    pData.items.forEach((cat, catIndex) => {
        let htmlelementos = cat.subitems.map((art, artIndex) => `
            <tr class="group print:break-inside-avoid" data-cat="${catIndex}" data-art="${artIndex}">
                <td class="pr-2 pb-2"><input type="text" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="descripcion" value="${art.descripcion || ''}" placeholder="Ej. Quillay"></td>
                <td class="pr-2 pb-2"><input type="text" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="detalle" value="${art.detalle || ''}" placeholder="Ej. 2 mts"></td>
                <td class="pr-2 pb-2"><input type="text" inputmode="numeric" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm text-center transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="cantidad" value="${art.cantidad ? formatCLP(art.cantidad) : ''}"></td>
                <td class="pr-2 pb-2 relative">
                    <input type="text" class="input-art input-unidad w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 text-sm transition-colors print:border-0 print:bg-transparent print:p-0" data-campo="unidad" value="${art.unidad || 'unid'}">
                    <div class="dropdown-unidad hidden absolute top-[calc(100%-8px)] left-0 w-24 bg-white border border-zinc-200 rounded-md shadow-xl z-[100] print:hidden">
                        <div class="flex flex-col py-1">
                            ${unidadesDisponibles.map(u => `<button type="button" class="opcion-unidad text-left px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors" data-valor="${u}">${u}</button>`).join('')}
                        </div>
                    </div>
                </td>
                <td class="pr-2 pb-2 relative">
                    <span class="absolute left-3 top-2 text-zinc-400 print:hidden">$</span>
                    <input type="text" inputmode="numeric" class="input-art w-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus:bg-white focus:border-zinc-900 rounded p-1.5 pl-6 text-sm text-right transition-colors print:border-0 print:bg-transparent print:p-0 print:pl-0" data-campo="precioUnitario" value="${art.precioUnitario ? formatCLP(art.precioUnitario) : ''}">                     
                </td>                     
                <td class="pb-2 font-semibold text-right align-middle text-zinc-800 art-total">$${formatCLP(art.precioTotal)}</td>
                <td class="pb-2 pl-4 w-28 align-middle print:hidden ${isEditMode ? '' : 'hidden'}">
                    <div class="flex items-center justify-end gap-2 pr-1">
                        <div class="flex flex-col">
                            <button class="btn-up-art text-zinc-400 hover:text-zinc-800 p-0.5 disabled:opacity-30" data-cat="${catIndex}" data-art="${artIndex}" ${artIndex === 0 ? 'disabled' : ''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg></button>
                            <button class="btn-down-art text-zinc-400 hover:text-zinc-800 p-0.5 disabled:opacity-30" data-cat="${catIndex}" data-art="${artIndex}" ${artIndex === cat.subitems.length - 1 ? 'disabled' : ''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>
                        </div>
                        <button class="btn-del-art text-red-400 hover:text-red-600 transition-colors p-1" data-cat="${catIndex}" data-art="${artIndex}" title="Eliminar elemento">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        const catHtml = `
            <div class="mb-8 relative print:break-inside-avoid" data-cat-index="${catIndex}">
                <div class="font-bold text-lg text-zinc-900 mb-2 border-b-2 border-zinc-900 pb-1 flex justify-between items-end">
                    <div class="flex items-center flex-1 pr-4">
                        <span class="mr-2">${catIndex + 1}.</span>
                        <input type="text" class="input-cat-titulo w-full bg-transparent border-0 p-0 font-bold text-lg focus:ring-0 ${isEditMode ? 'border border-zinc-300 bg-zinc-50 cursor-text rounded-md px-2 py-1 -ml-2' : 'pointer-events-none cursor-default'}" data-cat="${catIndex}" value="${cat.titulo}">
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="flex gap-1 print:hidden ${isEditMode ? '' : 'hidden'}">
                            <button class="btn-up-cat text-zinc-400 hover:text-zinc-800 p-1 disabled:opacity-30" data-cat="${catIndex}" ${catIndex === 0 ? 'disabled' : ''}><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg></button>
                            <button class="btn-down-cat text-zinc-400 hover:text-zinc-800 p-1 disabled:opacity-30" data-cat="${catIndex}" ${catIndex === pData.items.length - 1 ? 'disabled' : ''}><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>
                            <button class="btn-del-cat text-red-400 hover:text-red-600 p-1 ml-2" data-cat="${catIndex}" title="Eliminar Ítem Completo"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                        </div>
                    </div>
                </div>
                
                ${cat.subitems.length > 0 ? `
                    <div class="mb-3">
                        <table class="w-full text-left table-fixed">
                            <thead>
                                <tr class="text-xs text-zinc-500 font-semibold uppercase tracking-wider border-b border-zinc-200">
                                    <th class="pb-2 w-[25%] pl-1">Nombre</th>
                                    <th class="pb-2 w-[25%]">Detalle</th>
                                    <th class="pb-2 w-[10%] text-center">Cant.</th>
                                    <th class="pb-2 w-[10%]">Unid.</th>
                                    <th class="pb-2 w-[15%] text-right">P. Unit</th>
                                    <th class="pb-2 w-[15%] text-right pr-1">Total</th>
                                    <th class="pb-2 w-28 pl-4 print:hidden ${isEditMode ? '' : 'hidden'}"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlelementos}                                                              </tbody>                                                  <tfoot>                                                                  <tr class="border-t border-zinc-900">                                                                              <td colspan="5" class="text-right py-3 pr-4 font-bold text-zinc-600">Subtotal:</td>                                                                              <td class="py-3 text-right font-bold text-zinc-900 cat-subtotal">$${formatCLP(cat.subtotal)}</td>
                                    <td class="print:hidden ${isEditMode ? '' : 'hidden'}"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ` : ''}
                
                <button class="btn-add-art text-sm text-zinc-600 hover:text-zinc-900 font-bold print:hidden flex items-center gap-1 mt-2 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded transition-colors" data-cat="${catIndex}">
                    + Añadir Elemento
                </button>
            </div>
        `;
        itemsContainer.insertAdjacentHTML('beforeend', catHtml);
    });
}