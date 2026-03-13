let importedData = [];
let importedHeaders = [];
let importedRawData = [];

function handleImportDrop(e) {
    e.preventDefault();
    document.getElementById('importDropArea').style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file)
        processImportFile(file);
}

function handleImportFile(input) {
    if (input.files && input.files[0])
        processImportFile(input.files[0]);
}

function processImportFile(file) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
        toast('⚠️ Selectează un fișier .xlsx, .xls sau .csv!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {
                type: 'array'
            });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert sheet to array of arrays, header is first row
            const json = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: ''
            });

            if (json.length < 2) {
                toast('❌ Fișierul nu conține suficiente date.');
                return;
            }

            // Găsește rândul cu headere (uneori exporturile FP3 au rânduri goale sus)
            let headerRowIdx = 0;
            for (let i = 0; i < Math.min(10, json.length); i++) {
                // Daca randul are cel putin 3 coloane completate, il consideram header
                const cols = json[i].filter(c => String(c).trim() !== '');
                if (cols.length >= 3) {
                    headerRowIdx = i;
                    break;
                }
            }

            importedHeaders = json[headerRowIdx].map(h => String(h).trim());
            importedRawData = json.slice(headerRowIdx + 1).filter(r => r.some(c => String(c).trim() !== ''));

            if (importedHeaders.length === 0) {
                toast('❌ Nu am putut detecta coloanele fișierului.');
                return;
            }

            showMappingModal();
        } catch (err) {
            console.error(err);
            toast('❌ Eroare la citirea fișierului Excel: ' + err.message);
        }
    }
    ;
    reader.readAsArrayBuffer(file);
}

function showMappingModal() {
    const fields = [{
        id: 'nume',
        label: 'Denumire bun (Obligatoriu)',
        required: true
    }, {
        id: 'nrinv',
        label: 'Nr. Inventar (Obligatoriu)',
        required: true
    }, {
        id: 'val',
        label: 'Valoare (Obligatoriu)',
        required: true
    }, {
        id: 'qty',
        label: 'Cantitate',
        required: false
    }, {
        id: 'data',
        label: 'Data PIF / Achiziție',
        required: false
    }, {
        id: 'cont',
        label: 'Cont contabil',
        required: false
    }];

    const tbody = document.getElementById('mapareTbody');
    let html = '';

    fields.forEach(f => {
        let opts = '<option value="">(Ignoră acest câmp)</option>';
        importedHeaders.forEach( (h, idx) => {
            // Auto-guess columns based on common names
            let hLow = h.toLowerCase();
            let selected = '';
            if (f.id === 'nume' && (hLow.includes('denumire') || hLow.includes('mijloc fix') || hLow.includes('bun')))
                selected = 'selected';
            if (f.id === 'nrinv' && (hLow.includes('nr. inv') || hLow.includes('cod') || hLow === 'nr.'))
                selected = 'selected';
            if (f.id === 'val' && (hLow.includes('valoare') || hLow.includes('pret') || hLow.includes('preț')))
                selected = 'selected';
            if (f.id === 'qty' && (hLow.includes('cantitat') || hLow.includes('stoc') || hLow.includes('buc')))
                selected = 'selected';
            if (f.id === 'data' && (hLow.includes('data') || hLow.includes('pif') || hLow.includes('achiziti')))
                selected = 'selected';
            if (f.id === 'cont' && (hLow.includes('cont')))
                selected = 'selected';
            opts += `<option value="${idx}" ${selected}>${h}</option>`;
        }
        );

        html += `<tr>
          <td style="padding:10px 0; font-weight:500;">
            ${f.label} ${f.required ? '<span style="color:var(--danger)">*</span>' : ''}
          </td>
          <td style="padding:10px 0;">
            <select id="map_${f.id}" class="input-field" style="width:100%">${opts}</select>
          </td>
        </tr>`;
    }
    );

    tbody.innerHTML = html;
    document.getElementById('mapareStatus').textContent = `Găsite ${importedRawData.length} rânduri de date.`;

    // Update locatii test
    const locOpt = DB.cladiri.find(c => c.cod === 'CLD-A') ? `<option value="clda">Clădirea A (Pentru testare)</option>` : '';
    document.getElementById('mapareLocatieImplicit').innerHTML = `
        <option value="neatribuit">📍 Fără locație (Neatribuit / De transferat)</option>
        ${locOpt}
      `;

    openModal('modalMapareImport');
}

async function executeSmartImport() {
    // Get mapped indices
    const map = {
        nume: document.getElementById('map_nume').value,
        nrinv: document.getElementById('map_nrinv').value,
        val: document.getElementById('map_val').value,
        qty: document.getElementById('map_qty').value,
        data: document.getElementById('map_data').value,
        cont: document.getElementById('map_cont').value
    };

    if (map.nume === '' || map.nrinv === '' || map.val === '') {
        toast('⚠️ Trebuie mapate obligatoriu Câmpurile: Denumire, Nr. Inventar și Valoare!');
        return;
    }

    const clLoc = document.getElementById('mapareLocatieImplicit').value;
    let targetCladireId = null;
    let targetCameraId = null;

    if (clLoc === 'clda') {
        const cldA = DB.cladiri.find(c => c.cod === 'CLD-A');
        if (cldA) {
            targetCladireId = cldA.id;
            const cam = DB.camere.find(c => c.cladireId === cldA.id);
            if (cam)
                targetCameraId = cam.id;
        }
    }

    toast('⏳ Importăm datele... Vă rugăm așteptați.');
    closeModal('modalMapareImport');
    document.getElementById('importFile').value = '';

    let importedCount = 0;
    let errors = 0;

    for (const row of importedRawData) {
        // Extract values using map indices
        const nume = map.nume !== '' ? String(row[map.nume] || '').trim() : '';
        const nrInv = map.nrinv !== '' ? String(row[map.nrinv] || '').trim() : '';
        let valRaw = map.val !== '' ? String(row[map.val] || '0').trim() : '0';
        let qtyRaw = map.qty !== '' ? String(row[map.qty] || '1').trim() : '1';
        let dataPif = map.data !== '' ? String(row[map.data] || '').trim() : new Date().toLocaleDateString('ro-RO');
        const cont = map.cont !== '' ? String(row[map.cont] || '').trim() : '';

        // Ignore rows that don't have basic required data
        if (!nume || !nrInv || nume.toLowerCase() === 'report' || nume.toLowerCase() === 'de reportat')
            continue;

        // Clean numbers
        valRaw = valRaw.replace(/[^0-9,\.]/g, '').replace(',', '.');
        qtyRaw = qtyRaw.replace(/[^0-9,\.]/g, '').replace(',', '.');

        const val = parseFloat(valRaw) || 0;
        const qty = parseInt(qtyRaw) || 1;

        // Standardize date to DD.MM.YYYY if it looks like Excel date
        if (!isNaN(dataPif) && dataPif > 1000) {
            // Excel serial date to JS Date
            const jsDate = new Date((dataPif - (25567 + 1)) * 86400 * 1000);
            dataPif = jsDate.toLocaleDateString('ro-RO');
        }

        const bun = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            nrInv: nrInv,
            nume: nume,
            cat: cont ? `Gest.Cont ${cont}` : 'Necategorizat',
            cladireId: targetCladireId,
            cameraId: targetCameraId,
            stare: 'Bun',
            val: val,
            qty: qty,
            dataPIF: dataPif,
            cont: cont,
            furnId: null,
            amortizare: 0,
            obs: 'Importat automat din Excel/CSV'
        };

        DB.inventar.unshift(bun);
        try {
            await sbAutoSave('inventar', bun);
            importedCount++;
        } catch (e) {
            console.error("Save error row", row, e);
            errors++;
        }
    }

    toast(`✅ Import finalizat! Adăugate: ${importedCount} bunuri.`);
    if (errors > 0)
        toast(`⚠️ Au apărut ${errors} erori la salvarea în baza de date.`);
    addIstoricEvent('import', `Import masiv gestiune: ${importedCount} bunuri dintr-un fișier.`, currentUser);

    updateDashboard();
}

function parseCSV(text) {
    if (!text)
        return [];
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length)
        return [];
    const sep = lines[0].includes(';') ? ';' : ',';
    return lines.map(line => {
        const parts = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"')
                inQuotes = !inQuotes;
            else if (char === sep && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else
                current += char;
        }
        parts.push(current.trim());
        return parts.map(v => v.replace(/^"(.*)"$/, '$1'));
    }
    );
}

function showDemoImport(filename) {
    // Demo: simulate Expert Bugetar export columns
    const demoRows = [['Nr.Inv', 'Denumire', 'Cont', 'Data PIF', 'Val.Intrare', 'Amortizare', 'Val.Ramasa', 'Durata', 'Gestiune'], ['1001', 'Tablă interactivă SMART 86"', '214', '01.09.2023', '7000.00', '1166.67', '5833.33', '5', 'Laborator Informatică'], ['1002', 'Laptop Dell Vostro 3520', '214', '10.01.2023', '3500.00', '583.33', '2916.67', '5', 'Laborator Informatică'], ['1003', 'Bancă elev bilocă', '214', '15.07.2021', '800.00', '320.00', '480.00', '10', 'Sala 101'], ['1004', 'Microscop optic Bresser', '214', '20.04.2022', '2300.00', '460.00', '1840.00', '10', 'Laborator Fizică'], ['1005', 'Scaun ergonomic birou', '214', '01.09.2019', '1200.00', '960.00', '240.00', '8', 'Birou Director'], ['1006', 'Aparat foto Canon EOS', '214', '01.09.2010', '2500.00', '2500.00', '0.00', '5', 'Secretariat'], ['2001', 'Saltele gimnastică 5cm', '303', '01.03.2022', '300.00', '120.00', '180.00', '5', 'Sală Sport'], ['2002', 'Masă cantină inox', '214', '01.06.2020', '500.00', '200.00', '300.00', '10', 'Cantină'], ];
    toast('📊 Fișier detectat: ' + filename + ' — previzualizare date demo Expert Bugetar');
    previewImport(demoRows);
}

function previewImport(rows) {
    const headers = rows[0];
    const dataRows = rows.slice(1).filter(r => r.some(c => c.trim()));
    importedData = dataRows;

    document.getElementById('importStats').innerHTML = `<span style="color:var(--teal)">✅ ${dataRows.length} bunuri detectate</span> · ${headers.length} coloane · Click "Importă" pentru a adăuga în inventar`;

    // Headers
    document.getElementById('importHead').innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '<th>Acțiune</th></tr>';

    // Body (first 10 rows)
    document.getElementById('importBody').innerHTML = dataRows.slice(0, 10).map( (r, i) => {
        const val = parseFloat((r[4] || '0').replace(',', '.')) || 0;
        const valR = parseFloat((r[6] || '0').replace(',', '.')) || 0;
        const casat = valR <= 0 ? '<span class="badge b-red">Casat?</span>' : '<span class="badge b-green">Activ</span>';
        return '<tr>' + r.map(c => `<td>${c}</td>`).join('') + `<td>${casat}</td></tr>`;
    }
    ).join('');
    if (dataRows.length > 10) {
        document.getElementById('importBody').innerHTML += `<tr><td colspan="${headers.length + 1}" style="text-align:center;color:var(--mist);font-size:12px">... și încă ${dataRows.length - 10} bunuri</td></tr>`;
    }

    document.getElementById('importCountBtn').textContent = dataRows.length;
    document.getElementById('importPreview').style.display = 'block';
}

function confirmImport() {
    if (!importedData.length)
        return;
    let imported = 0
      , casate = 0;

    importedData.forEach( (r, i) => {
        const nrInv = (r[0] || '').trim();
        const nume = (r[1] || '').trim();
        if (!nume)
            return;

        const valIntrare = parseFloat((r[4] || '0').replace(',', '.')) || 0;
        const valRamasa = parseFloat((r[6] || '0').replace(',', '.')) || 0;
        const cont = (r[2] || '').trim();
        const dataPIF = (r[3] || '').trim();
        const gestiune = (r[8] || r[7] || '').trim();
        const durata = (r[7] || '').trim();

        // Determină starea automată
        let stare = 'Funcțional';
        if (valRamasa <= 0 && valIntrare > 0) {
            stare = 'Casat';
            casate++;
        }

        // Determină categoria din cont
        let cat = 'Mobilier';
        if (cont.startsWith('214'))
            cat = 'Tehnologie IT';
        else if (cont.startsWith('213'))
            cat = 'Mobilier';
        else if (cont.startsWith('303'))
            cat = 'Echipament Sportiv';
        else if (cont.startsWith('302'))
            cat = 'Laborator';

        // Caută camera potrivită după gestiune
        let cameraId = null
          , cladireId = 1;
        if (gestiune) {
            const camGasita = DB.camere.find(c => c.nume.toLowerCase().includes(gestiune.toLowerCase()) || gestiune.toLowerCase().includes(c.cod.toLowerCase()));
            if (camGasita) {
                cameraId = camGasita.id;
                cladireId = camGasita.cladireId;
            }
        }

        // Evită duplicate după nr inventar
        if (DB.inventar.find(b => b.nrInv === ('EB-' + nrInv)))
            return;

        DB.inventar.push({
            id: Date.now() + i,
            nrInv: 'EB-' + nrInv,
            nume: nume,
            cat: cat,
            cladireId: cladireId || 1,
            cameraId: cameraId || null,
            qty: 1,
            val: valIntrare,
            valRamasa: valRamasa,
            cont: cont,
            dataPIF: dataPIF,
            durata: durata,
            gestiuneOriginala: gestiune,
            stare: stare,
            data: dataPIF,
            furnId: null,
            desc: `Import Expert Bugetar · Cont: ${cont} · Val. rămasă: ${valRamasa.toLocaleString('ro-RO')} RON`,
            sursa: 'import_eb'
        });
        imported++;
    }
    );

    toast(`✅ ${imported} bunuri importate! (${casate} marcate automat ca "Casat" — val. rămasă = 0)`);
    addActivity(`Import Expert Bugetar: ${imported} bunuri adăugate`, 'teal');
    cancelImport();
    updateDashboard();
    updateBadges();

    // Redirect to inventar
    setTimeout( () => {
        nav('inventar', document.querySelector('.nav-item:nth-of-type(7)'));
        toast('💡 Verifică bunurile importate și atribuie-le camerelor corecte!');
    }
    , 1500);
}

function cancelImport() {
    importedData = [];
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importFile').value = '';
}

function exportExpertBugetar() {
    const headers = ['Nr.Inventar', 'Denumire', 'Cont', 'Data PIF', 'Valoare Intrare', 'Amortizare', 'Valoare Ramasa', 'Durata', 'Gestiune Originala', 'Cladire', 'Camera', 'Etaj', 'Stare', 'Observatii'];
    const rows = DB.inventar.map(b => {
        const cld = DB.cladiri.find(x => x.id === b.cladireId);
        const cam = DB.camere.find(x => x.id === b.cameraId);
        return [b.nrInv, b.nume, b.cont || '', b.dataPIF || b.data || '', b.val || 0, b.val && b.valRamasa !== undefined ? (b.val - b.valRamasa) : '', b.valRamasa !== undefined ? b.valRamasa : b.val, b.durata || '', b.gestiuneOriginala || '', cld ? cld.cod + ' — ' + cld.nume : '', cam ? cam.cod + ' — ' + cam.nume : '', cam ? cam.etaj : '', b.stare, b.desc || ''].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';');
    }
    );

    const csv = '\uFEFF' + headers.map(h => '"' + h + '"').join(';') + '\n' + rows.join('\n');
    downloadFile(csv, 'gestiune_patrimoniu_' + getDateStr() + '.csv', 'text/csv;charset=utf-8');
    toast('✅ Export Excel generat!');
}

function exportRaportPDF(tip) {
    let titlu = ''
      , continut = '';
    const now = new Date();
    const dataStr = now.toLocaleDateString('ro-RO');
    const scName = currentUser?.school_name || 'Colegiul Național „Vasile Goldiș” Arad';
    const logoUrl = currentUser?.logo_url || '';

    if (tip === 'complet') {
        titlu = 'INVENTAR PATRIMONIU COMPLET';
        const pecladiri = DB.cladiri.map(cld => {
            const bunuri = DB.inventar.filter(b => b.cladireId === cld.id);
            if (!bunuri.length)
                return '';
            const valTotal = bunuri.reduce( (s, b) => s + b.val, 0);
            return `<h3 style="margin-top:20px;border-bottom:2px solid #333;padding-bottom:4px">${cld.cod} — ${cld.nume}</h3>
        <p style="font-size:12px;color:#666">${cld.adresa || ''}</p>
        <table border="1" cellpadding="4" cellspacing="0" style="width:100%;font-size:11px;border-collapse:collapse;margin-top:8px">
          <tr style="background:#f0f0f0"><th>Nr.Inv</th><th>Denumire</th><th>Cameră</th><th>Cantitate</th><th>Valoare</th><th>Stare</th></tr>
          ${bunuri.map(b => {
                const cam = DB.camere.find(x => x.id === b.cameraId);
                return `<tr><td>${b.nrInv}</td><td>${b.nume}</td><td>${cam ? cam.cod : 'Neatribuit'}</td><td style="text-align:center">${b.qty}</td><td style="text-align:right">${b.val.toLocaleString('ro-RO')} RON</td><td>${b.stare}</td></tr>`;
            }
            ).join('')}
          <tr style="background:#f9f9f9;font-weight:bold"><td colspan="4">TOTAL ${cld.cod}</td><td style="text-align:right">${valTotal.toLocaleString('ro-RO')} RON</td><td></td></tr>
        </table>`;
        }
        ).join('');
        continut = pecladiri;
    } else if (tip === 'ocupare') {
        titlu = 'RAPORT OCUPARE ȘI REZERVĂRI SĂLI';
        const perCamera = DB.camere.map(cam => {
            const rez = DB.rezervari.filter(r => r.cameraId === cam.id);
            const aprobate = rez.filter(r => r.status === 'Aprobată').length;
            const cld = DB.cladiri.find(x => x.id === cam.cladireId);
            return {
                cam,
                cld,
                total: rez.length,
                aprobate
            };
        }
        ).filter(x => x.total > 0);
        continut = `<table border="1" cellpadding="4" cellspacing="0" style="width:100%;font-size:11px;border-collapse:collapse">
      <tr style="background:#f0f0f0"><th>Sală / Cod</th><th>Clădire / Locație</th><th>Tip Spațiu</th><th>Total rezervări</th><th>Aprobate</th><th>Respinse/Pendinte</th></tr>
      ${perCamera.map(x => `<tr><td>${x.cam.cod} — ${x.cam.nume}</td><td>${x.cld ? x.cld.cod : '-'}</td><td>${x.cam.tip}</td><td style="text-align:center">${x.total}</td><td style="text-align:center;color:green">${x.aprobate}</td><td style="text-align:center;color:red">${x.total - x.aprobate}</td></tr>`).join('')}
    </table>`;
    } else if (tip === 'casare') {
        titlu = 'BUNURI PROPUSE PENTRU CASARE';
        const casate = DB.inventar.filter(b => b.stare === 'Casat');
        continut = `<table border="1" cellpadding="4" cellspacing="0" style="width:100%;font-size:11px;border-collapse:collapse">
      <tr style="background:#f0f0f0"><th>Nr.</th><th>Nr.Inv</th><th>Denumire</th><th>Data Achiziție</th><th>Valoare Intrare</th><th>Locație</th></tr>
      ${casate.map( (b, i) => {
            const cam = DB.camere.find(x => x.id === b.cameraId);
            const cld = DB.cladiri.find(x => x.id === b.cladireId);
            return `<tr><td>${i + 1}</td><td>${b.nrInv}</td><td>${b.nume}</td><td>${b.data || '-'}</td><td style="text-align:right">${b.val.toLocaleString('ro-RO')} RON</td><td>${cld ? cld.cod : '-'} / ${cam ? cam.cod : '-'}</td></tr>`;
        }
        ).join('')}
    </table>
    <div style="margin-top:50px;display:flex;justify-content:space-between;page-break-inside:avoid">
      <div style="text-align:center;width:30%"><div style="margin-bottom:60px;font-weight:bold">Administrator Patrimoniu</div><div>_______________________</div></div>
      <div style="text-align:center;width:30%"><div style="margin-bottom:60px;font-weight:bold">Contabil Șef</div><div>_______________________</div></div>
      <div style="text-align:center;width:30%"><div style="margin-bottom:60px;font-weight:bold">Director</div><div>_______________________</div></div>
    </div>`;
    } else if (tip === 'reparatii') {
        titlu = 'BUNURI DEFECTE / NECESITĂ REPARAȚII';
        const rep = DB.inventar.filter(b => b.stare === 'Necesită reparații' || b.stare === 'Defect');
        continut = `<table border="1" cellpadding="4" cellspacing="0" style="width:100%;font-size:11px;border-collapse:collapse">
      <tr style="background:#f0f0f0"><th>Nr.</th><th>Nr.Inv</th><th>Denumire</th><th>Locație</th><th>Valoare</th><th>Detalii Defecțiune</th></tr>
      ${rep.map( (b, i) => {
            const cam = DB.camere.find(x => x.id === b.cameraId);
            const cld = DB.cladiri.find(x => x.id === b.cladireId);
            return `<tr><td>${i + 1}</td><td>${b.nrInv}</td><td>${b.nume}</td><td>${cld ? cld.cod : '-'} / ${cam ? cam.cod : '-'}</td><td style="text-align:right">${b.val.toLocaleString('ro-RO')} RON</td><td>${b.desc || '-'}</td></tr>`;
        }
        ).join('')}
    </table>`;
    } else if (tip === 'camera') {
        titlu = 'INVENTAR PE CAMERE / CLĂDIRI';
        continut = DB.camere.map(cam => {
            const bunuri = DB.inventar.filter(b => b.cameraId === cam.id);
            if (!bunuri.length)
                return '';
            const cld = DB.cladiri.find(x => x.id === cam.cladireId);
            const val = bunuri.reduce( (s, b) => s + b.val, 0);
            return `<div style="page-break-inside:avoid;margin-bottom:30px">
        <h3 style="border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:8px">${cam.cod} — ${cam.nume} <span style="font-size:10px;color:#666;font-weight:normal">(${cld ? cld.cod : ''} · ${cam.etaj})</span></h3>
        <p style="font-size:10px;color:#666;margin-top:0">Responsabil: ${cam.resp}</p>
        <table border="1" cellpadding="3" cellspacing="0" style="width:100%;font-size:10px;border-collapse:collapse">
          <tr style="background:#f5f5f5"><th>Nr.Inv</th><th>Denumire</th><th>Cantitate</th><th>Valoare</th><th>Stare</th></tr>
          ${bunuri.map(b => `<tr><td>${b.nrInv}</td><td>${b.nume}</td><td style="text-align:center">${b.qty}</td><td style="text-align:right">${b.val.toLocaleString('ro-RO')} RON</td><td>${b.stare}</td></tr>`).join('')}
          <tr style="font-weight:bold;background:#fafafa"><td colspan="3">TOTAL ${cam.cod}</td><td style="text-align:right">${val.toLocaleString('ro-RO')} RON</td><td></td></tr>
        </table>
      </div>`;
        }
        ).join('');
    } else if (tip === 'achizitii') {
        titlu = 'REGISTRU ACHIZIȚII';
        continut = `<table border="1" cellpadding="4" cellspacing="0" style="width:100%;font-size:11px;border-collapse:collapse">
      <tr style="background:#f0f0f0"><th>Data</th><th>Produs / Serviciu</th><th>Furnizor</th><th>Cantitate</th><th>Valoare Totală</th><th>Status</th></tr>
      ${DB.achizitii.map(a => {
            const f = DB.furnizori.find(x => x.id === a.furnId);
            return `<tr><td>${a.data || '-'}</td><td>${a.produs}</td><td>${f ? f.nume : '-'}</td><td style="text-align:center">${a.qty}</td><td style="text-align:right">${a.val.toLocaleString('ro-RO')} RON</td><td>${a.status}</td></tr>`;
        }
        ).join('')}
      <tr style="font-weight:bold;background:#f9f9f9"><td colspan="4">TOTAL GENERAL</td><td style="text-align:right">${DB.achizitii.reduce( (s, a) => s + a.val, 0).toLocaleString('ro-RO')} RON</td><td></td></tr>
    </table>`;
    } else if (tip === 'mentenanta') {
        titlu = 'RAPORT ACTIVITĂȚI MENTENANȚĂ';
        continut = `<table border="1" cellpadding="4" cellspacing="0" style="width:100%;font-size:11px;border-collapse:collapse">
      <tr style="background:#f0f0f0"><th>Termen</th><th>Titlu Sarcină</th><th>Atribuit</th><th>Locație</th><th>Prioritate</th><th>Status</th></tr>
      ${DB.tasks.map(t => {
            const u = DB.personal.find(x => x.id === t.assignId);
            const cam = DB.camere.find(x => x.id === t.cameraId);
            return `<tr><td>${t.termen || '-'}</td><td>${t.titlu}</td><td>${u ? u.prenume + ' ' + u.nume : '-'}</td><td>${cam ? cam.cod : '-'}</td><td style="text-align:center">${t.prio}</td><td style="text-align:center">${t.status}</td></tr>`;
        }
        ).join('')}
    </table>`;
    } else if (tip === 'audit') {
        titlu = 'JURNAL AUDIT (ACTIVITATE SISTEM)';
        const auditData = (DB.istoric_log && DB.istoric_log.length) ? DB.istoric_log : [];
        continut = `<table border="1" cellpadding="4" cellspacing="0" style="width:100%;font-size:10px;border-collapse:collapse">
      <tr style="background:#f0f0f0"><th>Data / Ora</th><th>Utilizator</th><th>Acțiune</th><th>Detalii</th></tr>
      ${auditData.slice(0, 200).map(l => `<tr><td style="white-space:nowrap">${l.data}</td><td>${l.user}</td><td>${l.actiune}</td><td>${l.detalii}</td></tr>`).join('')}
    </table>
    <p style="font-size:10px;color:#666;margin-top:10px">* Se afișează ultimele 200 de înregistrări din jurnal.</p>`;
    }

    const valTot = DB.inventar.reduce( (s, b) => s + b.val, 0);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${titlu}</title>
    <style>
      body{font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:12px;padding:30px;color:#222;line-height:1.4}
      h1{font-size:18px;text-align:center;margin:10px 0;color:#1a1f2e;text-transform:uppercase;letter-spacing:1px}
      h3{font-size:13px;color:#1a6fa8;margin-bottom:5px}
      .header{display:flex;align-items:center;border-bottom:3px solid #1a1f2e;padding-bottom:15px;margin-bottom:20px}
      .header-logo{width:60px;height:60px;margin-right:20px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:8px;font-size:30px}
      .header-logo img{max-width:100%;max-height:100%;border-radius:4px}
      .header-info{flex:1}
      .header-school{font-weight:700;font-size:14px;color:#1a1f2e}
      .header-sub{font-size:11px;color:#666}
      .stats-bar{background:#f8fafc;padding:10px;border-radius:6px;margin-bottom:20px;display:flex;justify-content:space-between;font-size:11px;border:1px solid #e2e8f0}
      table{width:100%;border-collapse:collapse;margin-bottom:15px}
      th{background:#f1f5f9;color:#475569;font-weight:700;text-transform:uppercase;font-size:10px}
      td,th{padding:8px;border:1px solid #cbd5e1}
      tr:nth-child(even){background:#f8fafc}
      .footer{margin-top:40px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
      @media print{body{padding:0} .no-print{display:none} @page{margin:1.5cm}}
    </style>
    </head><body>
    <div class="header">
      <div class="header-logo">${logoUrl ? `<img src="${logoUrl}">` : '🏛️'}</div>
      <div class="header-info">
        <div class="header-school">${scName}</div>
        <div class="header-sub">Sistem Gestiune Patrimoniu · PatrimoNet Pro</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:bold;font-size:11px">${dataStr}</div>
        <div style="font-size:10px;color:#666">Cod Doc: PN-REP-${tip.toUpperCase()}</div>
      </div>
    </div>
    <h1>${titlu}</h1>
    <div class="stats-bar">
      <div><strong>Entitate:</strong> Beneficiar Licențiat</div>
      <div><strong>Bunuri în evidență:</strong> ${DB.inventar.length}</div>
      <div><strong>Valoare Totală:</strong> ${valTot.toLocaleString('ro-RO')} RON</div>
    </div>
    ${continut}
    <div class="footer">Document generat automat de platforma PatrimoNet. Conținutul reflectă situația bazei de date la data de ${dataStr} ora ${now.toLocaleTimeString('ro-RO')}.</div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 500); }</script>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    toast('📄 Raport generat cu succes!');
}

function exportMutariCSV() {
    const headers = ['Data', 'Bun Nr.Inv', 'Denumire', 'De la', 'La', 'Motiv', 'Solicitat de', 'Status', 'Aprobat de'];
    const rows = DB.mutari.map(m => {
        const b = DB.inventar.find(x => x.id === m.bunId);
        const user = DB.personal.find(x => x.id === m.userId);
        return [m.data, b ? b.nrInv : '', b ? b.nume : '', m.deCladire + '/' + m.deCamera, m.laCladire + '/' + m.laCamera, m.motiv, user ? user.prenume + ' ' + user.nume : '', m.status, m.aprobatDe || ''].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';');
    }
    );
    const csv = '\uFEFF' + headers.map(h => '"' + h + '"').join(';') + '\n' + rows.join('\n');
    downloadFile(csv, 'mutari_bunuri_' + getDateStr() + '.csv', 'text/csv;charset=utf-8');
    toast('✅ Export mutări generat!');
}

function getDateStr() {
    const d = new Date();
    return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content],{
        type
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Global exposure
window.handleImportDrop = handleImportDrop;
window.handleImportFile = handleImportFile;
window.processImportFile = processImportFile;
window.showMappingModal = showMappingModal;
window.executeSmartImport = executeSmartImport;
window.parseCSV = parseCSV;
window.showDemoImport = showDemoImport;
window.previewImport = previewImport;
window.confirmImport = confirmImport;
window.cancelImport = cancelImport;
window.exportExpertBugetar = exportExpertBugetar;
window.exportRaportPDF = exportRaportPDF;
window.exportMutariCSV = exportMutariCSV;
window.getDateStr = getDateStr;
window.downloadFile = downloadFile;
