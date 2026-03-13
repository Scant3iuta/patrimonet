/**
 * PatrimoNet Inventory Management Module
 * Extracted from app_logic.js
 */

// Explicitly attach functions to window for UI visibility
(function(window) {
    "use strict";

    // Personnel Functions
    function renderPersonal(data) {
        let items = data || DB.personal;
        // Sortare: Super Admin primul, apoi Administrator Patrimoniu, apoi restul
        items.sort( (a, b) => {
            const roles = {
                super_admin: 0,
                school_admin: 1
            };
            const rA = roles[a.rol] ?? 99;
            const rB = roles[b.rol] ?? 99;
            return rA - rB;
        }
        );
        const c = document.getElementById('personalList');
        if (!c) return;
        if (!items.length) {
            c.innerHTML = '<div class="empty"><div class="empty-icon">👥</div><p>Niciun utilizator.</p></div>';
            return;
        }
        c.innerHTML = items.map(p => {
            const bg = ROLE_COLORS[p.rol] || '#4a5168';
            return `<div class="person-card">
          <div class="person-avatar" style="background:${bg};color:white">${(p.prenume[0] + p.nume[0]).toUpperCase()}</div>
          <div class="person-info">
            <div class="person-name">${p.prenume} ${p.nume}</div>
            <div class="person-role">${ROLE_LABELS[p.rol] || p.rol}</div>
            <div class="person-contact">${p.email}</div>
          </div>
          <div class="person-actions">
            <span class="badge" style="background:${bg};color:white;font-size:10px">${ROLE_LABELS[p.rol] || p.rol}</span>
            ${(currentUser.rol === 'super_admin' || (currentUser.rol === 'school_admin' && p.rol !== 'super_admin')) ? `<button class="btn btn-outline btn-sm" onclick="editPersonal(${p.id})" title="Editează utilizator">✏️</button><button class="btn btn-danger btn-sm" onclick="deletePersonal(${p.id})" title="Șterge utilizator">🗑️</button>` : ''}
          </div>
        </div>`;
        }
        ).join('');
    }

    function filterPersonal(q) {
        const s = (q || '').toLowerCase();
        const rSelect = document.getElementById('filterRolP');
        const r = rSelect ? rSelect.value : '';
        renderPersonal(DB.personal.filter(p => (!s || p.prenume.toLowerCase().includes(s) || p.nume.toLowerCase().includes(s)) && (!r || p.rol === r)));
    }

    function savePersonal() {
        if (window._isSaving)
            return;
        window._isSaving = true;
        setTimeout( () => window._isSaving = false, 1000);
        const id = document.getElementById('perEditId').value;
        let pData = {
            prenume: document.getElementById('perPrenume').value,
            nume: document.getElementById('perNume').value,
            email: document.getElementById('perEmail').value,
            tel: document.getElementById('perTel').value,
            rol: document.getElementById('perRol').value,
            parola: document.getElementById('perParola').value || 'temp123'
        };
        if (!pData.prenume || !pData.email) {
            toast('⚠️ Completează câmpurile obligatorii!');
            return;
        }

        let finalObj;
        if (id) {
            const i = DB.personal.findIndex(x => x.id == id);
            DB.personal[i] = {
                ...DB.personal[i],
                ...pData
            };
            finalObj = DB.personal[i];
        } else {
            // Invitare utilizator / Creare locală (Legat de școala curentă)
            finalObj = {
                ...pData,
                id: Date.now(),
                school_id: currentUser.school_id
            };
            DB.personal.push(finalObj);
        }

        sbAutoSave('personal', finalObj).then(toastSave);
        toast('✅ Utilizator salvat!');
        closeModal('modalPersonal');
        document.getElementById('perEditId').value = '';
        renderPersonal();
    }

    function editPersonal(id) {
        const p = DB.personal.find(x => x.id === id || String(x.id) === String(id));
        if (!p) {
            toast('⚠️ Utilizatorul nu a fost găsit. Reîncarcă pagina.');
            return;
        }
        document.getElementById('perEditId').value = p.id;
        document.getElementById('perPrenume').value = p.prenume;
        document.getElementById('perNume').value = p.nume;
        document.getElementById('perEmail').value = p.email;
        document.getElementById('perTel').value = p.tel || '';
        document.getElementById('perRol').value = p.rol;
        document.getElementById('perParola').value = '';
        openModal('modalPersonal');
    }

    function deletePersonal(id) {
        if (!confirm('Ștergi utilizatorul?'))
            return;
        DB.personal = DB.personal.filter(x => x.id !== id);
        toast('🗑️ Utilizator șters!');
        renderPersonal();
    }

    // Export to window
    window.renderPersonal = renderPersonal;
    window.filterPersonal = filterPersonal;
    window.savePersonal = savePersonal;
    window.editPersonal = editPersonal;
    window.deletePersonal = deletePersonal;

    // Building Functions
    function toggleCladireDetail(id) {
        const el = document.getElementById('cladire-detail-' + id);
        if (el)
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }

    function renderCladiri(data) {
        const items = (data || DB.cladiri).slice().sort((a, b) => a.cod.localeCompare(b.cod, 'ro'));
        const grid = document.getElementById('cladiriGrid');
        if (!grid) return;
        if (!items.length) {
            grid.innerHTML = '<div class="empty"><div class="empty-icon">🏢</div><p>Nicio clădire înregistrată.</p></div>';
            return;
        }
        grid.innerHTML = items.map(c => {
            const camere = DB.camere.filter(x => x.cladireId === c.id);
            const bunuri = DB.inventar.filter(x => x.cladireId === c.id);
            const val = bunuri.reduce((s, b) => s + b.val, 0);
            const saliClasa = camere.filter(x => ['Sală de clasă', 'SALĂ DE CLASĂ'].includes(x.tip));
            const laboratoare = camere.filter(x => ['Laborator', 'LABORATOR'].includes(x.tip));
            const birouri = camere.filter(x => ['Birou', 'BIROU'].includes(x.tip));
            const saliSport = camere.filter(x => ['Sală sport', 'SALĂ SPORT'].includes(x.tip));
            const depozite = camere.filter(x => ['Depozit', 'DEPOZIT'].includes(x.tip));
            const altele = camere.filter(x => !['Sală de clasă', 'SALĂ DE CLASĂ', 'Laborator', 'LABORATOR', 'Birou', 'BIROU', 'Sală sport', 'SALĂ SPORT', 'Depozit', 'DEPOZIT'].includes(x.tip));
            return `<div class="building-card">
          <div class="building-card-header" style="cursor:pointer" onclick="toggleCladireDetail(${c.id})">
            <div class="building-card-name">🏢 <span style="font-weight:400;color:var(--mist)">${c.cod} &mdash; </span>${c.nume}</div>
            <div class="building-card-addr">📍 ${c.adresa}</div>
            <div style="font-size:11px;color:var(--mist);margin-top:2px">
              ${c.an ? `🗓 Construit: ${c.an}` : ''}
              ${c.supUtila ? (c.an ? ' · ' : '') + c.supUtila + 'm² util' : ''}
              ${c.supDesfasurata ? (c.an || c.supUtila ? ' · ' : '') + c.supDesfasurata + 'm² desfășurat' : ''}
            </div>
            ${c.stare ? `<div style="font-size:11px;margin-top:2px">Stare: <strong>${c.stare}</strong></div>` : ''}
            ${c.tipAcoperis || c.tipIncalzire || c.tipStructura || c.supraveghere ? `<div style="font-size:10px;color:var(--mist);margin-top:3px;display:flex;flex-wrap:wrap;gap:6px">
              ${c.tipAcoperis ? `<span>🏠 ${c.tipAcoperis}</span>` : ''}
              ${c.tipIncalzire ? `<span>🔥 ${c.tipIncalzire}</span>` : ''}
              ${c.tipStructura ? `<span>🧱 ${c.tipStructura}</span>` : ''}
              ${c.supraveghere ? `<span>📹 ${c.supraveghere}</span>` : ''}
              ${c.grupuriSanitare ? `<span>🚻 ${c.grupuriSanitare}</span>` : ''}
              ${c.regimInaltime ? `<span>🏗️ ${c.regimInaltime}</span>` : ''}
              ${c.stareReabilitare ? `<span>🛠️ ${c.stareReabilitare}${c.anReabilitare ? ' (' + c.anReabilitare + ')' : ''}</span>` : ''}
            </div>` : ''}
          </div>
          <div class="building-card-body">
            <div class="building-stat"><span>📦 Bunuri</span><span class="building-stat-val">${bunuri.length} (${val.toLocaleString('ro-RO')} RON)</span></div>
            ${saliClasa.length ? `<div class="building-stat"><span>🏫 Săli de clasă</span><span class="building-stat-val">${saliClasa.length}</span></div>` : ''}
            ${laboratoare.length ? `<div class="building-stat"><span>🔬 Laboratoare</span><span class="building-stat-val">${laboratoare.length}</span></div>` : ''}
            ${birouri.length ? `<div class="building-stat"><span>🗂 Birouri</span><span class="building-stat-val">${birouri.length}</span></div>` : ''}
            ${saliSport.length ? `<div class="building-stat"><span>⚽ Săli sport</span><span class="building-stat-val">${saliSport.length}</span></div>` : ''}
            ${depozite.length ? `<div class="building-stat"><span>📦 Depozite</span><span class="building-stat-val">${depozite.length}</span></div>` : ''}
            ${altele.length ? `<div class="building-stat"><span>📋 Alte spații</span><span class="building-stat-val">${altele.length}</span></div>` : ''}
            <div class="building-stat"><span>🏗 Etaje</span><span class="building-stat-val">${c.etaje || '—'}</span></div>
            <div id="cladire-detail-${c.id}" style="display:none;margin-top:10px;border-top:1px solid var(--surface);padding-top:10px">
              <div style="font-size:11px;font-weight:600;color:var(--mist);margin-bottom:6px">SPAȚII ÎNREGISTRATE (${camere.length})</div>
              ${camere.map(cam => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid var(--surface)">
                <span><strong>${cam.cod}</strong> — ${cam.nume}</span>
                <span style="color:var(--mist)">${cam.tip || ''} · Et.${cam.etaj || 0}${cam.sup ? ' · ' + cam.sup + 'm²' : ''}</span>
              </div>`).join('') || '<div style="font-size:11px;color:var(--mist)">Nicio cameră înregistrată</div>'}
            </div>
            <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" onclick="toggleCladireDetail(${c.id})">📋 Spații</button>
              <button class="btn btn-sm" style="background:var(--sky);color:#fff" onclick="openFisaCladire(${c.id})">📋 Fișa clădirii</button>
              <button class="btn btn-sm" style="background:var(--gold);color:#fff" onclick="printFisaCladire(${c.id})">📄 Raport PDF</button>
              <button class="btn btn-outline btn-sm" onclick="editCladire(${c.id})">✏️ Editează</button>
              <button class="btn btn-danger btn-sm btn-delete-cladire" onclick="deleteCladire(${c.id})">🗑️</button>
            </div>
          </div>
        </div>`;
        }
        ).join('');
    }

    function filterCladiri(q) {
        const s = (q || '').toLowerCase();
        renderCladiri(DB.cladiri.filter(c => !s || c.nume.toLowerCase().includes(s) || c.adresa.toLowerCase().includes(s)));
    }

    async function importSIIIR() {
        const btn = document.querySelector('button[onclick="importSIIIR()"]') || document.querySelector('button[onclick="importSIIIRData()"]');
        if (btn) btn.disabled = true;
        toast('⏳ Se importă datele din SIIIR (toate cele 6 clădiri)...');

        try {
            // Șterge clădirile și camerele vechi/duplicate — LOCAL + SUPABASE
            const siiirCodes = ['CLD-A', 'CLD-B', 'CLD-A-I', 'CLD-A-C', 'CLD-LP', 'CLD-SS'];
            const cladiriVechiIds = DB.cladiri.filter(c => siiirCodes.some(s => c.cod === s)).map(c => c.id);
            DB.cladiri = DB.cladiri.filter(c => !cladiriVechiIds.includes(c.id));
            DB.camere = DB.camere.filter(c => !cladiriVechiIds.includes(c.cladireId));

            if (SUPABASE_ENABLED && sbClient) {
                for (const cod of siiirCodes) {
                    const {data: cldRows} = await sbClient.from('cladiri').select('id').eq('cod', cod);
                    if (cldRows && cldRows.length > 0) {
                        const ids = cldRows.map(r => r.id);
                        for (const cid of ids) {
                            await sbClient.from('camere').delete().eq('cladire_id', cid);
                            await sbClient.from('cladiri').delete().eq('id', cid);
                        }
                    }
                }
            }

            // The original importSIIIR function was partially truncated in the instruction,
            // so I'm replacing it with the full version from the instruction.
            // The instruction implies replacing the existing importSIIIR with the new one,
            // which also includes the initial confirmation and toast.
            if (!confirm('📥 Se vor importa toate cele 6 clădiri de bază din SIIIR.\nAcest lucru va reseta lista curentă de clădiri la starea inițială.\n\nContinui?'))
                return;
            const btnEvent = event?.target;
            if (btnEvent) btnEvent.disabled = true;
            toast('⏳ Se importă datele SIIIR...');
            DB.cladiri = [];
            // Reset mappings for existing rooms/items
            DB.camere = [];

            // --- COLEGIUL (cod SIIIR 1) ---
            const colegiu = {
                id: Date.now() + 1,
                cod: 'CLD-A',
                nume: 'Clădire colegiu',
                adresa: 'Calea Victoriei 1-3, Arad',
                etaje: 3,
                an: 1969,
                supUtila: 1600,
                supDesfasurata: 5540,
                stare: 'Bună',
                codSiiir: 1,
                tipAcoperis: 'Terasă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Video+Audio',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Reabilitată',
                anReabilitare: 2012,
                regimInaltime: 'S+P+2E',
                tipStructura: 'Cărămidă',
                resp: 'Admin. patrimoniu',
                note: 'Clădire principală colegiu din date SIIIR.'
            };
            DB.cladiri.push(colegiu);
            await sbAutoSave('cladiri', colegiu);

            // --- ȘCOALA (cod SIIIR 5) ---
            const scoala = {
                id: Date.now() + 2,
                cod: 'CLD-B',
                nume: 'CNVG Școala Gimnazială',
                adresa: 'Str. Augustin Doinaș 33-37, Arad',
                etaje: 3,
                an: 1963,
                supUtila: 1471,
                supDesfasurata: 2947,
                stare: 'Nereabilitată',
                codSiiir: 5,
                tipAcoperis: 'Șarpantă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Doar video',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Nereabilitată',
                anReabilitare: null,
                regimInaltime: 'S+P+2E',
                tipStructura: 'Cărămidă',
                resp: 'Admin. patrimoniu',
                note: 'Corp gimnazial.'
            };
            DB.cladiri.push(scoala);
            await sbAutoSave('cladiri', scoala);

            // --- INTERNAT (cod SIIIR 2) ---
            const internat = {
                id: Date.now() + 3,
                cod: 'CLD-A-I',
                nume: 'Internat',
                adresa: 'Calea Victoriei 1-3, Arad',
                etaje: 4,
                an: 1969,
                supUtila: 620,
                supDesfasurata: 2552,
                stare: 'Bună',
                codSiiir: 2,
                tipAcoperis: 'Terasă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Video+Audio',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Reabilitată',
                anReabilitare: 2010,
                regimInaltime: 'S+P+4E',
                tipStructura: 'Cărămidă',
                resp: 'Admin. patrimoniu',
                note: 'Internat elevi.'
            };
            DB.cladiri.push(internat);
            await sbAutoSave('cladiri', internat);
            const rawIntCamere = [{
                cod: 'I-72',
                nume: 'Sală mese internat',
                tip: 'Sală mese',
                etaj: 0,
                sup: 70,
                cap: 40,
                codSiiir: 72
            }, {
                cod: 'I-73',
                nume: 'Sală sport 1',
                tip: 'Sală sport',
                etaj: 0,
                sup: 45,
                cap: 0,
                codSiiir: 73
            }, {
                cod: 'I-74',
                nume: 'Sală sport 2',
                tip: 'Sală sport',
                etaj: 0,
                sup: 45,
                cap: 0,
                codSiiir: 74
            }];
            for (let i = 0; i < rawIntCamere.length; i++) {
                const c = rawIntCamere[i];
                const cam = {
                    ...c,
                    id: Date.now() + 400 + i,
                    cladireId: internat.id,
                    resp: 'Admin. patrimoniu'
                };
                DB.camere.push(cam);
                await sbAutoSave('camere', cam);
            }

            // --- CANTINĂ (cod SIIIR 3) ---
            const cantina = {
                id: Date.now() + 4,
                cod: 'CLD-A-C',
                nume: 'Cantină',
                adresa: 'Calea Victoriei 1-3, Arad',
                etaje: 1,
                an: 1992,
                supUtila: 335,
                supDesfasurata: 310,
                stare: 'Nereabilitată',
                codSiiir: 3,
                tipAcoperis: 'Terasă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Fără',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Nereabilitată',
                anReabilitare: null,
                regimInaltime: 'P',
                tipStructura: 'Cărămidă',
                resp: 'Admin. patrimoniu',
                note: 'Cantină.'
            };
            DB.cladiri.push(cantina);
            await sbAutoSave('cladiri', cantina);
            const rawCantCamere = [{
                cod: 'C-47',
                nume: 'Sală de masă',
                tip: 'Sală mese',
                etaj: 0,
                sup: 140,
                cap: 60,
                codSiiir: 47
            }, {
                cod: 'C-48',
                nume: 'Bucătărie',
                tip: 'Auxiliar',
                etaj: 0,
                sup: 65,
                cap: 2,
                codSiiir: 48
            }, {
                cod: 'C-49',
                nume: 'Depozit cantină',
                tip: 'Depozit',
                etaj: 0,
                sup: 20,
                cap: 0,
                codSiiir: 49
            }, {
                cod: 'C-50',
                nume: 'Birou administrator',
                tip: 'Birou',
                etaj: 0,
                sup: 10,
                cap: 1,
                codSiiir: 50
            }];
            for (let i = 0; i < rawCantCamere.length; i++) {
                const c = rawCantCamere[i];
                const cam = {
                    ...c,
                    id: Date.now() + 500 + i,
                    cladireId: cantina.id,
                    resp: 'Admin. patrimoniu'
                };
                DB.camere.push(cam);
                await sbAutoSave('camere', cam);
            }

            // --- LICEU PARTICULAR NR. 1 (cod SIIIR 4) ---
            const liceuPart = {
                id: Date.now() + 5,
                cod: 'CLD-LP',
                nume: 'Liceu particular nr. 1',
                adresa: 'Calea Teleacului, Arad',
                etaje: 1,
                an: 1969,
                supUtila: 1760,
                supDesfasurata: 1650,
                stare: 'Bună',
                codSiiir: 4,
                tipAcoperis: 'Șarpantă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Fără',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Nereabilitată',
                anReabilitare: null,
                regimInaltime: 'P',
                tipStructura: 'Cărămidă',
                resp: 'Admin. patrimoniu',
                note: 'Liceu particular.'
            };
            DB.cladiri.push(liceuPart);
            await sbAutoSave('cladiri', liceuPart);

            // --- SALĂ SPORT (cod SIIIR 6) ---
            const salaSport = {
                id: Date.now() + 6,
                cod: 'CLD-SS',
                nume: 'Sală sport',
                adresa: 'Str. Augustin Doinaș 33-37, Arad',
                etaje: 1,
                an: 1963,
                supUtila: 170,
                supDesfasurata: 163,
                stare: 'Bună',
                codSiiir: 6,
                tipAcoperis: 'Șarpantă',
                tipIncalzire: 'Fără',
                supraveghere: 'Fără',
                grupuriSanitare: 'Exterior',
                stareReabilitare: 'Nereabilitată',
                anReabilitare: null,
                regimInaltime: 'P',
                tipStructura: 'Metal',
                resp: 'Admin. patrimoniu',
                note: 'Sală sport.'
            };
            DB.cladiri.push(salaSport);
            await sbAutoSave('cladiri', salaSport);
            const rawSsCamere = [{
                cod: 'SS-75',
                nume: 'Sală sport',
                tip: 'Sală sport',
                etaj: 0,
                sup: 162,
                cap: 0,
                codSiiir: 75
            }];
            for (let i = 0; i < rawSsCamere.length; i++) {
                const c = rawSsCamere[i];
                const cam = {
                    ...c,
                    id: Date.now() + 600 + i,
                    cladireId: salaSport.id,
                    resp: 'Admin. patrimoniu'
                };
                DB.camere.push(cam);
                await sbAutoSave('camere', cam);
            }

            toast('✅ Toate cele 6 clădiri au fost importate din SIIIR cu succes!');
            renderCladiri();
            if (typeof renderCamere === 'function')
                renderCamere();
            updateDashboard();
            addActivity('Import SIIIR finalizat (6 clădiri)', 'teal');
        } catch (err) {
            console.error('Import SIIIR failed:', err);
            toast('❌ Eroare la importul SIIIR.');
        } finally {
            if (btn)
                btn.disabled = false;
        }
    }

    function preluareCladireSIIIR() {
        const codeInput = document.getElementById('cladireSiiir').value.trim();
        if (!codeInput) {
            toast('⚠️ Introdu un cod SIIIR valid mai întâi!');
            return;
        }

        const siiirDb = {
            '1': {
                cod: 'CLD-A',
                nume: 'Clădire colegiu',
                adresa: 'Calea Victoriei 1-3, Arad',
                etaje: 3,
                an: 1969,
                supUtila: 1600,
                supDesfasurata: 5540,
                stare: 'Bună',
                tipAcoperis: 'Terasă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Video+Audio',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Reabilitată',
                anReabilitare: 2012,
                regimInaltime: 'S+P+2E',
                tipStructura: 'Cărămidă',
                note: 'Clădire principală colegiu.'
            },
            '2': {
                cod: 'CLD-A-I',
                nume: 'Internat',
                adresa: 'Calea Victoriei 1-3, Arad',
                etaje: 4,
                an: 1969,
                supUtila: 620,
                supDesfasurata: 2552,
                stare: 'Bună',
                tipAcoperis: 'Terasă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Video+Audio',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Reabilitată',
                anReabilitare: 2010,
                regimInaltime: 'S+P+4E',
                tipStructura: 'Cărămidă',
                note: 'Internat elevi.'
            },
            '3': {
                cod: 'CLD-A-C',
                nume: 'Cantină',
                adresa: 'Calea Victoriei 1-3, Arad',
                etaje: 1,
                an: 1992,
                supUtila: 335,
                supDesfasurata: 310,
                stare: 'Nereabilitată',
                tipAcoperis: 'Terasă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Fără',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Nereabilitată',
                anReabilitare: null,
                regimInaltime: 'P',
                tipStructura: 'Cărămidă',
                note: 'Cantină din date SIIIR.'
            },
            '4': {
                cod: 'CLD-LP',
                nume: 'Liceu particular nr. 1',
                adresa: 'Calea Teleacului, Arad',
                etaje: 1,
                an: 1969,
                supUtila: 1760,
                supDesfasurata: 1650,
                stare: 'Bună',
                tipAcoperis: 'Șarpantă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Fără',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Nereabilitată',
                anReabilitare: null,
                regimInaltime: 'P',
                tipStructura: 'Cărămidă',
                note: 'Liceu particular din date SIIIR.'
            },
            '5': {
                cod: 'CLD-B',
                nume: 'CNVG Școala Gimnazială',
                adresa: 'Str. Augustin Doinaș 33-37, Arad',
                etaje: 3,
                an: 1963,
                supUtila: 1471,
                supDesfasurata: 2947,
                stare: 'Nereabilitată',
                tipAcoperis: 'Șarpantă',
                tipIncalzire: 'Centrală proprie',
                supraveghere: 'Doar video',
                grupuriSanitare: 'Interior',
                stareReabilitare: 'Nereabilitată',
                anReabilitare: null,
                regimInaltime: 'S+P+2E',
                tipStructura: 'Cărămidă',
                note: 'Corp gimnazial.'
            },
            '6': {
                cod: 'CLD-SS',
                nume: 'Sală sport',
                adresa: 'Str. Augustin Doinaș 33-37, Arad',
                etaje: 1,
                an: 1963,
                supUtila: 170,
                supDesfasurata: 163,
                stare: 'Bună',
                tipAcoperis: 'Șarpantă',
                tipIncalzire: 'Fără',
                supraveghere: 'Fără',
                grupuriSanitare: 'Exterior',
                stareReabilitare: 'Nereabilitată',
                anReabilitare: null,
                regimInaltime: 'P',
                tipStructura: 'Metal',
                note: 'Sală sport din date SIIIR.'
            }
        };

        const match = siiirDb[codeInput];
        if (match) {
            document.getElementById('cladireCod').value = match.cod;
            document.getElementById('cladireNume').value = match.nume;
            document.getElementById('cladireAdresa').value = match.adresa;
            document.getElementById('cladireEtaje').value = match.etaje;
            document.getElementById('cladireAn').value = match.an;
            if (document.getElementById('cladireSupUtila'))
                document.getElementById('cladireSupUtila').value = match.supUtila;
            if (document.getElementById('cladireSupDesfasurata'))
                document.getElementById('cladireSupDesfasurata').value = match.supDesfasurata;
            if (document.getElementById('cladireStare'))
                document.getElementById('cladireStare').value = match.stare;
            if (document.getElementById('cladireTipAcoperis'))
                document.getElementById('cladireTipAcoperis').value = match.tipAcoperis || '';
            if (document.getElementById('cladireTipIncalzire'))
                document.getElementById('cladireTipIncalzire').value = match.tipIncalzire || '';
            if (document.getElementById('cladireSupraveghere'))
                document.getElementById('cladireSupraveghere').value = match.supraveghere || '';
            if (document.getElementById('cladireGrupSanitar'))
                document.getElementById('cladireGrupSanitar').value = match.grupuriSanitare || '';
            if (document.getElementById('cladireStareReab'))
                document.getElementById('cladireStareReab').value = match.stareReabilitare || '';
            if (document.getElementById('cladireAnReab'))
                document.getElementById('cladireAnReab').value = match.anReabilitare || '';
            if (document.getElementById('cladireRegimInaltime'))
                document.getElementById('cladireRegimInaltime').value = match.regimInaltime || '';
            if (document.getElementById('cladireTipStructura'))
                document.getElementById('cladireTipStructura').value = match.tipStructura || '';
            document.getElementById('cladireNote').value = match.note;
            toast('✅ Date completate automat din SIIIR!');
        } else {
            toast('❌ Codul SIIIR introdus nu a fost găsit în baza de date asociată unității tale.');
        }
    }

    function saveCladire() {
        if (window._isSaving)
            return;
        window._isSaving = true;
        setTimeout( () => window._isSaving = false, 1000);
        const id = document.getElementById('cladireEditId').value;
        const c = {
            id: id ? parseInt(id) : Date.now(),
            cod: document.getElementById('cladireCod').value,
            nume: document.getElementById('cladireNume').value,
            adresa: document.getElementById('cladireAdresa').value,
            etaje: parseInt(document.getElementById('cladireEtaje').value) || null,
            an: parseInt(document.getElementById('cladireAn').value) || null,
            supUtila: parseFloat(document.getElementById('cladireSupUtila').value) || null,
            supDesfasurata: parseFloat(document.getElementById('cladireSupDesfasurata').value) || null,
            stare: document.getElementById('cladireStare').value,
            tipAcoperis: document.getElementById('cladireTipAcoperis').value,
            tipIncalzire: document.getElementById('cladireTipIncalzire').value,
            supraveghere: document.getElementById('cladireSupraveghere').value,
            grupuriSanitare: document.getElementById('cladireGrupSanitar').value,
            stareReabilitare: document.getElementById('cladireStareReab').value,
            anReabilitare: parseInt(document.getElementById('cladireAnReab').value) || null,
            regimInaltime: document.getElementById('cladireRegimInaltime').value,
            tipStructura: document.getElementById('cladireTipStructura').value,
            codSiiir: parseInt(document.getElementById('cladireSiiir').value) || null,
            note: document.getElementById('cladireNote').value
        };
        if (!c.cod || !c.nume) {
            toast('⚠️ Completează codul și denumirea!');
            return;
        }
        if (id) {
            const i = DB.cladiri.findIndex(x => x.id == id);
            const existing = DB.cladiri[i];
            DB.cladiri[i] = {
                ...existing,
                ...c,
                id: existing.id,
                _loaded: existing._loaded
            };
            sbAutoSave('cladiri', DB.cladiri[i]).then(toastSave);
        } else {
            DB.cladiri.push(c);
            sbAutoSave('cladiri', c).then(toastSave);
        }
        toast('✅ Clădire salvată!');
        closeModal('modalCladire');
        addActivity('Clădire salvată: ' + c.cod + ' — ' + c.nume, 'gold');
        renderCladiri();
        updateDashboard();
    }

    function editCladire(id) {
        const c = DB.cladiri.find(x => x.id === id);
        document.getElementById('cladireEditId').value = c.id;
        document.getElementById('cladireCod').value = c.cod;
        document.getElementById('cladireNume').value = c.nume;
        document.getElementById('cladireAdresa').value = c.adresa;
        document.getElementById('cladireEtaje').value = c.etaje;
        document.getElementById('cladireAn').value = c.an;
        if (document.getElementById('cladireSupUtila'))
            document.getElementById('cladireSupUtila').value = c.supUtila || '';
        if (document.getElementById('cladireSupDesfasurata'))
            document.getElementById('cladireSupDesfasurata').value = c.supDesfasurata || '';
        if (document.getElementById('cladireStare'))
            document.getElementById('cladireStare').value = c.stare || 'Bună';
        if (document.getElementById('cladireTipAcoperis'))
            document.getElementById('cladireTipAcoperis').value = c.tipAcoperis || '';
        if (document.getElementById('cladireTipIncalzire'))
            document.getElementById('cladireTipIncalzire').value = c.tipIncalzire || '';
        if (document.getElementById('cladireSupraveghere'))
            document.getElementById('cladireSupraveghere').value = c.supraveghere || '';
        if (document.getElementById('cladireGrupSanitar'))
            document.getElementById('cladireGrupSanitar').value = c.grupuriSanitare || '';
        if (document.getElementById('cladireStareReab'))
            document.getElementById('cladireStareReab').value = c.stareReabilitare || '';
        if (document.getElementById('cladireAnReab'))
            document.getElementById('cladireAnReab').value = c.anReabilitare || '';
        if (document.getElementById('cladireRegimInaltime'))
            document.getElementById('cladireRegimInaltime').value = c.regimInaltime || '';
        if (document.getElementById('cladireTipStructura'))
            document.getElementById('cladireTipStructura').value = c.tipStructura || '';
        if (document.getElementById('cladireSiiir'))
            document.getElementById('cladireSiiir').value = c.codSiiir || '';
        document.getElementById('cladireNote').value = c.note || '';
        openModal('modalCladire');
    }

    async function deleteCladire(id) {
        if (!confirm('Ștergi această clădire? Toate camerele și bunurile asociate vor rămâne neatribuite.'))
            return;
        DB.cladiri = DB.cladiri.filter(x => x.id != id);
        if (typeof SUPABASE_ENABLED !== 'undefined' && SUPABASE_ENABLED && typeof sbClient !== 'undefined' && sbClient) {
            try {
                await sbClient.from("cladiri").delete().eq("id", id);
            } catch (e) {
                console.warn('[DB] Delete Cladire:', e);
            }
        }
        toast('🗑️ Clădire ștearsă!');
        renderCladiri();
        updateDashboard();
    }

    function openFisaCladire(id) {
        const c = DB.cladiri.find(x => x.id === id);
        if (!c)
            return;
        const camere = DB.camere.filter(x => x.cladireId === id);
        const bunuri = DB.inventar.filter(x => x.cladireId === id);
        const tasks = (DB.tasks || []).filter(t => {
            if (t.cameraId) {
                const cam = DB.camere.find(cm => cm.id === t.cameraId);
                return cam && cam.cladireId === id;
            }
            return false;
        }
        );
        const valTotal = bunuri.reduce( (s, b) => s + (b.val || 0), 0);

        const overlay = document.createElement('div');
        overlay.id = 'fisaCladireOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:var(--bg,#0d1117);overflow-y:auto;padding:20px;animation:fadeIn 0.2s';
        overlay.innerHTML = `
            <div style="max-width:900px;margin:0 auto">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <h2 style="margin:0;font-size:20px;color:var(--ink,#e6edf3)">🏢 Fișa clădirii: ${c.cod} — ${c.nume}</h2>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-sm" style="background:var(--gold);color:#fff" onclick="printFisaCladire(${id})">📄 Raport PDF</button>
                  <button class="btn btn-outline btn-sm" onclick="document.getElementById('fisaCladireOverlay').remove()">✕ Închide</button>
                </div>
              </div>
    
              <div class="card" style="margin-bottom:16px">
                <div class="card-header"><span class="card-title">📝 Date generale</span></div>
                <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
                  <div><strong>Cod:</strong> ${c.cod}</div>
                  <div><strong>Denumire:</strong> ${c.nume}</div>
                  <div style="grid-column:span 2"><strong>Adresă:</strong> ${c.adresa}</div>
                  <div><strong>An construcție:</strong> ${c.an || '—'}</div>
                  <div><strong>Etaje:</strong> ${c.etaje || '—'}</div>
                  <div><strong>Suprafață utilă:</strong> ${c.supUtila ? c.supUtila + ' m²' : '—'}</div>
                  <div><strong>Suprafață desfășurată:</strong> ${c.supDesfasurata ? c.supDesfasurata + ' m²' : '—'}</div>
                  <div><strong>Stare generală:</strong> ${c.stare || '—'}</div>
                  <div><strong>Cod SIIIR:</strong> ${c.codSiiir || '—'}</div>
                </div>
              </div>
    
              <div class="card" style="margin-bottom:16px">
                <div class="card-header"><span class="card-title">🔧 Caracteristici tehnice</span></div>
                <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
                  <div><strong>Tip acoperiș:</strong> ${c.tipAcoperis || '—'}</div>
                  <div><strong>Tip încălzire:</strong> ${c.tipIncalzire || '—'}</div>
                  <div><strong>Tip structură:</strong> ${c.tipStructura || '—'}</div>
                  <div><strong>Regim înălțime:</strong> ${c.regimInaltime || '—'}</div>
                </div>
              </div>
    
              <div class="card" style="margin-bottom:16px">
                <div class="card-header"><span class="card-title">🛡️ Reabilitare și supraveghere</span></div>
                <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
                  <div><strong>Stare reabilitare:</strong> ${c.stareReabilitare || '—'}</div>
                  <div><strong>An reabilitare:</strong> ${c.anReabilitare || '—'}</div>
                  <div><strong>Supraveghere:</strong> ${c.supraveghere || '—'}</div>
                  <div><strong>Grupuri sanitare:</strong> ${c.grupuriSanitare || '—'}</div>
                </div>
              </div>
    
              <div class="card" style="margin-bottom:16px">
                <div class="card-header"><span class="card-title">🚪 Spații înregistrate (${camere.length})</span></div>
                <div style="padding:0 16px 16px">
                  ${camere.length ? `<table style="width:100%;font-size:12px"><thead><tr><th>Cod</th><th>Denumire</th><th>Tip</th><th>Etaj</th><th>Suprafață</th><th>Capacitate</th></tr></thead><tbody>
                  ${camere.map(cam => `<tr><td>${cam.cod}</td><td>${cam.nume}</td><td>${cam.tip || '—'}</td><td>${cam.etaj != null ? cam.etaj : '—'}</td><td>${cam.sup ? cam.sup + ' m²' : '—'}</td><td>${cam.cap || '—'}</td></tr>`).join('')}
                  </tbody></table>` : '<div style="padding:16px 0;color:var(--mist);font-size:12px">Nicio cameră înregistrată</div>'}
                </div>
              </div>
    
              <div class="card" style="margin-bottom:16px">
                <div class="card-header"><span class="card-title">📦 Bunuri inventariate (${bunuri.length}) — ${valTotal.toLocaleString('ro-RO')} RON</span></div>
                <div style="padding:0 16px 16px">
                  ${bunuri.length ? `<table style="width:100%;font-size:12px"><thead><tr><th>Nr. Inv.</th><th>Denumire</th><th>Categorie</th><th>Valoare</th><th>Stare</th></tr></thead><tbody>
                  ${bunuri.slice(0, 100).map(b => `<tr><td>${b.nrInv || '—'}</td><td>${b.nume}</td><td>${b.cat || '—'}</td><td>${(b.val || 0).toLocaleString('ro-RO')} RON</td><td>${b.stare || '—'}</td></tr>`).join('')}
                  ${bunuri.length > 100 ? `<tr><td colspan="5" style="text-align:center;color:var(--mist)">... și încă ${bunuri.length - 100} bunuri</td></tr>` : ''}
                  </tbody></table>` : '<div style="padding:16px 0;color:var(--mist);font-size:12px">Niciun bun inventariat</div>'}
                </div>
              </div>
    
              <div class="card" style="margin-bottom:16px">
                <div class="card-header"><span class="card-title">🔧 Sarcini mentenanță (${tasks.length})</span></div>
                <div style="padding:0 16px 16px">
                  ${tasks.length ? `<table style="width:100%;font-size:12px"><thead><tr><th>Titlu</th><th>Prioritate</th><th>Status</th><th>Termen</th></tr></thead><tbody>
                  ${tasks.map(t => `<tr><td>${t.titlu || t.title || '—'}</td><td>${t.prioritate || '—'}</td><td>${t.status || '—'}</td><td>${t.termen || '—'}</td></tr>`).join('')}
                  </tbody></table>` : '<div style="padding:16px 0;color:var(--mist);font-size:12px">Nicio sarcină activă</div>'}
                </div>
              </div>
    
              ${c.note ? `<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">📝 Observații</span></div><div style="padding:16px;font-size:13px">${c.note}</div></div>` : ''}
            </div>
          `;
        document.body.appendChild(overlay);
    }

    function printFisaCladire(id) {
        const c = DB.cladiri.find(x => x.id === id);
        if (!c)
            return;
        const camere = DB.camere.filter(x => x.cladireId === id);
        const bunuri = DB.inventar.filter(x => x.cladireId === id);
        const valTotal = bunuri.reduce( (s, b) => s + (b.val || 0), 0);
        const today = new Date().toLocaleDateString('ro-RO');
    
        const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"><title>Fișa clădirii ${c.cod}</title>
          <style>
            body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#222;padding:20px;max-width:800px;margin:0 auto}
            h1{font-size:16px;text-align:center;margin:0 0 4px} h2{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
            .header{text-align:center;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:12px}
            .header .school{font-size:14px;font-weight:700} .header .sub{font-size:11px;color:#555}
            table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px}
            th,td{border:1px solid #ccc;padding:4px 8px;text-align:left} th{background:#f5f5f5;font-weight:600}
            .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px;margin:8px 0}
            .info-grid div span:first-child{font-weight:600}
            @media print{body{padding:0} @page{margin:15mm}}
          </style></head><body>
            <div class="header">
              <div class="school">COLEGIUL NAȚIONAL „VASILE GOLDIȘ” ARAD</div>
              <div class="sub">Calea Victoriei nr. 1-3, Arad • Tel: 0257-280150</div>
            </div>
            <h1>🏢 Fișa clădirii: ${c.cod} — ${c.nume}</h1>
            <div style="text-align:center;font-size:11px;color:#666;margin-bottom:12px">Generat: ${today}</div>
    
            <h2>📝 Date generale</h2>
            <div class="info-grid">
              <div><span>Cod:</span> ${c.cod}</div><div><span>Denumire:</span> ${c.nume}</div>
              <div style="grid-column:span 2"><span>Adresă:</span> ${c.adresa}</div>
              <div><span>An construcție:</span> ${c.an || '—'}</div><div><span>Etaje:</span> ${c.etaje || '—'}</div>
              <div><span>Suprafață utilă:</span> ${c.supUtila ? c.supUtila + ' m²' : '—'}</div>
              <div><span>Suprafață desfășurată:</span> ${c.supDesfasurata ? c.supDesfasurata + ' m²' : '—'}</div>
              <div><span>Stare generală:</span> ${c.stare || '—'}</div><div><span>Cod SIIIR:</span> ${c.codSiiir || '—'}</div>
            </div>
    
            <h2>🔧 Caracteristici tehnice</h2>
            <div class="info-grid">
              <div><span>Tip acoperiș:</span> ${c.tipAcoperis || '—'}</div><div><span>Tip încălzire:</span> ${c.tipIncalzire || '—'}</div>
              <div><span>Tip structură:</span> ${c.tipStructura || '—'}</div><div><span>Regim înălțime:</span> ${c.regimInaltime || '—'}</div>
              <div><span>Supraveghere:</span> ${c.supraveghere || '—'}</div><div><span>Grupuri sanitare:</span> ${c.grupuriSanitare || '—'}</div>
              <div><span>Stare reabilitare:</span> ${c.stareReabilitare || '—'}</div><div><span>An reabilitare:</span> ${c.anReabilitare || '—'}</div>
            </div>
    
            <h2>🚪 Spații înregistrate (${camere.length})</h2>
            ${camere.length ? `<table><thead><tr><th>Cod</th><th>Denumire</th><th>Tip</th><th>Etaj</th><th>Suprafață</th><th>Capacitate</th></tr></thead><tbody>
            ${camere.map(cam => `<tr><td>${cam.cod}</td><td>${cam.nume}</td><td>${cam.tip || ''}</td><td>${cam.etaj != null ? cam.etaj : ''}</td><td>${cam.sup ? cam.sup + ' m²' : ''}</td><td>${cam.cap || ''}</td></tr>`).join('')}
            </tbody></table>` : '<p style="color:#999">Nicio cameră înregistrată</p>'}
    
            <h2>📦 Bunuri inventariate (${bunuri.length}) — Total: ${valTotal.toLocaleString('ro-RO')} RON</h2>
            ${bunuri.length ? `<table><thead><tr><th>Nr. Inv.</th><th>Denumire</th><th>Categorie</th><th>Valoare</th><th>Stare</th></tr></thead><tbody>
            ${bunuri.map(b => `<tr><td>${b.nrInv || ''}</td><td>${b.nume}</td><td>${b.cat || ''}</td><td>${(b.val || 0).toLocaleString('ro-RO')} RON</td><td>${b.stare || ''}</td></tr>`).join('')}
            </tbody></table>` : '<p style="color:#999">Niciun bun inventariat</p>'}
    
            ${c.note ? `<h2>📝 Observații</h2><p>${c.note}</p>` : ''}
    
            <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;font-size:11px;text-align:center">
              <div><div style="border-top:1px solid #333;padding-top:4px">Administrator patrimoniu</div></div>
              <div><div style="border-top:1px solid #333;padding-top:4px">Contabil șef</div></div>
              <div><div style="border-top:1px solid #333;padding-top:4px">Director</div></div>
            </div>
          </body></html>`;
    
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        w.onload = () => {
            w.print();
        }
        ;
    }

    async function stergeToateCladirile() {
        if (!confirm('🚨 ATENȚIE: Ești sigur că vrei să ștergi aboslut toate clădirile din baza de date?\nToate camerele și bunurile vor rămâne neatribuite.'))
            return;
        toast('⏳ Se resetează asocierile...');
    
        for (let b of DB.inventar) {
            if (b.cladireId !== null) {
                b.cladireId = null;
                if (SUPABASE_ENABLED && sbClient) {
                    await sbClient.from('inventar').update({
                        cladire_id: null
                    }).eq('id', b.id);
                }
            }
        }
        for (let c of DB.camere) {
            if (c.cladireId !== null) {
                c.cladireId = null;
                if (SUPABASE_ENABLED && sbClient) {
                    await sbClient.from('camere').update({
                        cladire_id: null
                    }).eq('id', c.id);
                }
            }
        }
    
        toast('🗑️ Se șterg clădirile din Cloud...');
        DB.cladiri = [];
    
        if (SUPABASE_ENABLED && sbClient) {
            try {
                await sbClient.from('cladiri').delete().gt('id', 0);
            } catch (e) {
                console.warn(e);
            }
        }
    
        toast('✅ Resetare completă! Acum ai 0 clădiri în sistem.');
        addActivity('Toate clădirile au fost șterse din sistem (Reset)', 'rose');
        renderCladiri();
        if (typeof renderCamere === 'function')
            renderCamere();
        updateDashboard();
    }

    // Export to window
    window.importSIIIR = importSIIIR;
    window.preluareCladireSIIIR = preluareCladireSIIIR;
    window.saveCladire = saveCladire;
    window.editCladire = editCladire;
    window.deleteCladire = deleteCladire;
    window.openFisaCladire = openFisaCladire;
    window.printFisaCladire = printFisaCladire;
    window.stergeToateCladirile = stergeToateCladirile;

    // Room Functions
    async function stergeToateCamerele() {
        if (!confirm('🚨 ATENȚIE: Ești sigur că vrei să ștergi aboslut toate camerele din baza de date?\nToate bunurile vor rămâne neatribuite (fără locație în interiorul clădirilor).'))
            return;
        toast('⏳ Se resetează asocierile...');
        // 1. Remove bindings from Inventar to avoid FK constraint fails
        for (let b of DB.inventar) {
            if (b.cameraId !== null) {
                b.cameraId = null;
                // Update quietly in DB
                if (SUPABASE_ENABLED && sbClient) {
                    await sbClient.from('inventar').update({
                        camera_id: null
                    }).eq('id', b.id);
                }
            }
        }

        toast('🗑️ Se șterg camerele din Cloud...');
        // 2. Clear out DB.camere
        DB.camere = [];

        // 3. Clear from Supabase
        if (SUPABASE_ENABLED && sbClient) {
            try {
                await sbClient.from('camere').delete().gt('id', 0);
            } catch (e) {
                console.warn(e);
            }
        }

        toast('✅ Resetare completă! Acum ai 0 camere în sistem.');
        addActivity('Toate camerele au fost șterse din sistem (Reset)', 'rose');
        renderCamere();
        updateDashboard();
    }

    async function importCamereSIIIR() {
        if (!confirm('📥 Se vor importa toate camerele din SIIIR pentru clădirile existente (CLD-A și CLD-B).\nCamerele deja existente cu același cod nu se vor duplica.\n\nContinui?'))
            return;

        const clda = DB.cladiri.find(c => c.cod === 'CLD-A');
        const cldb = DB.cladiri.find(c => c.cod === 'CLD-B');
        if (!clda && !cldb) {
            toast('⚠️ Nu există clădiri CLD-A sau CLD-B în sistem. Importă mai întâi clădirile din SIIIR!');
            return;
        }
        toast('⏳ Se importă camerele din SIIIR...');

        const siiirCamere = {
            'CLD-A': [{
                cod: 'A-P-07',
                nume: 'Sala 7',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 54,
                cap: 25,
                codSiiir: 1
            }, {
                cod: 'A-P-08',
                nume: 'Sala 8',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 54,
                cap: 25,
                codSiiir: 2
            }, {
                cod: 'A-P-09',
                nume: 'Sala 9',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 54,
                cap: 25,
                codSiiir: 3
            }, {
                cod: 'A-P-25',
                nume: 'Sala 25',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 54,
                cap: 25,
                codSiiir: 5
            }, {
                cod: 'A-P-26',
                nume: 'Sala 26',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 54,
                cap: 25,
                codSiiir: 6
            }, {
                cod: 'A-P-14',
                nume: 'Sala 14',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 54,
                cap: 25,
                codSiiir: 26
            }, {
                cod: 'A-P-PS',
                nume: 'Cabinet psihologie',
                tip: 'Birou',
                etaj: 0,
                sup: 20,
                cap: 10,
                codSiiir: 37
            }, {
                cod: 'A-P-CM',
                nume: 'Cabinet medical',
                tip: 'Birou',
                etaj: 0,
                sup: 25,
                cap: 2,
                codSiiir: 38
            }, {
                cod: 'A-P-CS',
                nume: 'Cabinet stomatologic',
                tip: 'Birou',
                etaj: 0,
                sup: 25,
                cap: 2,
                codSiiir: 39
            }, {
                cod: 'A-P-BD1',
                nume: 'Birou direcțiune 1',
                tip: 'Birou',
                etaj: 0,
                sup: 20,
                cap: 1,
                codSiiir: 40
            }, {
                cod: 'A-P-BD2',
                nume: 'Birou direcțiune 2',
                tip: 'Birou',
                etaj: 0,
                sup: 18,
                cap: 1,
                codSiiir: 41
            }, {
                cod: 'A-P-SEC',
                nume: 'Secretariat',
                tip: 'Birou',
                etaj: 0,
                sup: 20,
                cap: 2,
                codSiiir: 42
            }, {
                cod: 'A-P-CTB',
                nume: 'Contabilitate',
                tip: 'Birou',
                etaj: 0,
                sup: 20,
                cap: 2,
                codSiiir: 43
            }, {
                cod: 'A-P-INF',
                nume: 'Birou informatician',
                tip: 'Birou',
                etaj: 0,
                sup: 15,
                cap: 1,
                codSiiir: 44
            }, {
                cod: 'A-P-CCE',
                nume: 'Cabinet consilier ed.',
                tip: 'Birou',
                etaj: 0,
                sup: 15,
                cap: 1,
                codSiiir: 46
            }, {
                cod: 'A-P-BIB',
                nume: 'Bibliotecă',
                tip: 'Bibliotecă',
                etaj: 0,
                sup: 70,
                cap: 0,
                codSiiir: 34
            }, {
                cod: 'A-1-106',
                nume: 'Sala 106',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 54,
                cap: 25,
                codSiiir: 7
            }, {
                cod: 'A-1-107',
                nume: 'Sala 107',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 54,
                cap: 25,
                codSiiir: 8
            }, {
                cod: 'A-1-108',
                nume: 'Sala 108',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 54,
                cap: 25,
                codSiiir: 9
            }, {
                cod: 'A-1-111',
                nume: 'Sala 111',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 54,
                cap: 25,
                codSiiir: 10
            }, {
                cod: 'A-1-112',
                nume: 'Sala 112',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 54,
                cap: 25,
                codSiiir: 11
            }, {
                cod: 'A-1-113',
                nume: 'Sala 113',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 54,
                cap: 25,
                codSiiir: 12
            }, {
                cod: 'A-1-115',
                nume: 'Sala 115',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 54,
                cap: 25,
                codSiiir: 13
            }, {
                cod: 'A-1-LI1',
                nume: 'Laborator informatică 1',
                tip: 'Laborator',
                etaj: 1,
                sup: 54,
                cap: 26,
                codSiiir: 14
            }, {
                cod: 'A-1-LI2',
                nume: 'Laborator informatică 2',
                tip: 'Laborator',
                etaj: 1,
                sup: 54,
                cap: 18,
                codSiiir: 27
            }, {
                cod: 'A-1-LI3',
                nume: 'Laborator informatică 3',
                tip: 'Laborator',
                etaj: 1,
                sup: 54,
                cap: 18,
                codSiiir: 28
            }, {
                cod: 'A-1-LF',
                nume: 'Laborator fizică',
                tip: 'Laborator',
                etaj: 1,
                sup: 72,
                cap: 30,
                codSiiir: 29
            }, {
                cod: 'A-1-CAN1',
                nume: 'Cancelarie 1',
                tip: 'Birou',
                etaj: 1,
                sup: 115,
                cap: 40,
                codSiiir: 35
            }, {
                cod: 'A-1-CAN2',
                nume: 'Cancelarie 2',
                tip: 'Birou',
                etaj: 1,
                sup: 44,
                cap: 25,
                codSiiir: 36
            }, {
                cod: 'A-1-SF',
                nume: 'Sală festivă',
                tip: 'Auxiliar',
                etaj: 1,
                sup: 72,
                cap: 45,
                codSiiir: 45
            }, {
                cod: 'A-2-207',
                nume: 'Sala 207',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 16
            }, {
                cod: 'A-2-208',
                nume: 'Sala 208',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 17
            }, {
                cod: 'A-2-211',
                nume: 'Sala 211',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 18
            }, {
                cod: 'A-2-212',
                nume: 'Sala 212',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 19
            }, {
                cod: 'A-2-213',
                nume: 'Sala 213',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 20
            }, {
                cod: 'A-2-215',
                nume: 'Sala 215',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 21
            }, {
                cod: 'A-2-216',
                nume: 'Sala 216',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 22
            }, {
                cod: 'A-2-218',
                nume: 'Sala 218',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 23
            }, {
                cod: 'A-2-219',
                nume: 'Sala 219',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 24
            }, {
                cod: 'A-2-201',
                nume: 'Sala 201',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 25
            }, {
                cod: 'A-2-206',
                nume: 'Sala 206',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 54,
                cap: 25,
                codSiiir: 15
            }, {
                cod: 'A-2-LCHI',
                nume: 'Laborator chimie',
                tip: 'Laborator',
                etaj: 2,
                sup: 72,
                cap: 30,
                codSiiir: 30
            }, {
                cod: 'A-2-LBIO',
                nume: 'Laborator biologie',
                tip: 'Laborator',
                etaj: 2,
                sup: 72,
                cap: 30,
                codSiiir: 31
            }, {
                cod: 'A-2-CLS1',
                nume: 'Cabinet limbi străine 1',
                tip: 'Birou',
                etaj: 2,
                sup: 48,
                cap: 25,
                codSiiir: 32
            }, {
                cod: 'A-2-CLS2',
                nume: 'Cabinet limbi străine 2',
                tip: 'Birou',
                etaj: 2,
                sup: 70,
                cap: 30,
                codSiiir: 33
            }],
            'CLD-B': [{
                cod: 'B-P-6',
                nume: 'Sala 6',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 53,
                cap: 25,
                codSiiir: 76
            }, {
                cod: 'B-P-12',
                nume: 'Sala 12',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 53,
                cap: 25,
                codSiiir: 78
            }, {
                cod: 'B-P-17',
                nume: 'Sala 17',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 45,
                cap: 25,
                codSiiir: 79
            }, {
                cod: 'B-P-18',
                nume: 'Sala 18',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 53,
                cap: 25,
                codSiiir: 80
            }, {
                cod: 'B-P-7',
                nume: 'Sala 7',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 53,
                cap: 25,
                codSiiir: 77
            }, {
                cod: 'B-P-19',
                nume: 'Sala 19',
                tip: 'Sală de clasă',
                etaj: 0,
                sup: 53,
                cap: 25,
                codSiiir: 81
            }, {
                cod: 'B-P-CAN1',
                nume: 'Cancelarie 1',
                tip: 'Birou',
                etaj: 0,
                sup: 72,
                cap: 45,
                codSiiir: 100
            }, {
                cod: 'B-P-CAN2',
                nume: 'Cancelarie 2',
                tip: 'Birou',
                etaj: 0,
                sup: 32,
                cap: 20,
                codSiiir: 101
            }, {
                cod: 'B-P-SEC',
                nume: 'Secretariat',
                tip: 'Birou',
                etaj: 0,
                sup: 18,
                cap: 1,
                codSiiir: 99
            }, {
                cod: 'B-P-BDA',
                nume: 'Birou director adjunct',
                tip: 'Birou',
                etaj: 0,
                sup: 18,
                cap: 1,
                codSiiir: 98
            }, {
                cod: 'B-P-MAG',
                nume: 'Magazie',
                tip: 'Depozit',
                etaj: 0,
                sup: 12,
                cap: 1,
                codSiiir: 102
            }, {
                cod: 'B-P-ARH',
                nume: 'Arhivă',
                tip: 'Birou',
                etaj: 0,
                sup: 5,
                cap: 0,
                codSiiir: 116
            }, {
                cod: 'B-1-101',
                nume: 'Sala 101',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 82
            }, {
                cod: 'B-1-102',
                nume: 'Sala 102',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 83
            }, {
                cod: 'B-1-105',
                nume: 'Sala 105',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 84
            }, {
                cod: 'B-1-113',
                nume: 'Sala 113',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 85
            }, {
                cod: 'B-1-114',
                nume: 'Sala 114',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 86
            }, {
                cod: 'B-1-115',
                nume: 'Sala 115',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 87
            }, {
                cod: 'B-1-116',
                nume: 'Sala 116',
                tip: 'Sală de clasă',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 88
            }, {
                cod: 'B-1-LFI',
                nume: 'Laborator fizică',
                tip: 'Laborator',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 103
            }, {
                cod: 'B-1-LIN',
                nume: 'Laborator informatică',
                tip: 'Laborator',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 104
            }, {
                cod: 'B-1-LCHI',
                nume: 'Laborator chimie',
                tip: 'Laborator',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 105
            }, {
                cod: 'B-1-LBIO',
                nume: 'Laborator biologie',
                tip: 'Laborator',
                etaj: 1,
                sup: 53,
                cap: 25,
                codSiiir: 106
            }, {
                cod: 'B-1-CIS',
                nume: 'Cabinet istorie',
                tip: 'Birou',
                etaj: 1,
                sup: 12,
                cap: 1,
                codSiiir: 107
            }, {
                cod: 'B-1-CPS',
                nume: 'Cabinet psihologie',
                tip: 'Birou',
                etaj: 1,
                sup: 15,
                cap: 1,
                codSiiir: 108
            }, {
                cod: 'B-1-CCH',
                nume: 'Cabinet chimie',
                tip: 'Birou',
                etaj: 1,
                sup: 15,
                cap: 1,
                codSiiir: 109
            }, {
                cod: 'B-1-CGE',
                nume: 'Cabinet geografie',
                tip: 'Birou',
                etaj: 2,
                sup: 12,
                cap: 1,
                codSiiir: 110
            }, {
                cod: 'B-1-CM',
                nume: 'Cabinet medical',
                tip: 'Birou',
                etaj: 2,
                sup: 15,
                cap: 2,
                codSiiir: 111
            }, {
                cod: 'B-1-CI',
                nume: 'Cabinet învățători',
                tip: 'Birou',
                etaj: 2,
                sup: 15,
                cap: 1,
                codSiiir: 112
            }, {
                cod: 'B-1-CBIO',
                nume: 'Cabinet biologie',
                tip: 'Birou',
                etaj: 2,
                sup: 15,
                cap: 1,
                codSiiir: 113
            }, {
                cod: 'B-1-CLR',
                nume: 'Cabinet limba română',
                tip: 'Birou',
                etaj: 2,
                sup: 15,
                cap: 1,
                codSiiir: 114
            }, {
                cod: 'B-2-201',
                nume: 'Sala 201',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 89
            }, {
                cod: 'B-2-202',
                nume: 'Sala 202',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 90
            }, {
                cod: 'B-2-203',
                nume: 'Sala 203',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 91
            }, {
                cod: 'B-2-204',
                nume: 'Sala 204',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 92
            }, {
                cod: 'B-2-205',
                nume: 'Sala 205',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 93
            }, {
                cod: 'B-2-214',
                nume: 'Sala 214',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 94
            }, {
                cod: 'B-2-215',
                nume: 'Sala 215',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 95
            }, {
                cod: 'B-2-216',
                nume: 'Sala 216',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 96
            }, {
                cod: 'B-2-217',
                nume: 'Sala 217',
                tip: 'Sală de clasă',
                etaj: 2,
                sup: 53,
                cap: 25,
                codSiiir: 97
            }, {
                cod: 'B-2-BIB',
                nume: 'Bibliotecă',
                tip: 'Bibliotecă',
                etaj: 2,
                sup: 25,
                cap: 0,
                codSiiir: 115
            }]
        };

        let added = 0;
        try {
            for (const [cldCod,camere] of Object.entries(siiirCamere)) {
                const cld = DB.cladiri.find(c => c.cod === cldCod);
                if (!cld)
                    continue;

                for (let i = 0; i < camere.length; i++) {
                    const c = camere[i];
                    // Verifică dacă camera există deja (după cod + clădire)
                    if (DB.camere.find(x => x.cod === c.cod && x.cladireId === cld.id))
                        continue;

                    let camId = Date.now() + added + i;
                    let camLoaded = false;
                    if (SUPABASE_ENABLED && sbClient) {
                        const {data} = await sbClient.from('camere').select('id').eq('cod', c.cod).eq('cladire_id', cld.id).maybeSingle();
                        if (data) {
                            camId = data.id;
                            camLoaded = true;
                        }
                    }
                    const cam = {
                        ...c,
                        id: camId,
                        _loaded: camLoaded,
                        cladireId: cld.id,
                        resp: 'Admin. patrimoniu'
                    };
                    DB.camere.push(cam);
                    await sbAutoSave('camere', cam);
                    added++;
                }
            }

            if (added > 0) {
                toast(`✅ Import SIIIR finalizat cu succes! ${added} camere noi adăugate.`);
                addActivity(`Import SIIIR camere: ${added} spații adăugate`, 'teal');
            } else {
                toast('ℹ️ Toate camerele din SIIIR existau deja. Nicio cameră nouă adăugată.');
            }
            renderCamere();
            updateDashboard();
        } catch (err) {
            console.error('Import SIIIR camere eroare:', err);
            toast('❌ Eroare la importul SIIIR.');
        }
    }

    function renderCamere(data) {
        const items = data || DB.camere;
        const countEl = document.getElementById('camCount');
        if (countEl) countEl.textContent = items.length + ' spații';
        const tbody = document.getElementById('camTable');
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty"><div class="empty-icon">🚪</div><p>Nicio cameră.</p></div></td></tr>';
            return;
        }
        tbody.innerHTML = items.map(c => {
            const cld = DB.cladiri.find(x => x.id === c.cladireId);
            const bunuri = DB.inventar.filter(b => b.cameraId === c.id);
            return `<tr>
          <td><code style="background:var(--surface);padding:2px 7px;border-radius:5px;font-size:11px">${c.cod}</code></td>
          <td><strong>${c.nume}</strong><div style="font-size:11px;color:var(--mist)">Nr. ${c.nr || '—'}</div></td>
          <td>${cld ? '<span class="badge b-gray">' + cld.cod + '</span>' : '—'}</td>
          <td>${c.etaj}</td>
          <td><span class="badge b-blue">${c.tip}</span></td>
          <td style="font-size:11px;color:var(--slate)">${c.destinatie || '—'}</td>
          <td style="font-size:12px">${c.resp}</td>
          <td><strong>${bunuri.length}</strong></td>
          <td style="display:flex;gap:4px;padding-top:9px">
            <button class="btn btn-outline btn-sm" onclick="editCamera(${c.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCamera(${c.id})">🗑️</button>
          </td>
        </tr>`;
        }
        ).join('');
    }

    function filterCamere(q) {
        const s = (q !== undefined ? q : document.getElementById('searchCam').value).toLowerCase();
        const cld = document.getElementById('filterCladireC').value;
        const tip = document.getElementById('filterTipC').value;
        renderCamere(DB.camere.filter(c => (!s || c.nume.toLowerCase().includes(s) || c.cod.toLowerCase().includes(s)) && (!cld || c.cladireId == cld) && (!tip || c.tip === tip)));
    }

    function openModalCamera() {
        populateCladireSelects();
        document.getElementById('cameraEditId').value = '';
        const dest = document.getElementById('camDestinatie');
        if (dest) dest.value = '';
        openModal('modalCamera');
    }

    function saveCamera() {
        if (window._isSaving)
            return;
        window._isSaving = true;
        setTimeout( () => window._isSaving = false, 1000);
        const id = document.getElementById('cameraEditId').value;
        const etajVal = document.getElementById('camEtaj').value;
        const etajMap = { 'Parter': 0, 'Etaj 1': 1, 'Etaj 2': 2, 'Etaj 3': 3, 'Subsol': -1 };
        const c = {
            id: id ? parseInt(id) : Date.now(),
            cod: document.getElementById('camCod').value,
            nr: document.getElementById('camNr').value,
            tip: document.getElementById('camTip').value,
            nume: document.getElementById('camNume').value,
            cladireId: parseInt(document.getElementById('camCladire').value),
            etaj: etajMap[etajVal] !== undefined ? etajMap[etajVal] : (parseInt(etajVal) || 0),
            resp: document.getElementById('camResp').value,
            sup: parseFloat(document.getElementById('camSup').value) || 0,
            destinatie: document.getElementById('camDestinatie') ? document.getElementById('camDestinatie').value : ''
        };
        if (!c.cod || !c.nume) {
            toast('⚠️ Completează codul și denumirea!');
            return;
        }
        // Verificare unicitate cod
        const duplicat = DB.camere.find(x => x.cod === c.cod && x.id != c.id);
        if (duplicat) {
            toast(`⚠️ Codul ${c.cod} este deja utilizat de "${duplicat.nume}"!`);
            return;
        }
        if (id) {
            const i = DB.camere.findIndex(x => x.id == id);
            const existing = DB.camere[i];
            DB.camere[i] = {
                ...existing,
                ...c,
                id: existing.id,
                _loaded: existing._loaded
            };
            sbAutoSave('camere', DB.camere[i]).then(toastSave);
        } else {
            DB.camere.push(c);
            sbAutoSave('camere', c).then(toastSave);
        }
        toast('✅ Cameră salvată!');
        closeModal('modalCamera');
        renderCamere();
    }

    function editCamera(id) {
        populateCladireSelects();
        const c = DB.camere.find(x => x.id == id);
        if (!c) {
            toast('⚠️ Camera nu a fost găsită! Reîncărcați pagina.');
            return;
        }
        document.getElementById('cameraEditId').value = c.id;
        document.getElementById('camCod').value = c.cod;
        document.getElementById('camNr').value = c.nr || '';
        document.getElementById('camTip').value = c.tip;
        document.getElementById('camNume').value = c.nume;
        document.getElementById('camCladire').value = c.cladireId;
        document.getElementById('camEtaj').value = c.etaj;
        document.getElementById('camResp').value = c.resp;
        document.getElementById('camSup').value = c.sup || '';
        if (document.getElementById('camDestinatie'))
            document.getElementById('camDestinatie').value = c.destinatie || '';
        openModal('modalCamera');
    }

    function deleteCamera(id) {
        if (!confirm('Ștergi camera?'))
            return;
        DB.camere = DB.camere.filter(x => x.id !== id);
        toast('🗑️ Cameră ștearsă!');
        renderCamere();
    }

    // Export to window
    window.stergeToateCamerele = stergeToateCamerele;
    window.importCamereSIIIR = importCamereSIIIR;
    window.renderCamere = renderCamere;
    window.filterCamere = filterCamere;
    window.openModalCamera = openModalCamera;
    window.saveCamera = saveCamera;
    window.editCamera = editCamera;
    window.deleteCamera = deleteCamera;

    // Inventory Functions
    function renderInventar(data) {
        const items = data || DB.inventar;
        const tbody = document.getElementById('invTable');
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty"><div class="empty-icon">📦</div><p>Niciun bun înregistrat.</p></div></td></tr>';
            return;
        }
        tbody.innerHTML = items.map(b => {
            const cld = DB.cladiri.find(x => x.id === b.cladireId);
            const cam = DB.camere.find(x => x.id === b.cameraId);
            const statusClass = b.status === 'CASAT' ? 'b-danger' : (b.status === 'UZAT' ? 'b-orange' : 'b-green');
            return `<tr>
          <td><code style="font-size:11px">${b.nrInv || '—'}</code></td>
          <td><strong>${b.nume}</strong></td>
          <td><span class="badge b-gray">${b.cat}</span></td>
          <td>${cld ? cld.cod : '—'} / ${cam ? cam.cod : '—'}</td>
          <td>${b.qty || 1}</td>
          <td>${(b.val || 0).toLocaleString('ro-RO')}</td>
          <td><span class="badge ${statusClass}">${b.status || 'BUN'}</span></td>
          <td style="display:flex;gap:4px">
            <button class="btn btn-outline btn-sm" onclick="editBun(${b.id})">✏️</button>
            <button class="btn btn-outline b-teal btn-sm" onclick="showQR('${b.nrInv || b.id}')">📲</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBun(${b.id})">🗑️</button>
          </td>
        </tr>`;
        }).join('');
        if (typeof updateDashboard === 'function') updateDashboard();
    }

    function filterInventar(q) {
        const s = (q || '').toLowerCase();
        const cat = document.getElementById('filterCat').value;
        const status = document.getElementById('filterStatus').value;
        renderInventar(DB.inventar.filter(b => (!s || b.nume.toLowerCase().includes(s) || (b.nrInv && b.nrInv.toLowerCase().includes(s))) && (!cat || b.cat === cat) && (!status || b.status === status)));
    }

    function openModalBun() {
        populateCladireSelects();
        document.getElementById('bunEditId').value = '';
        document.getElementById('formBun').reset();
        document.querySelector('#modalBun .modal-title').textContent = '➕ Adăugare Bun Nou';
        openModal('modalBun');
    }

    function updateCamereForBun(cladireId, targetSelectId, selectedCameraId) {
        const select = document.getElementById(targetSelectId);
        if (!select) return;
        select.innerHTML = '<option value="">— Alege camera —</option>';
        if (!cladireId) return;
        const camere = DB.camere.filter(c => c.cladireId == cladireId);
        camere.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.cod} — ${c.nume}`;
            if (selectedCameraId && c.id == selectedCameraId)
                opt.selected = true;
            select.appendChild(opt);
        });
    }

    function editBun(id) {
        const b = DB.inventar.find(x => x.id == id);
        if (!b) return;
        populateCladireSelects();
        document.getElementById('bunEditId').value = b.id;
        document.getElementById('bunNrInv').value = b.nrInv || '';
        document.getElementById('bunNume').value = b.nume;
        document.getElementById('bunCat').value = b.cat;
        document.getElementById('bunQty').value = b.qty || b.cant || 1;
        document.getElementById('bunVal').value = b.val || '';
        document.getElementById('bunData').value = b.dataPIF || b.data || '';
        document.getElementById('bunStare').value = b.stare || 'Bun';
        document.getElementById('bunDesc').value = b.desc || b.obs || '';
        document.getElementById('bunCladire').value = b.cladireId || '';
        updateCamereForBun(b.cladireId, 'bunCamera', b.cameraId);
        document.querySelector('#modalBun .modal-title').textContent = '✏️ Editare Bun';
        openModal('modalBun');
    }

    function deleteBun(id) {
        if (!confirm('Ștergi acest bun?')) return;
        DB.inventar = DB.inventar.filter(x => x.id !== id);
        toast('🗑️ Bun șters!');
        renderInventar();
    }

    // QR Code Functions
    function renderQR(data) {
        const items = data || DB.inventar;
        const tbody = document.getElementById('qrTable');
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="5">Niciun bun găsit pentru generare QR.</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(b => {
            const cam = DB.camere.find(x => x.id === b.cameraId);
            return `<tr>
          <td><code style="font-size:11px">${b.nrInv || '—'}</code></td>
          <td><strong>${b.nume}</strong></td>
          <td>${cam ? cam.cod : '—'}</td>
          <td>${b.status || 'BUN'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="showQR('${b.nrInv || b.id}')">📲 Generează QR</button>
          </td>
        </tr>`;
        }).join('');
    }

    function filterQR(q) {
        const s = (q || '').toLowerCase();
        renderQR(DB.inventar.filter(b => (!s || b.nume.toLowerCase().includes(s) || (b.nrInv && b.nrInv.toLowerCase().includes(s)))));
    }

    function showQR(id) {
        const b = DB.inventar.find(x => x.nrInv === id || x.id == id);
        if (!b) {
            toast('⚠️ Bunul nu a fost găsit!', 'error');
            return;
        }
        const canvas = document.getElementById('qrCanvas');
        if (!canvas) return;
        canvas.innerHTML = '';
        const qrData = `CNVG|${b.nrInv || b.id}|${b.nume}`;
        if (typeof QRCode !== 'undefined') {
            new QRCode(canvas, {
                text: qrData,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            canvas.innerHTML = '<p style="color:red">Eroare: Biblioteca QR nu este încărcată.</p>';
        }
        const info = document.getElementById('qrInfo');
        if (info) {
            info.innerHTML = `<strong>${b.nrInv || 'Fără nr.'}</strong><br>${b.nume}<br><small>${b.cat}</small>`;
        }
        openModal('modalQR');
    }

    function printQR() {
        const canvas = document.getElementById('qrCanvas');
        if (!canvas) return;
        const printWindow = window.open('', '_blank');
        const info = document.getElementById('qrInfo').innerHTML;
        printWindow.document.write(`
            <html>
            <head><title>Print QR</title><style>body{text-align:center;padding:50px;font-family:sans-serif;}</style></head>
            <body onload="window.print();window.close();">
                <div style="margin-bottom:20px;">${canvas.innerHTML}</div>
                <div>${info}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // Supplier Functions
    function renderFurnizori(data) {
        const items = data || DB.furnizori;
        const tbody = document.getElementById('furnTable');
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty">Niciun furnizor.</div></td></tr>';
            return;
        }
        tbody.innerHTML = items.map(f => `<tr>
          <td><strong>${f.nume}</strong></td>
          <td>${f.cui || '—'}</td>
          <td>${f.contact || '—'}</td>
          <td>${f.tel || '—'}</td>
          <td>${f.email || '—'}</td>
          <td><span class="badge b-gray">${f.cat || 'Diverse'}</span></td>
          <td style="display:flex;gap:4px">
            <button class="btn btn-outline btn-sm" onclick="editFurnizor(${f.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteFurnizor(${f.id})">🗑️</button>
          </td>
        </tr>`).join('');
    }

    function filterFurnizori(q) {
        const s = (q || '').toLowerCase();
        renderFurnizori(DB.furnizori.filter(f => (!s || f.nume.toLowerCase().includes(s) || (f.cui && f.cui.toLowerCase().includes(s)))));
    }

    function saveFurnizor() {
        if (window._isSaving) return;
        window._isSaving = true;
        setTimeout(() => window._isSaving = false, 1000);
        const id = document.getElementById('furnEditId').value;
        const f = {
            id: id ? parseInt(id) : Date.now(),
            nume: document.getElementById('furnNume').value,
            cui: document.getElementById('furnCui').value,
            tel: document.getElementById('furnTel').value,
            email: document.getElementById('furnEmail').value,
            contact: document.getElementById('furnContact').value,
            adresa: document.getElementById('furnAdresa').value,
            judet: document.getElementById('furnJudet').value,
            cat: document.getElementById('furnCat').value
        };
        if (!f.nume) { toast('⚠️ Nume obligatoriu!'); return; }
        if (id) {
            const i = DB.furnizori.findIndex(x => x.id == id);
            DB.furnizori[i] = f;
            sbAutoSave('furnizori', f).then(toastSave);
        } else {
            DB.furnizori.push(f);
            sbAutoSave('furnizori', f).then(toastSave);
        }
        toast('✅ Furnizor salvat!');
        closeModal('modalFurnizor');
        renderFurnizori();
    }

    function editFurnizor(id) {
        const f = DB.furnizori.find(x => x.id === id);
        document.getElementById('furnEditId').value = f.id;
        document.getElementById('furnNume').value = f.nume;
        document.getElementById('furnCui').value = f.cui || '';
        document.getElementById('furnTel').value = f.tel || '';
        document.getElementById('furnEmail').value = f.email || '';
        document.getElementById('furnContact').value = f.contact || '';
        document.getElementById('furnAdresa').value = f.adresa || '';
        document.getElementById('furnJudet').value = f.judet || '';
        document.getElementById('furnCat').value = f.cat || 'Divers';
        openModal('modalFurnizor');
    }

    function deleteFurnizor(id) {
        if (!confirm('Ștergi furnizorul?')) return;
        DB.furnizori = DB.furnizori.filter(x => x.id !== id);
        toast('🗑️ Furnizor șters!');
        renderFurnizori();
    }

    // Export to window
    window.renderPersonal = renderPersonal;
    window.filterPersonal = filterPersonal;
    window.savePersonal = savePersonal;
    window.editPersonal = editPersonal;
    window.deletePersonal = deletePersonal;

    window.toggleCladireDetail = toggleCladireDetail;
    window.renderCladiri = renderCladiri;
    window.filterCladiri = filterCladiri;
    window.importSIIIR = importSIIIR;
    window.importSIIIRData = importSIIIR; // Compatibility alias
    window.preluareCladireSIIIR = preluareCladireSIIIR;
    window.saveCladire = saveCladire;
    window.editCladire = editCladire;
    window.deleteCladire = deleteCladire;
    window.openFisaCladire = openFisaCladire;
    window.printFisaCladire = printFisaCladire;
    window.stergeToateCladirile = stergeToateCladirile;

    window.stergeToateCamerele = stergeToateCamerele;
    window.importCamereSIIIR = importCamereSIIIR;
    window.renderCamere = renderCamere;
    window.filterCamere = filterCamere;
    window.openModalCamera = openModalCamera;
    window.saveCamera = saveCamera;
    window.editCamera = editCamera;
    window.deleteCamera = deleteCamera;

    window.renderInventar = renderInventar;
    window.filterInventar = filterInventar;
    window.openModalBun = openModalBun;
    window.updateCamereForBun = updateCamereForBun;
    window.editBun = editBun;
    window.deleteBun = deleteBun;
    window.renderQR = renderQR;
    window.filterQR = filterQR;
    window.printQR = printQR;
    window.renderFurnizori = renderFurnizori;
    window.filterFurnizori = filterFurnizori;
    window.saveFurnizor = saveFurnizor;
    window.editFurnizor = editFurnizor;
    window.deleteFurnizor = deleteFurnizor;

    // Acquisition Functions
    function renderAchizitii(data) {
        const items = data || DB.achizitii;
        const tbody = document.getElementById('achTable');
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="9">Nicio achiziție.</td></tr>';
            return;
        }
        tbody.innerHTML = items.map((a, idx) => {
            const f = DB.furnizori.find(x => x.id === a.furnId);
            const statusClass = a.status === 'Anulat' ? 'b-danger' : (a.status === 'Livrat' ? 'b-green' : 'b-orange');
            return `<tr>
          <td>${idx + 1}</td>
          <td><strong>${a.produs || '—'}</strong></td>
          <td>${f ? f.nume : (a.furnizorNume || '—')}</td>
          <td>${a.qty || 1}</td>
          <td>${(a.val || 0).toLocaleString('ro-RO')}</td>
          <td>${a.data || '—'}</td>
          <td><span class="badge ${statusClass}">${a.status || 'Comandat'}</span></td>
          <td>${a.aprobare === 'da' ? '✅' : '—'}</td>
          <td style="display:flex;gap:4px">
            <button class="btn btn-outline btn-sm" onclick="editAch(${a.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAch(${a.id})">🗑️</button>
          </td>
        </tr>`;
        }).join('');
    }

    function filterAchizitii(q) {
        const s = (q || '').toLowerCase();
        renderAchizitii(DB.achizitii.filter(a => (!s || a.nume.toLowerCase().includes(s))));
    }

    function openModalAch() {
        const sel = document.getElementById('achFurnizor');
        sel.innerHTML = '<option value="">— Alege furnizor —</option>' + DB.furnizori.map(f => `<option value="${f.id}">${f.nume}</option>`).join('');
        document.getElementById('achEditId').value = '';
        openModal('modalAchizitie');
    }

    function saveAchizitie() {
        if (window._isSaving) return;
        window._isSaving = true;
        setTimeout(() => window._isSaving = false, 1000);
        const id = document.getElementById('achEditId').value;
        const val = parseFloat(document.getElementById('achVal').value) || 0;
        const qty = parseFloat(document.getElementById('achQty').value) || 1;
        const a = {
            id: id ? parseInt(id) : Date.now(),
            nume: document.getElementById('achProdus').value,
            furnizorId: parseInt(document.getElementById('achFurn').value),
            data: document.getElementById('achData').value,
            val: val,
            qty: qty,
            total: val, // In the HTML, 'achVal' seems to be the total value field based on context
            status: document.getElementById('achStatus').value,
            aprobare: document.getElementById('achAprobare').value,
            note: document.getElementById('achNote').value
        };
        if (!a.nume) { toast('⚠️ Nume obligatoriu!'); return; }
        if (id) {
            const i = DB.achizitii.findIndex(x => x.id == id);
            DB.achizitii[i] = a;
            sbAutoSave('achizitii', a).then(toastSave);
        } else {
            DB.achizitii.push(a);
            sbAutoSave('achizitii', a).then(toastSave);
        }
        toast('✅ Achiziție salvată!');
        closeModal('modalAchizitie');
        renderAchizitii();
    }

    function editAch(id) {
        const a = DB.achizitii.find(x => x.id === id);
        const sel = document.getElementById('achFurn');
        sel.innerHTML = '<option value="">— Alege furnizor —</option>' + DB.furnizori.map(f => `<option value="${f.id}" ${f.id === a.furnId ? 'selected' : ''}>${f.nume}</option>`).join('');
        document.getElementById('achEditId').value = a.id;
        document.getElementById('achProdus').value = a.produs || '';
        document.getElementById('achData').value = a.data || '';
        document.getElementById('achVal').value = a.val || 0;
        document.getElementById('achQty').value = a.qty || 1;
        document.getElementById('achStatus').value = a.status || 'Comandat';
        document.getElementById('achAprobare').value = a.aprobare || 'nu';
        document.getElementById('achNote').value = a.note || '';
        openModal('modalAchizitie');
    }

    function deleteAch(id) {
        if (!confirm('Ștergi achiziția?')) return;
        DB.achizitii = DB.achizitii.filter(x => x.id !== id);
        toast('🗑️ Achiziție ștearsă!');
        renderAchizitii();
    }

    // Task Functions
    function renderTasks(data) {
        const items = data || DB.tasks || [];
        const tbody = document.getElementById('taskTable');
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="7">Nicio sarcină.</td></tr>';
            return;
        }
        tbody.innerHTML = items.sort((a,b)=> (b.id-a.id)).map(t => {
            const cld = DB.cladiri.find(x => x.id === t.cladireId);
            const cam = DB.camere.find(x => x.id === t.cameraId);
            const statusClass = t.status === 'FINALIZAT' ? 'b-green' : (t.prioritate === 'URGENT' ? 'b-danger' : 'b-orange');
            return `<tr>
          <td><strong>${t.titlu || t.title}</strong></td>
          <td><span class="badge b-gray">${t.prioritate || 'MEDIE'}</span></td>
          <td>${cld ? cld.cod : '—'} / ${cam ? cam.cod : '—'}</td>
          <td>${t.termen || '—'}</td>
          <td><span class="badge ${statusClass}">${t.status || 'NOU'}</span></td>
          <td>${t.alocat || '—'}</td>
          <td style="display:flex;gap:4px">
            ${t.status !== 'FINALIZAT' ? `<button class="btn btn-outline btn-sm" onclick="completeTask(${t.id})">✅</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">🗑️</button>
          </td>
        </tr>`;
        }).join('');
    }

    function filterTasks(q) {
        const s = (q || '').toLowerCase();
        renderTasks((DB.tasks || []).filter(t => (!s || (t.titlu || t.title || '').toLowerCase().includes(s))));
    }

    function openModalTask() {
        populateCladireSelects();
        document.getElementById('taskEditId').value = '';
        openModal('modalTask');
    }

    function saveTask() {
        if (window._isSaving) return;
        window._isSaving = true;
        setTimeout(() => window._isSaving = false, 1000);
        const id = document.getElementById('taskEditId').value;
        const t = {
            id: id ? parseInt(id) : Date.now(),
            titlu: document.getElementById('taskTitlu').value,
            prioritate: document.getElementById('taskPrioritate').value,
            cladireId: parseInt(document.getElementById('taskCladire').value),
            cameraId: parseInt(document.getElementById('taskCamera').value),
            termen: document.getElementById('taskTermen').value,
            alocat: document.getElementById('taskAlocat').value,
            status: 'NOU'
        };
        if (!t.titlu) { toast('⚠️ Titlu obligatoriu!'); return; }
        if (!DB.tasks) DB.tasks = [];
        if (id) {
            const i = DB.tasks.findIndex(x => x.id == id);
            DB.tasks[i] = { ...DB.tasks[i], ...t };
            sbAutoSave('tasks', DB.tasks[i]).then(toastSave);
        } else {
            DB.tasks.push(t);
            sbAutoSave('tasks', t).then(toastSave);
        }
        toast('✅ Sarcină salvată!');
        closeModal('modalTask');
        renderTasks();
    }

    function completeTask(id) {
        const t = DB.tasks.find(x => x.id === id);
        if (t) {
            t.status = 'FINALIZAT';
            sbAutoSave('tasks', t).then(toastSave);
            toast('✅ Sarcină finalizată!');
            renderTasks();
        }
    }

    function deleteTask(id) {
        if (!confirm('Ștergi sarcina?')) return;
        DB.tasks = DB.tasks.filter(x => x.id !== id);
        toast('🗑️ Sarcină ștearsă!');
        renderTasks();
    }

    // Export to window
    window.renderAchizitii = renderAchizitii;
    window.filterAchizitii = filterAchizitii;
    window.openModalAch = openModalAch;
    window.saveAchizitie = saveAchizitie;
    window.editAch = editAch;
    window.deleteAch = deleteAch;

    window.renderQR = renderQR;
    window.filterQR = filterQR;
    window.showQR = showQR;
    window.printQR = printQR;

    window.renderFurnizori = renderFurnizori;
    window.filterFurnizori = filterFurnizori;
    window.saveFurnizor = saveFurnizor;
    window.editFurnizor = editFurnizor;
    window.deleteFurnizor = deleteFurnizor;

    window.renderTasks = renderTasks;
    window.filterTasks = filterTasks;
    window.openModalTask = openModalTask;
    window.saveTask = saveTask;
    window.completeTask = completeTask;
    window.deleteTask = deleteTask;

})(window);
