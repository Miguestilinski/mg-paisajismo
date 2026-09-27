// scripts/utils/modals.js

export function setupModals() {
    window.customConfirm = function(title, message, okText = "Aceptar", okColorBase = "bg-red-500", okColorHover = "hover:bg-red-600") {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-confirm');
            const box = document.getElementById('modal-confirm-box');
            const btnOk = document.getElementById('btn-modal-confirm-ok');
            const btnCancel = document.getElementById('btn-modal-confirm-cancel');

            document.getElementById('modal-confirm-title').textContent = title;
            document.getElementById('modal-confirm-message').innerHTML = message;
            
            btnOk.textContent = okText;
            btnOk.className = `px-4 py-2 rounded-lg font-bold text-white transition-colors shadow-sm ${okColorBase} ${okColorHover}`;

            const cleanup = () => {
                box.classList.remove('scale-100'); box.classList.add('scale-95');
                modal.classList.remove('opacity-100'); modal.classList.add('opacity-0');
                setTimeout(() => modal.classList.add('hidden'), 200);
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
            };

            const onOk = () => { cleanup(); resolve(true); };
            const onCancel = () => { cleanup(); resolve(false); };

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0'); modal.classList.add('opacity-100');
                box.classList.remove('scale-95'); box.classList.add('scale-100');
            }, 10);
        });
    };

    window.customPrompt = function(title, message, placeholder) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-prompt');
            const box = document.getElementById('modal-prompt-box');
            const input = document.getElementById('modal-prompt-input');
            const btnOk = document.getElementById('btn-modal-prompt-ok');
            const btnCancel = document.getElementById('btn-modal-prompt-cancel');

            document.getElementById('modal-prompt-title').textContent = title;
            document.getElementById('modal-prompt-message').textContent = message;
            input.placeholder = placeholder;
            input.value = '';

            const cleanup = () => {
                box.classList.remove('scale-100'); box.classList.add('scale-95');
                modal.classList.remove('opacity-100'); modal.classList.add('opacity-0');
                setTimeout(() => modal.classList.add('hidden'), 200);
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
                input.removeEventListener('keydown', onKey);
            };

            const onOk = () => { cleanup(); resolve(input.value.trim()); };
            const onCancel = () => { cleanup(); resolve(null); };
            const onKey = (e) => { if (e.key === 'Enter') onOk(); if (e.key === 'Escape') onCancel(); };

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);
            input.addEventListener('keydown', onKey);

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0'); modal.classList.add('opacity-100');
                box.classList.remove('scale-95'); box.classList.add('scale-100');
                input.focus();
            }, 10);
        });
    };

    window.customAlert = function(title, message, okColorBase = "bg-blue-600", okColorHover = "hover:bg-blue-700") {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-alert');
            const box = document.getElementById('modal-alert-box');
            const btnOk = document.getElementById('btn-modal-alert-ok');

            document.getElementById('modal-alert-title').textContent = title;
            document.getElementById('modal-alert-message').innerHTML = message;
            
            btnOk.className = `px-5 py-2 rounded-lg font-bold text-white transition-colors shadow-sm ${okColorBase} ${okColorHover}`;

            const cleanup = () => {
                box.classList.remove('scale-100'); box.classList.add('scale-95');
                modal.classList.remove('opacity-100'); modal.classList.add('opacity-0');
                setTimeout(() => modal.classList.add('hidden'), 200);
                btnOk.removeEventListener('click', onOk);
            };

            const onOk = () => { cleanup(); resolve(true); };
            btnOk.addEventListener('click', onOk);

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0'); modal.classList.add('opacity-100');
                box.classList.remove('scale-95'); box.classList.add('scale-100');
            }, 10);
        });
    };
}