/**
 * PatrimoNet UI Modal Management Module
 * Extracted from app_logic.js
 */

// Global access for UI event bindings
window.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('open');
    }
};

window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('open');
    }
};

// Modal Overlay Click Handler (Close on click outside)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
});

/**
 * Keyboard Shortcut Handler
 * Handles Enter key for various contexts:
 * 1. Login Screen
 * 2. Active Modals (Save Routing)
 */
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        // 1. Login screen entry
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && loginScreen.style.display !== 'none') {
            if (typeof window.doLogin === 'function') {
                window.doLogin();
            }
            return;
        }

        // 2. Modal saving based on open modal
        const openModalObj = document.querySelector('.modal-overlay.open');
        if (openModalObj) {
            const id = openModalObj.id;
            
            // Route to specific save functions
            if (id === 'modalBun' && typeof window.saveBun === 'function') {
                window.saveBun();
            } else if (id === 'modalCladire' && typeof window.saveCladire === 'function') {
                window.saveCladire();
            } else if (id === 'modalCamera' && typeof window.saveCamera === 'function') {
                window.saveCamera();
            } else if (id === 'modalFurnizor' && typeof window.saveFurnizor === 'function') {
                window.saveFurnizor();
            } else if (id === 'modalAchizitie' && typeof window.saveAchizitie === 'function') {
                window.saveAchizitie();
            } else if (id === 'modalPersonal' && typeof window.savePersonal === 'function') {
                window.savePersonal();
            }
        }
    }
});
