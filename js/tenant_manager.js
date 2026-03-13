/**
 * Tenant Management Module - PatrimoNet
 * Handles Super Admin tenant operations, license management, and global reports.
 */

// State variables specific to this module
let currentWizStep = 1;

// --- TENANT CORE FUNCTIONS ---

window.editTenant = function(id) {
    const t = (DB.schools || []).find(x => x.id == id);
    if (!t) {
        toast('⚠️ Eroare: Tenantul ' + id + ' nu a fost găsit!');
        return;
    }

    document.getElementById('editTenantId').value = t.id;
    document.getElementById('editSchoolName').value = t.nume;
    document.getElementById('editSchoolCui').value = t.cui || '';
    document.getElementById('editSchoolCod').value = t.cod || '';
    document.getElementById('editAdminName').value = t.admin || '';
    document.getElementById('editLicType').value = t.licenta || 'STANDARD';
    document.getElementById('editActivStatus').value = t.active.toString();
    document.getElementById('editExpDate').value = t.expiry || '';

    openModal('modalEditTenant');
}

window.saveEditTenant = function() {
    const id = document.getElementById('editTenantId').value;
    const t = (DB.schools || []).find(x => x.id == id);
    if (!t)
        return;

    t.nume = document.getElementById('editSchoolName').value;
    t.cui = document.getElementById('editSchoolCui').value;
    t.admin = document.getElementById('editAdminName').value;
    t.licenta = document.getElementById('editLicType').value;
    t.active = document.getElementById('editActivStatus').value === 'true';
    t.expiry = document.getElementById('editExpDate').value;

    toast(`✅ Profilul ${t.cod} a fost actualizat!`);
    addIstoricEvent('setari', `Profil tenant editat: ${t.cod} (${t.licenta})`, currentUser);
    persistIstoric();
    closeModal('modalEditTenant');
    if (typeof sbAutoSave === 'function')
        sbAutoSave('schools', t).then( () => toast('💾 Modificările au fost salvate în Cloud.'));

    // PATCH 3: persist license changes locally without reload
    const idx = DB.schools.findIndex(s => s.id === t.id);
    if (idx !== -1) {
        DB.schools[idx] = t;
    }
}

window.switchToTenant = function(tenantId, tenantCode) {
    // suport apel cu obiect
    if (tenantId && typeof tenantId === "object") {
        tenantCode = tenantId.cod || tenantId.code;
        tenantId = tenantId.id;
    }

    tenantId = parseInt(tenantId);

    // fallback dacă codul lipsește
    if (!tenantCode) {
        const t = (DB.schools || []).find(s => s.id === tenantId);
        tenantCode = t ? (t.cod || t.code) : String(tenantId);
    }

    console.log("Switch tenant:", tenantId, tenantCode);

    localStorage.setItem("activeTenantId", tenantId);
    localStorage.setItem("activeTenantCode", tenantCode);

    // Re-apply context to window to ensure persistence on re-entry
    window.CURRENT_TENANT = tenantId;
    window.CURRENT_TENANT_CODE = tenantCode;

    location.reload();
}

window.activateTenant = function(tenantId) {
    console.log("Activating tenant:", tenantId);
    try {
        // store tenant id
        localStorage.setItem("active_tenant_id", tenantId);
        // ensure cache does not block reload
        sessionStorage.setItem("force_reload", "1");
        // reload application
        window.location.href = window.location.origin;
    } catch (e) {
        console.error("Tenant activation failed:", e);
    }
}

window.exportTenantData = function(id) {
    const t = (DB.schools || []).find(x => x.id === id);
    if (!t)
        return;

    const payload = {
        tenant: t,
        export_date: new Date().toISOString(),
        data: {
            cladiri: DB.cladiri.filter(c => c.school_id === id || (!c.school_id && id === 1)),
            camere: DB.camere.filter(c => c.school_id === id || (!c.school_id && id === 1)),
            inventar: DB.inventar,
            // Note: In demo, everything is ID 1 except if we filter by school_id
            personal: DB.personal.filter(p => p.school_id === id || (!p.school_id && id === 1)),
            istoric: istoricLog.filter(e => (e.descriere || '').includes(t.cod) || id === 1)
        }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)],{
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PatrimoNet_Export_${t.cod}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast('📦 Datele tenant-ului ' + t.cod + ' au fost exportate!');
    addIstoricEvent('audit', 'Export date tenant ' + t.cod, currentUser);
}

window.deleteTenant = function(id) {
    const t = (DB.schools || []).find(x => x.id === id);
    if (!t)
        return;

    if (!confirm('⚠️ ATENȚIE: Ștergerea unui tenant este o acțiune IREVERSIBILĂ!\nToate datele școlii vor fi șterse definitiv.\n\nAI EXPORTAT DATELE ÎNAINTE?\n\nScrie SHCOALA_' + t.id + ' pentru a confirma:'))
        return;

    const conf = prompt('Introdu codul de confirmare (SHCOALA_' + t.id + '):');
    if (conf !== 'SHCOALA_' + t.id) {
        toast('❌ Cod de confirmare incorect. Ștergere anulată.');
        return;
    }

    // Implement logic: filter out from persistent arrays
    const idx = (DB.schools || []).findIndex(x => x.id === id);
    if (idx !== -1)
        DB.schools.splice(idx, 1);

    toast('🗑️ Tenant ' + t.cod + ' a fost șters din sistem!');
    addIstoricEvent('setari', 'STERGERE DEFINITIVA TENANT ' + t.cod, currentUser);
    updateDashboard();
}

window.toggleTenantStatus = function(id) {
    const t = (DB.schools || []).find(x => x.id === id);
    if (!t)
        return;
    t.active = !t.active;
    toast(`✅ Status tenant ${t.cod} schimbat în: ${t.active ? 'Activ' : 'Inactiv'}`);
    addIstoricEvent('setari', `Status tenant ${t.cod} schimbat: ${t.active ? 'Activ' : 'Inactiv'}`, currentUser);
    persistIstoric();
    updateDashboard();
    if (document.getElementById('settingsSuperBlock').style.display !== 'none')
        renderLicenses();
}

// --- TENANT WIZARD ---

window.addNewTenant = function() {
    currentWizStep = 1;
    // Reset fields
    if (document.getElementById('wizSchoolName'))
        document.getElementById('wizSchoolName').value = '';
    if (document.getElementById('wizSchoolCui'))
        document.getElementById('wizSchoolCui').value = '';
    if (document.getElementById('wizSchoolCod'))
        document.getElementById('wizSchoolCod').value = '';
    if (document.getElementById('wizAdminPrenume'))
        document.getElementById('wizAdminPrenume').value = '';
    if (document.getElementById('wizAdminNume'))
        document.getElementById('wizAdminNume').value = '';
    if (document.getElementById('wizAdminEmail'))
        document.getElementById('wizAdminEmail').value = '';

    selectLicense('STANDARD');
    updateWizUI();
    openModal('modalNewTenant');
}

window.moveStep = function(n) {
    if (n === 1) {
        if (currentWizStep === 1) {
            if (!document.getElementById('wizSchoolName').value) {
                toast('⚠️ Introdu numele instituției!');
                return;
            }
            if (!document.getElementById('wizSchoolCod').value) {
                toast('⚠️ Introdu codul scurt!');
                return;
            }
        }
        if (currentWizStep === 2) {
            if (!document.getElementById('wizAdminEmail').value) {
                toast('⚠️ Introdu email-ul administratorului!');
                return;
            }
        }
    }

    currentWizStep += n;
    if (currentWizStep > 4) {
        createTenantFinal();
        return;
    }
    updateWizUI();
}

window.selectLicense = function(type) {
    document.getElementById('wizLicenseType').value = type;
    document.querySelectorAll('.license-card').forEach(c => c.classList.remove('selected'));
    if (type === 'FREE')
        document.getElementById('lic-free').classList.add('selected');
    if (type === 'STANDARD')
        document.getElementById('lic-standard').classList.add('selected');
    if (type === 'PREMIUM PLUS')
        document.getElementById('lic-premium').classList.add('selected');
}

window.updateWizUI = function() {
    for (let i = 1; i <= 4; i++) {
        const stepDiv = document.getElementById('wizStep' + i);
        const circle = document.getElementById('wstep-' + i);
        if (stepDiv)
            stepDiv.style.display = 'none';
        if (circle)
            circle.classList.remove('active', 'done');
    }

    const currentDiv = document.getElementById('wizStep' + currentWizStep);
    const currentCircle = document.getElementById('wstep-' + currentWizStep);
    if (currentDiv)
        currentDiv.style.display = 'block';
    if (currentCircle)
        currentCircle.classList.add('active');

    for (let i = 1; i < currentWizStep; i++) {
        const circle = document.getElementById('wstep-' + i);
        if (circle)
            circle.classList.add('done');
    }

    document.getElementById('btnWizPrev').style.visibility = (currentWizStep === 1) ? 'hidden' : 'visible';
    document.getElementById('btnWizNext').textContent = (currentWizStep === 4) ? 'Creează Instanță' : 'Continuă';

    if (currentWizStep === 4) {
        const name = document.getElementById('wizSchoolName').value;
        const cod = document.getElementById('wizSchoolCod').value;
        const email = document.getElementById('wizAdminEmail').value;
        const lic = document.getElementById('wizLicenseType').value;

        document.getElementById('wizReview').innerHTML = `
          <strong>Instituție:</strong> ${name} (${cod})<br>
          <strong>Administrator:</strong> ${email}<br>
          <strong>Licență selectată:</strong> <span style="color:var(--super-gold)">${lic}</span><br>
          <strong>Status inițial:</strong> Trial 30 zile
        `;
    }
}

window.createTenantFinal = function() {
    const name = document.getElementById('wizSchoolName').value;
    const cui = document.getElementById('wizSchoolCui').value;
    const cod = document.getElementById('wizSchoolCod').value;
    const admPrenume = document.getElementById('wizAdminPrenume').value;
    const admNume = document.getElementById('wizAdminNume').value;
    const admEmail = document.getElementById('wizAdminEmail').value;
    const admPass = document.getElementById('wizAdminPass').value;
    const lic = document.getElementById('wizLicenseType').value;

    const newId = (DB.schools || []).length + 1;
    const now = new Date();
    let expDate = new Date();
    if (lic === 'FREE')
        expDate.setDate(now.getDate() + 30);
    else
        expDate.setFullYear(now.getFullYear() + 1);
    const expStr = expDate.toLocaleDateString('ro-RO');

    const newTenant = {
        id: newId,
        nume: name,
        name: name,
        cod: cod,
        code: cod,
        admin: admPrenume + ' ' + admNume,
        admin_name: admPrenume + ' ' + admNume,
        cui: cui || ('RO' + (1000 + newId)),
        active: true,
        licenta: lic,
        expiry: expStr
    };

    if (!DB.schools)
        DB.schools = [];
    DB.schools.push(newTenant);

    // Salvare în Supabase
    sbAutoSave('schools', newTenant).then( () => {
        toast('✅ Tenant creat și salvat în Cloud!');
        closeModal('modalWizard');
        updateDashboard();
    }
    );

    closeModal('modalNewTenant');
    toast('🚀 Instanța ' + cod + ' a fost inițializată cu succes!');
    addIstoricEvent('setari', 'Wizard: Creat tenant nou ' + cod + ' cu licență ' + lic, currentUser);
    persistIstoric();
    updateDashboard();
}

// --- GLOBAL SETTINGS & REPORTS ---

window.saveGlobalSettings = function() {
    const name = document.getElementById('globalSysName').value;
    const tagline = document.getElementById('globalTagline').value;

    // Update UI title and tagline if logged in as super_admin
    if (document.querySelector('.brand-name'))
        document.querySelector('.brand-name').textContent = name;
    if (document.querySelector('.login-tagline span'))
        document.querySelector('.login-tagline span').textContent = name.split(' ')[0] + ',';

    addIstoricEvent('setari', 'Actualizare branding global: ' + name, currentUser);
    persistIstoric();
    toast('✅ Setări globale salvate!');
}

function formatExpiry(dateStr) {
    if (!dateStr) return "—";
    if (dateStr.includes(".")) return dateStr;
    const d = new Date(dateStr);
    return isNaN(d) ? "—" : d.toLocaleDateString("ro-RO");
}

window.renderLicenses = function() {
    const grid = document.getElementById('licensesGrid');
    if (!grid)
        return;

    grid.innerHTML = (DB.schools || []).slice().sort( (a, b) => a.id - b.id).map(t => {
        const lic = t.licenta || 'STANDARD';
        const isPremium = lic === 'PREMIUM PLUS';
        const isStandard = lic === 'STANDARD';
        const color = isPremium ? 'var(--super-gold)' : (isStandard ? 'var(--teal)' : 'var(--mist)');
        const bg = t.active ? (lic === 'FREE' ? 'b-yellow' : 'b-green') : 'b-gray';
        const statusLbl = t.active ? (lic === 'FREE' ? 'Trial' : 'Activ') : 'Inactiv';

        return `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding:10px;"><strong>${t.nume}</strong><br><small style="color:var(--mist)">${t.cui || ''}</small></td>
          <td style="padding:10px;">#${t.id}</td>
          <td style="padding:10px; color:${color}; font-weight:bold">${lic}</td>
          <td style="padding:10px;">${formatExpiry(t.expiry)}</td>
          <td style="padding:10px;"><span class="badge ${bg}" onclick="toggleTenantStatus(${t.id})" style="cursor:pointer">${statusLbl}</span></td>
          <td style="padding:10px;">
            <button class="btn btn-outline btn-sm" onclick="editTenant(${t.id})">⚙️</button>
            <button class="btn btn-primary btn-sm enter-tenant-btn" data-id="${t.id}" data-code="${t.cod}" onclick="switchToTenant(${t.id}, '${t.cod}')" ${(currentUser.rol !== 'super_admin' && currentUser.school_id === t.id) ? 'disabled' : ''}>👁️</button>
          </td>
        </tr>`;
    }
    ).join('');
}

window.genAuditGlobal = function(tip) {
    var now = new Date().toLocaleString('ro-RO');
    var userLabel = (currentUser ? currentUser.prenume + ' ' + currentUser.nume : 'Super Admin');
    var headerHtml = '<div style="text-align:center;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:12px">' + '<div style="font-size:11px;color:#666">PATRIMONET — PLATFORMA GLOBALA</div>' + '<h1 style="font-size:15px;margin:8px 0">RAPORT AUDIT GLOBAL</h1>' + '<div style="font-size:11px;color:#666">Generat: ' + now + ' | De: ' + userLabel + ' (Super Admin)</div>' + '</div>';
    var styleTag = '<style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px} h1{text-align:center} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:6px;text-align:left} th{background:#f5f5f5} tr:nth-child(even){background:#fafafa} .badge{padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}</style>';

    if (tip === 'auth') {
        var de = (document.getElementById('auditAuthDe') || {}).value || '';
        var pana = (document.getElementById('auditAuthPana') || {}).value || '';
        var authEvents = istoricLog.filter(function(e) {
            return e.tip === 'auth';
        });
        if (de)
            authEvents = authEvents.filter(function(e) {
                return (e.data || '') >= de;
            });
        if (pana)
            authEvents = authEvents.filter(function(e) {
                return (e.data || '') <= pana;
            });
        var rows = authEvents.map(function(e) {
            return '<tr><td>' + (e.timestamp || '-') + '</td><td>' + (e.user || '-') + '</td><td>' + (e.rol || '-') + '</td><td>' + (e.descriere || '-') + '</td></tr>';
        }).join('');
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Raport Autentificari</title>' + styleTag + '</head><body>' + headerHtml + '<h2 style="font-size:13px;margin-bottom:8px">Raport Autentificari' + (de || pana ? ' (' + (de || '...') + ' - ' + (pana || '...') + ')' : '') + '</h2>' + '<table><thead><tr><th>Data/Ora</th><th>Utilizator</th><th>Rol</th><th>Detalii</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" style="text-align:center;color:#999">Niciun eveniment de autentificare gasit.</td></tr>') + '</tbody></table>' + '<div style="margin-top:30px;text-align:right;font-size:11px;color:#999">Total: ' + authEvents.length + ' autentificari | PatrimoNet Global</div></body></html>';
        var win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        setTimeout(function() {
            win.print();
        }, 500);
        addIstoricEvent('audit', 'Raport autentificari generat (global)', currentUser);
        persistIstoric();
        toast('Raport autentificari generat!');
    } else if (tip === 'tenant') {
        var tenantFilter = (document.getElementById('auditTenantFilter') || {}).value || '';
        var allEvents = istoricLog.slice();
        if (tenantFilter) {
            allEvents = allEvents.filter(function(e) {
                return (e.descriere || '').indexOf('tenant ' + tenantFilter) !== -1 || (e.descriere || '').indexOf('Tenant ' + tenantFilter) !== -1 || (e.descriere || '').indexOf(tenantFilter === '1' ? 'CNVGA' : 'DEMO') !== -1;
            });
        }
        var rows2 = allEvents.map(function(e) {
            return '<tr><td>' + (e.timestamp || '-') + '</td><td>' + (e.tip || '-') + '</td><td>' + (e.descriere || '-') + '</td><td>' + (e.user || '-') + '</td><td>' + (e.rol || '-') + '</td></tr>';
        }).join('');
        var html2 = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Raport Inter-Tenant</title>' + styleTag + '</head><body>' + headerHtml + '<h2 style="font-size:13px;margin-bottom:8px">Raport Inter-Tenant' + (tenantFilter ? ' (Tenant ' + tenantFilter + ')' : ' (Toti tenantii)') + '</h2>' + '<table><thead><tr><th>Data/Ora</th><th>Tip</th><th>Descriere</th><th>Utilizator</th><th>Rol</th></tr></thead><tbody>' + (rows2 || '<tr><td colspan="5" style="text-align:center;color:#999">Niciun eveniment gasit.</td></tr>') + '</tbody></table>' + '<div style="margin-top:30px;text-align:right;font-size:11px;color:#999">Total: ' + allEvents.length + ' evenimente | PatrimoNet Global</div></body></html>';
        var win2 = window.open('', '_blank');
        win2.document.write(html2);
        win2.document.close();
        setTimeout(function() {
            win2.print();
        }, 500);
        addIstoricEvent('audit', 'Raport inter-tenant generat' + (tenantFilter ? ' (Tenant ' + tenantFilter + ')' : ''), currentUser);
        persistIstoric();
        toast('Raport inter-tenant generat!');
    } else if (tip === 'patrimoniu') {
        var totalCNVGA = DB.inventar.reduce(function(s, b) {
            return s + (parseFloat(b.val) || 0);
        }, 0);
        var bunuriCNVGA = DB.inventar.length;
        var html3 = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Patrimoniu Comparativ</title>' + styleTag + '</head><body>' + headerHtml + '<h2 style="font-size:13px;margin-bottom:8px">Raport Patrimoniu Comparativ per Scoala</h2>' + '<table><thead><tr><th>Scoala</th><th>Cod</th><th>Nr. Bunuri</th><th>Valoare Totala (RON)</th><th>Status</th></tr></thead><tbody>' + '<tr><td><strong>Colegiul National Vasile Goldis Arad</strong></td><td>CNVGA</td><td>' + bunuriCNVGA + '</td><td>' + totalCNVGA.toLocaleString('ro-RO') + '</td><td style="color:green">Activ</td></tr>' + '<tr><td>Scoala Generala Nr. 2 (Demo)</td><td>DEMO_2</td><td>0</td><td>0</td><td style="color:orange">Trial</td></tr>' + '<tr style="font-weight:700;background:#f0f0f0"><td colspan="2">TOTAL PLATFORMA</td><td>' + bunuriCNVGA + '</td><td>' + totalCNVGA.toLocaleString('ro-RO') + '</td><td>-</td></tr>' + '</tbody></table>' + '<div style="margin-top:30px;text-align:right;font-size:11px;color:#999">PatrimoNet Global | ' + now + '</div></body></html>';
        var win3 = window.open('', '_blank');
        win3.document.write(html3);
        win3.document.close();
        setTimeout(function() {
            win3.print();
        }, 500);
        addIstoricEvent('audit', 'Raport patrimoniu comparativ generat', currentUser);
        persistIstoric();
        toast('Raport patrimoniu comparativ generat!');
    } else if (tip === 'anomalii') {
        var deletions = istoricLog.filter(function(e) {
            return (e.descriere || '').toLowerCase().indexOf('sters') !== -1 || (e.descriere || '').toLowerCase().indexOf('stergere') !== -1;
        });
        var massActions = istoricLog.filter(function(e) {
            return (e.descriere || '').toLowerCase().indexOf('masa') !== -1 || (e.descriere || '').toLowerCase().indexOf('import') !== -1;
        });
        var superActions = istoricLog.filter(function(e) {
            return (e.rol || '').indexOf('Super Admin') !== -1 || (e.descriere || '').indexOf('Super Admin') !== -1;
        });
        var html4 = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Raport Anomalii</title>' + styleTag + '</head><body>' + headerHtml + '<h2 style="font-size:13px;margin-bottom:8px">Raport Anomalii si Securitate</h2>' + '<h3 style="font-size:12px;color:#c0392b;margin:16px 0 8px">Stergeri detectate (' + deletions.length + ')</h3>' + '<table><thead><tr><th>Data</th><th>Descriere</th><th>Utilizator</th><th>Rol</th></tr></thead><tbody>' + (deletions.length ? deletions.map(function(e) {
            return '<tr><td>' + (e.timestamp || '-') + '</td><td>' + (e.descriere || '-') + '</td><td>' + (e.user || '-') + '</td><td>' + (e.rol || '-') + '</td></tr>';
        }).join('') : '<tr><td colspan="4" style="color:green;text-align:center">Nicio stergere detectata</td></tr>') + '</tbody></table>' + '<h3 style="font-size:12px;color:#d97706;margin:16px 0 8px">Actiuni Super Admin (' + superActions.length + ')</h3>' + '<table><thead><tr><th>Data</th><th>Actiune</th><th>Utilizator</th></tr></thead><tbody>' + (superActions.length ? superActions.map(function(e) {
            return '<tr><td>' + (e.timestamp || '-') + '</td><td>' + (e.descriere || '-') + '</td><td>' + (e.user || '-') + '</td></tr>';
        }).join('') : '<tr><td colspan="3" style="text-align:center;color:#999">Nicio actiune Super Admin</td></tr>') + '</tbody></table>' + '<h3 style="font-size:12px;color:#1a6fa8;margin:16px 0 8px">Actiuni in masa / Import (' + massActions.length + ')</h3>' + '<table><thead><tr><th>Data</th><th>Descriere</th><th>Utilizator</th></tr></thead><tbody>' + (massActions.length ? massActions.map(function(e) {
            return '<tr><td>' + (e.timestamp || '-') + '</td><td>' + (e.descriere || '-') + '</td><td>' + (e.user || '-') + '</td></tr>';
        }).join('') : '<tr><td colspan="3" style="text-align:center;color:#999">Nicio actiune in masa</td></tr>') + '</tbody></table>' + '<div style="margin-top:30px;text-align:right;font-size:11px;color:#999">PatrimoNet Global | ' + now + '</div></body></html>';
        var win4 = window.open('', '_blank');
        win4.document.write(html4);
        win4.document.close();
        setTimeout(function() {
            win4.print();
        }, 500);
        addIstoricEvent('audit', 'Raport anomalii si securitate generat', currentUser);
        persistIstoric();
        toast('Raport anomalii generat!');
    }
}
