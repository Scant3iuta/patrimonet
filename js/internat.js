/**
 * Internat & Cantina Module
 * Extracted from app_logic.js
 */

// Initializations
DB.prezenta = DB.prezenta || [];
DB.mese = DB.mese || [];
DB.probleme = DB.probleme || [];

function switchTabInternat(id, el) {
    ['int-prezenta', 'int-mese', 'int-probleme', 'int-raport'].forEach(d => {
        const el2 = document.getElementById(d);
        if (el2)
            el2.style.display = 'none';
    }
    );
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('#section-internat .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    if (id === 'int-prezenta')
        renderPrezenta();
    if (id === 'int-mese')
        renderMese();
    if (id === 'int-probleme')
        renderProbleme();
}

function savePrezenta() {
    if (window._isSaving)
        return;
    window._isSaving = true;
    setTimeout( () => window._isSaving = false, 1000);
    const data = document.getElementById('prezData').value;
    const nr = parseInt(document.getElementById('prezElevi').value);
    if (!data || isNaN(nr)) {
        toast('⚠️ Completează data și numărul de elevi!');
        return;
    }
    if (nr < 0) {
        toast('⚠️ Prezența nu poate fi negativă!', 'error');
        return;
    }
    const tipZi = document.getElementById('prezTipZi').value;
    const obs = document.getElementById('prezObs').value;
    // Update or insert
    const existing = DB.prezenta.find(p => p.data === data);
    let obj;
    if (existing) {
        existing.elevi = nr;
        existing.tipZi = tipZi;
        existing.obs = obs;
        existing.userId = currentUser.id;
        obj = existing;
    } else {
        obj = {
            id: Date.now(),
            data,
            elevi: nr,
            tipZi,
            obs,
            userId: currentUser.id,
            userName: currentUser.prenume + ' ' + currentUser.nume,
            creat: new Date().toLocaleString('ro-RO')
        };
        DB.prezenta.push(obj);
    }
    toast('✅ Prezența salvată!');
    sbAutoSave('prezenta', obj).then(toastSave);
    addIstoricEvent('internat', 'Prezență internat: ' + nr + ' elevi pe ' + data + ' (' + tipZi + ')', currentUser);
    updateIntStatBox();
    renderPrezenta();
    // Clear form
    document.getElementById('prezElevi').value = '';
    document.getElementById('prezObs').value = '';
}

function renderPrezenta() {
    const t = document.getElementById('prezentaTable');
    if (!DB.prezenta.length) {
        t.innerHTML = '<tr><td colspan="5"><div class="empty"><div class="empty-icon">👥</div><p>Nicio prezență înregistrată.</p></div></td></tr>';
        return;
    }
    const tipLabel = {
        saptamana: 'Zi lucrătoare',
        weekend: 'Weekend',
        vacanta: 'Vacanță'
    };
    t.innerHTML = DB.prezenta.sort( (a, b) => b.data.localeCompare(a.data)).map(p => {
        const user = DB.personal.find(x => x.id === p.userId);
        return `<tr><td>${p.data}</td><td>${tipLabel[p.tipZi] || p.tipZi}</td>
      <td style="font-weight:700;font-size:16px;color:var(--teal)">${p.elevi}</td>
      <td style="font-size:11px">${user ? user.prenume + ' ' + user.nume : '—'}</td>
      <td style="font-size:11px;color:var(--mist)">${p.obs || '—'}</td></tr>`;
    }
    ).join('');
    updateIntStatBox();
}

function updateIntStatBox() {
    const today = new Date().toISOString().split('T')[0];
    const azi = DB.prezenta.find(p => p.data === today);
    document.getElementById('statPrezAzi').textContent = azi ? azi.elevi : '—';
    const meseAzi = DB.mese.find(m => m.data === today);
    document.getElementById('statMeseAzi').textContent = meseAzi ? (meseAzi.micDejun + meseAzi.pranz + meseAzi.cina) : '—';
    document.getElementById('statProblemeOpen').textContent = DB.probleme.filter(p => p.status === 'Deschisă').length;
    // Weekend count - this week
    const weekendPrez = DB.prezenta.filter(p => p.tipZi === 'weekend');
    document.getElementById('statPrezWeekend').textContent = weekendPrez.length ? Math.round(weekendPrez.reduce( (s, p) => s + p.elevi, 0) / weekendPrez.length) + ' med.' : '—';
}

function saveMese() {
    if (window._isSaving)
        return;
    window._isSaving = true;
    setTimeout( () => window._isSaving = false, 1000);
    const data = document.getElementById('meseData').value;
    const md = parseInt(document.getElementById('meseMicDejun').value) || 0;
    const pr = parseInt(document.getElementById('mesePranz').value) || 0;
    const ci = parseInt(document.getElementById('meseCina').value) || 0;
    if (!data) {
        toast('⚠️ Selectează data!');
        return;
    }
    if (md < 0 || pr < 0 || ci < 0) {
        toast('⚠️ Numărul de porții nu poate fi negativ!', 'error');
        return;
    }
    const obs = document.getElementById('meseObs').value;
    const existing = DB.mese.find(m => m.data === data);
    let obj;
    if (existing) {
        existing.micDejun = md;
        existing.pranz = pr;
        existing.cina = ci;
        existing.obs = obs;
        existing.userId = currentUser.id;
        obj = existing;
    } else {
        obj = {
            id: Date.now(),
            data,
            micDejun: md,
            pranz: pr,
            cina: ci,
            obs,
            userId: currentUser.id,
            userName: currentUser.prenume + ' ' + currentUser.nume,
            creat: new Date().toLocaleString('ro-RO')
        };
        DB.mese.push(obj);
    }
    toast('✅ Mese salvate!');
    sbAutoSave('mese', obj).then(toastSave);
    addIstoricEvent('internat', 'Mese cantină: MicDejun=' + md + ' Prânz=' + pr + ' Cină=' + ci + ' pe ' + data, currentUser);
    updateMeseStat();
    renderMese();
    ['meseMicDejun', 'mesePranz', 'meseCina', 'meseObs'].forEach(id => {
        document.getElementById(id).value = '';
    }
    );
}

function renderMese() {
    const t = document.getElementById('meseTable');
    if (!DB.mese.length) {
        t.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">🍽️</div><p>Nicio înregistrare.</p></div></td></tr>';
        return;
    }
    t.innerHTML = DB.mese.sort( (a, b) => b.data.localeCompare(a.data)).map(m => {
        const user = DB.personal.find(x => x.id === m.userId);
        const total = m.micDejun + m.pranz + m.cina;
        return `<tr><td>${m.data}</td>
      <td style="text-align:center">${m.micDejun}</td>
      <td style="text-align:center">${m.pranz}</td>
      <td style="text-align:center">${m.cina}</td>
      <td style="text-align:center;font-weight:700">${total}</td>
      <td style="font-size:11px">${user ? user.prenume + ' ' + user.nume : '—'}</td></tr>`;
    }
    ).join('');
    updateMeseStat();
}

function updateMeseStat() {
    const now = new Date();
    const luna = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);
    const meseLuna = DB.mese.filter(m => m.data.startsWith(luna));
    document.getElementById('statMeseLunaMicDejun').textContent = meseLuna.reduce( (s, m) => s + m.micDejun, 0);
    document.getElementById('statMeseLunaPranz').textContent = meseLuna.reduce( (s, m) => s + m.pranz, 0);
    document.getElementById('statMeseLunaCina').textContent = meseLuna.reduce( (s, m) => s + m.cina, 0);
}

function exportMese() {
    const headers = ['Data', 'Mic dejun', 'Prânz', 'Cină', 'Total', 'Înregistrat de'];
    const rows = DB.mese.sort( (a, b) => a.data.localeCompare(b.data)).map(m => {
        const user = DB.personal.find(x => x.id === m.userId);
        return [m.data, m.micDejun, m.pranz, m.cina, m.micDejun + m.pranz + m.cina, user ? user.prenume + ' ' + user.nume : ''].map(v => '"' + v + '"').join(';');
    }
    );
    const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    downloadFile(csv, 'registru_mese_' + getDateStr() + '.csv', 'text/csv;charset=utf-8');
    toast('✅ Export mese generat!');
}

function openModalProblema() {
    document.getElementById('probDesc').value = '';
    document.getElementById('probLocatie').value = '';
    openModal('modalProblema');
}

function saveProblema() {
    if (window._isSaving)
        return;
    window._isSaving = true;
    setTimeout( () => window._isSaving = false, 1000);
    const tip = document.getElementById('probTip').value;
    const locatie = document.getElementById('probLocatie').value;
    const desc = document.getElementById('probDesc').value;
    const prio = document.getElementById('probPrio').value;
    if (!desc || !locatie) {
        toast('⚠️ Completează locația și descrierea!');
        return;
    }
    DB.probleme.push({
        id: Date.now(),
        tip,
        locatie,
        desc,
        prio,
        status: 'Deschisă',
        userId: currentUser.id,
        creat: new Date().toLocaleDateString('ro-RO'),
        creatTime: new Date().toLocaleString('ro-RO')
    });
    const newProblema = DB.probleme[DB.probleme.length - 1];
    sbAutoSave('probleme', newProblema).then( () => {}
    ).catch( () => {}
    );
    // Creează automat task de mentenanță din sesizare
    const autoTask = {
        id: Date.now() + 1,
        titlu: 'Sesizare: ' + newProblema.desc.substring(0, 50),
        prioritate: newProblema.prio || 'Medie',
        status: 'Deschisă',
        cameraId: null,
        bunId: null,
        assignId: null,
        userId: currentUser?.id,
        desc: newProblema.desc + ' (locație: ' + (newProblema.locatie || '—') + ')',
        termen: null,
        dinSesizare: true
    };
    DB.tasks = DB.tasks || [];
    DB.tasks.push(autoTask);
    sbAutoSave('tasks', autoTask).then( () => {}
    );
    toast('✅ Sesizare trimisă și task de mentenanță creat automat!');
    addNotification('Sesizare nouă internat', prio + ' · ' + tip + ' · ' + locatie, 'mentenanta', ['school_admin', 'mentenanta', 'super_admin']);
    addIstoricEvent('mentenanta', 'Sesizare internat: ' + tip + ' la ' + locatie + ' (' + prio + ')', currentUser);
    closeModal('modalProblema');
    renderProbleme();
    updateIntBadges();
}

function renderProbleme(data) {
    const status = document.getElementById('filterProbStatus')?.value || '';
    const tip = document.getElementById('filterProbTip')?.value || '';
    const items = (data || DB.probleme).filter(p => (!status || p.status === status) && (!tip || p.tip === tip));
    const list = document.getElementById('problemeList');
    if (!list)
        return;
    if (!items.length) {
        list.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-icon">✅</div><p>Nicio sesizare ' + status + '</p></div>';
        return;
    }
    const prioColors = {
        'Înaltă': 'var(--rose)',
        'Medie': 'var(--amber)',
        'Scăzută': 'var(--teal)'
    };
    const statusColors = {
        Deschisă: 'b-red',
        'În lucru': 'b-yellow',
        Rezolvată: 'b-green'
    };
    list.innerHTML = items.sort( (a, b) => {
        const p = {
            'Înaltă': 0,
            'Medie': 1,
            'Scăzută': 2
        };
        return (p[a.prio] || 1) - (p[b.prio] || 1);
    }
    ).map(p => {
        const user = DB.personal.find(x => x.id === p.userId);
        return `<div class="approval-card ${p.status === 'Rezolvată' ? 'approved' : p.status === 'În lucru' ? '' : ''}" style="margin:8px 16px;border-left:3px solid ${prioColors[p.prio] || 'var(--border)'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">🔧 ${p.tip} — <span style="color:${prioColors[p.prio]}">${p.prio}</span></div>
          <div style="font-size:12px;color:var(--slate);margin-top:3px">📍 ${p.locatie}</div>
          <div style="font-size:12px;margin-top:3px">${p.desc}</div>
          <div style="font-size:10px;color:var(--mist);margin-top:4px">Sesizat de: ${user ? user.prenume + ' ' + user.nume : ''} · ${p.creat}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;margin-left:12px">
          <span class="badge ${statusColors[p.status] || 'b-gray'}">${p.status}</span>
          ${['school_admin', 'mentenanta', 'super_admin'].includes(currentUser?.rol) && p.status !== 'Rezolvată' ? `<select style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid var(--border)" onchange="updateProblemaStatus(${p.id},this.value)">
              <option ${p.status === 'Deschisă' ? 'selected' : ''}>Deschisă</option>
              <option ${p.status === 'În lucru' ? 'selected' : ''}>În lucru</option>
              <option>Rezolvată</option>
            </select>` : ''}
        </div>
      </div>
    </div>`;
    }
    ).join('');
    updateIntBadges();
}

function updateProblemaStatus(id, status) {
    const p = DB.probleme.find(x => x.id === id);
    if (!p)
        return;
    p.status = status;
    p.rezolvatDe = status === 'Rezolvată' ? currentUser.prenume + ' ' + currentUser.nume : '';
    toast(status === 'Rezolvată' ? '✅ Problemă marcată rezolvată!' : '🔄 Status actualizat!');
    addIstoricEvent('mentenanta', 'Sesizare internat actualizată: ' + status + ' · ' + p.tip + ' la ' + p.locatie, currentUser);
    if (status === 'Rezolvată')
        addNotification('Problemă rezolvată', p.tip + ' la ' + p.locatie + ' a fost rezolvată', 'mentenanta', ['pedagog', 'school_admin']);
    renderProbleme();
}

function updateIntBadges() {
    const open = DB.probleme.filter(p => p.status === 'Deschisă').length;
    const badge = document.getElementById('intProblemeCount');
    if (badge) {
        badge.textContent = open;
        badge.style.display = open > 0 ? 'inline' : 'none';
    }
    if (document.getElementById('statProblemeOpen'))
        document.getElementById('statProblemeOpen').textContent = open;
}

function genRaportInternat() {
    const luna = document.getElementById('raportLuna').value;
    if (!luna) {
        toast('⚠️ Selectează luna!');
        return;
    }
    const [an,lu] = luna.split('-');
    const prezLuna = DB.prezenta.filter(p => p.data.startsWith(luna));
    const meseLuna = DB.mese.filter(m => m.data.startsWith(luna));
    const medPrez = prezLuna.length ? Math.round(prezLuna.reduce( (s, p) => s + p.elevi, 0) / prezLuna.length) : 0;
    const lunaLabel = new Date(luna + '-01').toLocaleDateString('ro-RO', {
        month: 'long',
        year: 'numeric'
    });
    const totalMicD = meseLuna.reduce( (s, m) => s + m.micDejun, 0);
    const totalPranz = meseLuna.reduce( (s, m) => s + m.pranz, 0);
    const totalCina = meseLuna.reduce( (s, m) => s + m.cina, 0);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Raport Internat ${lunaLabel}</title>
  <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px} h1{font-size:15px;text-align:center} h2{font-size:13px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:20px} table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #ddd;padding:5px;text-align:left} th{background:#f5f5f5} .stat{display:inline-block;margin:8px;padding:10px 20px;border:1px solid #ddd;border-radius:6px;text-align:center} .stat-val{font-size:22px;font-weight:bold;color:#0d7c6b}</style>
  </head><body>
  <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px">
    <div style="font-size:11px;color:#666">COLEGIUL NAȚIONAL „VASILE GOLDIȘ" ARAD — INTERNAT & CANTINĂ</div>
    <h1>RAPORT LUNAR — ${lunaLabel.toUpperCase()}</h1>
    <div style="font-size:11px;color:#666">Generat: ${new Date().toLocaleString('ro-RO')}</div>
  </div>
  <h2>📊 Sumar prezență internat</h2>
  <div>
    <div class="stat"><div class="stat-val">${prezLuna.length}</div><div>Zile înregistrate</div></div>
    <div class="stat"><div class="stat-val">${medPrez}</div><div>Medie zilnică elevi</div></div>
    <div class="stat"><div class="stat-val">${prezLuna.filter(p => p.tipZi === 'weekend').length}</div><div>Zile weekend</div></div>
  </div>
  <h2>🍽️ Sumar mese cantină</h2>
  <div>
    <div class="stat"><div class="stat-val">${totalMicD}</div><div>Mic dejun total</div></div>
    <div class="stat"><div class="stat-val">${totalPranz}</div><div>Prânz total</div></div>
    <div class="stat"><div class="stat-val">${totalCina}</div><div>Cină total</div></div>
    <div class="stat"><div class="stat-val">${totalMicD + totalPranz + totalCina}</div><div>Total mese</div></div>
  </div>
  <h2>📋 Registru prezență zilnică</h2>
  <table><thead><tr><th>Data</th><th>Tip zi</th><th>Elevi prezenți</th><th>Observații</th></tr></thead>
  <tbody>${prezLuna.sort( (a, b) => a.data.localeCompare(b.data)).map(p => `<tr><td>${p.data}</td><td>${p.tipZi}</td><td style="font-weight:bold;text-align:center">${p.elevi}</td><td>${p.obs || ''}</td></tr>`).join('')}</tbody></table>
  <h2>🔧 Sesizări probleme luna aceasta</h2>
  <table><thead><tr><th>Tip</th><th>Locație</th><th>Prioritate</th><th>Status</th><th>Sesizat de</th></tr></thead>
  <tbody>${DB.probleme.slice(0, 10).map(p => {
        const u = DB.personal.find(x => x.id === p.userId);
        return `<tr><td>${p.tip}</td><td>${p.locatie}</td><td>${p.prio}</td><td>${p.status}</td><td>${u ? u.prenume + ' ' + u.nume : ''}</td></tr>`;
    }
    ).join('')}</tbody></table>
  <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px">
    <div style="text-align:center"><div style="margin-bottom:30px">Pedagog internat</div><div>_______________________</div></div>
    <div style="text-align:center"><div style="margin-bottom:30px">Administrator patrimoniu</div><div>Oance Carmen Mihaela</div><div>_______________________</div></div>
    <div style="text-align:center"><div style="margin-bottom:30px">Director</div><div>Ioja Petronela Angela</div><div>_______________________</div></div>
  </div>
</body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout( () => win.print(), 500);
    toast('📄 Raport internat generat!');
}

// Global exposure
window.switchTabInternat = switchTabInternat;
window.savePrezenta = savePrezenta;
window.renderPrezenta = renderPrezenta;
window.updateIntStatBox = updateIntStatBox;
window.saveMese = saveMese;
window.renderMese = renderMese;
window.updateMeseStat = updateMeseStat;
window.exportMese = exportMese;
window.openModalProblema = openModalProblema;
window.saveProblema = saveProblema;
window.renderProbleme = renderProbleme;
window.updateProblemaStatus = updateProblemaStatus;
window.updateIntBadges = updateIntBadges;
window.genRaportInternat = genRaportInternat;
