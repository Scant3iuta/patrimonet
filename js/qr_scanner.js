let qrStream = null;
let qrAnimFrame = null;
let qrCurrentBun = null;
let qrCameras = [];
let qrActiveCameraId = null;

function openQRScanner() {
    openModal('modalQRScanner');
    // Populează select clădiri în panelul locație
    const selCld = document.getElementById('qrLocCladire');
    if (selCld) {
        selCld.innerHTML = '<option value="">Selectează clădirea...</option>' + DB.cladiri.map(c => `<option value="${c.id}">${c.cod} — ${c.nume.substring(0, 30)}</option>`).join('');
    }
    startQRCamera();
}

async function startQRCamera(deviceId) {
    stopQRCamera();
    const video = document.getElementById('qrVideo');
    const status = document.getElementById('qrStatus');
    const scanLine = document.getElementById('qrScanLine');
    try {
        const constraints = {
            video: deviceId ? {
                deviceId: {
                    exact: deviceId
                }
            } : {
                facingMode: {
                    ideal: 'environment'
                },
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 720
                }
            }
        };
        qrStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = qrStream;
        video.play();
        if (status)
            status.textContent = 'Camera activă — îndreaptă spre codul QR';
        if (scanLine)
            scanLine.style.display = 'block';
        // Populează lista de camere disponibile
        await populateQRCameras();
        // Pornește procesarea cadrelor
        video.addEventListener('loadedmetadata', () => {
            requestAnimationFrame(processQRFrame);
        }
        , {
            once: true
        });
    } catch (err) {
        if (status)
            status.textContent = '⚠️ Nu s-a putut accesa camera: ' + err.message;
        console.warn('QR camera error:', err);
    }
}

async function populateQRCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        qrCameras = devices.filter(d => d.kind === 'videoinput');
        const sel = document.getElementById('qrCameraSelect');
        if (!sel || qrCameras.length <= 1) {
            if (sel)
                sel.style.display = 'none';
            return;
        }
        sel.style.display = 'block';
        sel.innerHTML = qrCameras.map( (d, i) => `<option value="${d.deviceId}">${d.label || 'Camera ' + (i + 1)}</option>`).join('');
        // Selectează camera activă
        if (qrStream) {
            const activeTrack = qrStream.getVideoTracks()[0];
            const activeId = activeTrack?.getSettings()?.deviceId;
            if (activeId)
                sel.value = activeId;
        }
    } catch (e) {
        console.warn('enumerate cameras:', e);
    }
}

function switchQRCamera() {
    const sel = document.getElementById('qrCameraSelect');
    if (sel?.value)
        startQRCamera(sel.value);
}

function processQRFrame() {
    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrScanCanvas');
    const status = document.getElementById('qrStatus');
    if (!video || !canvas || !qrStream)
        return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        qrAnimFrame = requestAnimationFrame(processQRFrame);
        return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
    });
    if (code) {
        // QR detectat!
        if (status)
            status.textContent = '✅ Cod detectat: ' + code.data;
        stopQRCamera();
        closeModal('modalQRScanner');
        qrHandleCode(code.data);
        return;
    }
    qrAnimFrame = requestAnimationFrame(processQRFrame);
}

function stopQRCamera() {
    if (qrAnimFrame) {
        cancelAnimationFrame(qrAnimFrame);
        qrAnimFrame = null;
    }
    if (qrStream) {
        qrStream.getTracks().forEach(t => t.stop());
        qrStream = null;
    }
}

function closeQRScanner() {
    stopQRCamera();
    closeModal('modalQRScanner');
}

function qrManualSearch() {
    const val = document.getElementById('qrManualInput')?.value?.trim();
    if (!val) {
        toast('⚠️ Introdu un număr de inventar');
        return;
    }
    qrHandleCode(val);
    closeQRScanner();
}

function qrHandleCode(code) {
    // Caută bunul după nr_inv sau după codul QR direct
    let bun = DB.inventar.find(b => b.nrInv === code || b.nrInv === code.replace(/^.*[|]/, '') || // format "CNVG|NR_INV|..."
    code.includes(b.nrInv));
    if (!bun) {
        toast('⚠️ Bunul cu codul "' + code + '" nu a fost găsit în inventar');
        return;
    }
    qrCurrentBun = bun;
    // Populează header modal acțiuni
    const cld = DB.cladiri.find(c => c.id === bun.cladireId);
    const cam = DB.camere.find(c => c.id === bun.cameraId);
    document.getElementById('qrBunNume').textContent = bun.nrInv + ' — ' + bun.nume;
    document.getElementById('qrBunInfo').textContent = 'Stare: ' + (bun.stare || '—') + ' · Locație: ' + (cld ? cld.cod : 'Neatribuit') + (cam ? ' / ' + cam.cod : '') + (bun.lastInventariat ? ' · Ultim inventariat: ' + bun.lastInventariat : '');
    // Locație curentă în panelul locație
    document.getElementById('qrLocCurenta').textContent = (cld ? cld.cod + ' — ' + cld.nume : 'Neatribuită') + (cam ? ' / ' + cam.cod + ' — ' + cam.nume : '');
    // Pre-completare editare
    const stareEl = document.getElementById('qrEditStare');
    if (stareEl)
        stareEl.value = bun.stare || 'Bun';
    const valEl = document.getElementById('qrEditVal');
    if (valEl)
        valEl.value = bun.val || '';
    const obsEl = document.getElementById('qrEditObs');
    if (obsEl)
        obsEl.value = bun.desc || bun.obs || '';
    // Pre-selectează clădire/cameră curentă
    const selCld = document.getElementById('qrLocCladire');
    if (selCld && bun.cladireId) {
        selCld.value = bun.cladireId;
        updateQRLocCamere();
        setTimeout( () => {
            const selCam = document.getElementById('qrLocCamera');
            if (selCam && bun.cameraId)
                selCam.value = bun.cameraId;
        }
        , 100);
    }
    qrShowPanel('meniu');
    openModal('modalQRActiuni');
}

function qrShowPanel(panel) {
    ['meniu', 'locatie', 'editare', 'sesizare'].forEach(p => {
        const el = document.getElementById('qrPanel' + p.charAt(0).toUpperCase() + p.slice(1));
        if (el)
            el.style.display = p === panel ? 'block' : 'none';
    }
    );
}

function updateQRLocCamere() {
    const cldId = parseInt(document.getElementById('qrLocCladire')?.value);
    const sel = document.getElementById('qrLocCamera');
    if (!sel)
        return;
    const camere = DB.camere.filter(c => c.cladireId === cldId);
    sel.innerHTML = '<option value="">Selectează camera...</option>' + camere.map(c => `<option value="${c.id}">${c.cod} — ${c.nume}</option>`).join('');
}

function qrSaveLocatie() {
    if (!qrCurrentBun)
        return;
    const cldId = parseInt(document.getElementById('qrLocCladire')?.value);
    const camId = parseInt(document.getElementById('qrLocCamera')?.value);
    const motiv = document.getElementById('qrLocMotiv')?.value || 'Confirmare locație QR';
    if (!cldId) {
        toast('⚠️ Selectează o clădire');
        return;
    }
    const cld = DB.cladiri.find(c => c.id === cldId);
    const cam = DB.camere.find(c => c.id === camId);
    const b = qrCurrentBun;
    // Verifică dacă locația s-a schimbat
    const locatieSchimbata = b.cladireId !== cldId || b.cameraId !== camId;
    if (locatieSchimbata) {
        // Creează mutare
        const deCld = DB.cladiri.find(c => c.id === b.cladireId);
        const deCam = DB.camere.find(c => c.id === b.cameraId);
        const mutare = {
            id: Date.now(),
            bunId: b.id,
            userId: currentUser.id,
            data: new Date().toISOString().split('T')[0],
            deCladire: deCld ? deCld.cod : 'Neatribuit',
            deCamera: deCam ? deCam.cod : 'Neatribuită',
            laCladire: cld ? cld.cod : '—',
            laCamera: cam ? cam.cod : '—',
            laCladireId: cldId,
            laCameraId: camId || null,
            motiv: motiv + ' (via QR)',
            status: 'Finalizată',
            aprobatDe: currentUser.prenume + ' ' + currentUser.nume
        };
        DB.mutari.push(mutare);
        sbAutoSave('mutari', mutare);
        // Actualizează bunul
        b.cladireId = cldId;
        b.cameraId = camId || null;
        b.lastInventariat = new Date().toISOString().split('T')[0];
        b.inventariatDe = currentUser.prenume + ' ' + currentUser.nume;
    } else {
        // Doar confirmare locație
        b.lastInventariat = new Date().toISOString().split('T')[0];
        b.inventariatDe = currentUser.prenume + ' ' + currentUser.nume;
    }
    sbAutoSave('inventar', b);
    addIstoricEvent(locatieSchimbata ? 'mutare' : 'inventar', (locatieSchimbata ? 'Mutare QR: ' : 'Confirmare locație QR: ') + b.nrInv + ' — ' + b.nume + ' → ' + (cld ? cld.cod : '') + (cam ? '/' + cam.cod : ''), currentUser);
    toast(locatieSchimbata ? '✅ Locație actualizată și mutare înregistrată!' : '✅ Locație confirmată!');
    closeModal('modalQRActiuni');
}

function qrSaveEditare() {
    if (!qrCurrentBun)
        return;
    const b = qrCurrentBun;
    const stareVeche = b.stare;
    b.stare = document.getElementById('qrEditStare')?.value || b.stare;
    b.val = parseFloat(document.getElementById('qrEditVal')?.value) || b.val;
    b.obs = document.getElementById('qrEditObs')?.value || b.obs;
    b.lastInventariat = new Date().toISOString().split('T')[0];
    b.inventariatDe = currentUser.prenume + ' ' + currentUser.nume;
    sbAutoSave('inventar', b).then(toastSave);
    addIstoricEvent('inventar', 'Editare QR: ' + b.nrInv + ' — ' + b.nume + (stareVeche !== b.stare ? ' · Stare: ' + stareVeche + ' → ' + b.stare : ''), currentUser);
    toast('✅ Bun actualizat!');
    closeModal('modalQRActiuni');
}

function qrSaveSesizare() {
    if (!qrCurrentBun)
        return;
    const b = qrCurrentBun;
    const tip = document.getElementById('qrSezTip')?.value || 'Defecțiune tehnică';
    const prio = document.getElementById('qrSezPrio')?.value || 'Medie';
    const desc = document.getElementById('qrSezDesc')?.value?.trim();
    if (!desc) {
        toast('⚠️ Descrie problema');
        return;
    }
    const cld = DB.cladiri.find(c => c.id === b.cladireId);
    const cam = DB.camere.find(c => c.id === b.cameraId);
    // Creează problemă
    const problema = {
        id: Date.now(),
        tip: tip,
        locatie: (cld ? cld.cod : '') + (cam ? '/' + cam.cod : ''),
        desc: b.nrInv + ' — ' + b.nume + ': ' + desc,
        prio: prio,
        status: 'Deschisă',
        rezolvatDe: '',
        bunId: b.id,
        creatDe: currentUser.prenume + ' ' + currentUser.nume,
        creatLa: new Date().toISOString().split('T')[0]
    };
    DB.probleme = DB.probleme || [];
    DB.probleme.push(problema);
    sbAutoSave('probleme', problema);
    // Creează task mentenanță automat
    const task = {
        id: Date.now() + 1,
        titlu: tip + ': ' + b.nrInv + ' — ' + b.nume,
        desc: desc,
        prio: prio,
        status: 'Deschisă',
        cameraId: b.cameraId || null,
        bunId: b.id,
        assignId: null,
        assignIds: [],
        termen: null,
        sursa: 'QR',
        creatLa: new Date().toISOString().split('T')[0]
    };
    DB.tasks = DB.tasks || [];
    DB.tasks.push(task);
    sbAutoSave('tasks', task);
    // Actualizează starea bunului dacă e problemă serioasă
    if (['Înaltă', 'Urgentă'].includes(prio) && b.stare === 'Bun') {
        b.stare = 'Necesită reparații';
        sbAutoSave('inventar', b);
    }
    addIstoricEvent('mentenanta', 'Sesizare QR: ' + b.nrInv + ' — ' + tip + ' (' + prio + ')', currentUser);
    addNotification('Sesizare nouă via QR', b.nrInv + ' — ' + b.nume + ': ' + tip, 'mentenanta', ['school_admin', 'mentenanta']);
    toast('📤 Sesizare trimisă + task mentenanță creat!');
    closeModal('modalQRActiuni');
}

function qrConfirmInventariat() {
    if (!qrCurrentBun)
        return;
    const b = qrCurrentBun;
    b.lastInventariat = new Date().toISOString().split('T')[0];
    b.inventariatDe = currentUser.prenume + ' ' + currentUser.nume;
    sbAutoSave('inventar', b).then(toastSave);
    addIstoricEvent('inventar', 'Inventariat QR: ' + b.nrInv + ' — ' + b.nume, currentUser);
    toast('📦 Bun marcat ca inventariat!');
    closeModal('modalQRActiuni');
}

// Arată butonul Scan QR pentru rolurile permise
function updateQRScanButton() {
    const btn = document.getElementById('btnScanQR');
    if (btn && currentUser && ['super_admin', 'school_admin'].includes(currentUser.rol)) {
        btn.style.display = 'inline-flex';
    } else if (btn) {
        btn.style.display = 'none';
    }
}

// Global exposure
window.openQRScanner = openQRScanner;
window.startQRCamera = startQRCamera;
window.populateQRCameras = populateQRCameras;
window.switchQRCamera = switchQRCamera;
window.processQRFrame = processQRFrame;
window.stopQRCamera = stopQRCamera;
window.closeQRScanner = closeQRScanner;
window.qrManualSearch = qrManualSearch;
window.qrHandleCode = qrHandleCode;
window.qrShowPanel = qrShowPanel;
window.updateQRLocCamere = updateQRLocCamere;
window.qrSaveLocatie = qrSaveLocatie;
window.qrSaveEditare = qrSaveEditare;
window.qrSaveSesizare = qrSaveSesizare;
window.qrConfirmInventariat = qrConfirmInventariat;
window.updateQRScanButton = updateQRScanButton;
