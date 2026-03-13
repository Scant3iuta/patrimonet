// ===== AI LOGIC =====// ===== AI LOGIC =====

// ASISTENT AI
function renderAIAsistent() {
  const box = document.getElementById('aiChatMessages');
  if (!box || box.children.length > 1) return;
}

async function sendAiMessage() {
  const inp = document.getElementById('aiChatInput');
  const box = document.getElementById('aiChatMessages');
  if (!inp || !box) return;
  const text = inp.value.trim();
  if (!text) return;

  // Add user message
  box.innerHTML += `<div class="ai-msg user">${text}</div>`;
  inp.value = '';
  box.scrollTop = box.scrollHeight;

  // Simulate bot thinking
  const thinkingId = 'bot-thinking-' + Date.now();
  box.innerHTML += `<div class="ai-msg bot" id="${thinkingId}">...</div>`;
  box.scrollTop = box.scrollHeight;

  setTimeout(() => {
    const reply = processAiQuery(text);
    const el = document.getElementById(thinkingId);
    if (el) el.innerHTML = reply;
    box.scrollTop = box.scrollHeight;
  }, 800);
}

window.sendAiMessage = sendAiMessage;

function aiQuickQuery(text) {
  const inp = document.getElementById('aiChatInput');
  if (inp) {
    inp.value = text;
    sendAiMessage();
  }
}
window.aiQuickQuery = aiQuickQuery;

function processAiQuery(q) {
  const query = q.toLowerCase();

  // 1. Valoare totală inventar
  if (query.includes('valoare') && query.includes('inventar')) {
    const total = DB.inventar.reduce((s, b) => s + (b.val || 0), 0);
    return `Valoarea totală a inventarului înregistrat în sistem este de <strong>${total.toLocaleString('ro-RO')} RON</strong>. Aceasta cuprinde ${DB.inventar.length} bunuri în ${DB.cladiri.length} clădiri.`;
  }

  // 2. Bunuri defecte / reparații
  if (query.includes('reparații') || query.includes('defecte')) {
    const defecte = DB.inventar.filter(b => b.stare === 'Necesită reparații' || b.stare === 'Degradat');
    if (defecte.length === 0) return "Momentan nu am identificat bunuri marcate cu stare 'Necesită reparații' în baza de date.";
    return `Am găsit ${defecte.length} bunuri care necesită atenție: <br><ul style="margin-left:20px;margin-top:5px">` +
      defecte.slice(0, 5).map(b => `<li><strong>${b.nume}</strong> (${b.nrInv}) - ${b.stare}</li>`).join('') +
      (defecte.length > 5 ? '<li>...și altele.</li>' : '') + '</ul>';
  }

  // 3. Clădiri / Săli
  if (query.includes('corpul a') || query.includes('cladirea a')) {
    const cld = DB.cladiri.find(c => c.cod === 'CLD-A');
    const camere = DB.camere.filter(c => c.cladireId === cld?.id);
    const sali = camere.filter(c => c.tip && c.tip.toLowerCase().includes('sal') && c.tip.toLowerCase().includes('clas'));
    return `În <strong>Corpul A</strong> (${cld?.nume || 'Clădire principală'}) sunt înregistrate ${camere.length} spații, dintre care ${sali.length} sunt săli de clasă.`;
  }

  // 4. Achiziții recente
  if (query.includes('achiziții') || query.includes('cumparat')) {
    const ach = DB.achizitii.slice(0, 3);
    return `Ultimele achiziții înregistrate sunt: <br><ul style="margin-left:20px;margin-top:5px">` +
      ach.map(a => `<li>${a.produs} - ${a.val.toLocaleString('ro-RO')} RON (${a.data})</li>`).join('') + '</ul>';
  }

  // 5. Salut / General
  if (query.includes('salut') || query.includes('bună')) {
    return "Salut! Sunt gata să te ajut cu analize de patrimoniu. Întreabă-mă ceva despre inventar sau clădiri.";
  }

  return "Interesantă întrebare! Momentan baza mea de date îmi permite să răspund la întrebări despre: valoarea inventarului, bunuri defecte, structura clădirilor și achiziții recente. Poți încerca una din sugestiile rapide din dreapta.";
}

function calculateAiTrends() {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // 1. Valoare inventar per an (Trend achiziții)
  const yearlyStats = {};
  DB.inventar.forEach(b => {
    if (!b.dataPIF) return;
    const year = new Date(b.dataPIF).getFullYear();
    yearlyStats[year] = (yearlyStats[year] || 0) + (parseFloat(b.val) || 0);
  });

  // 2. Predicție buget: Bunuri care fac 10 ani anul viitor (necesită înlocuire)
  const toReplaceNextYear = DB.inventar.filter(b => {
    if (!b.dataPIF) return false;
    const ageNextYear = nextYear - new Date(b.dataPIF).getFullYear();
    return ageNextYear >= 10 && b.stare !== 'Casat';
  });

  const estimatedBudget = toReplaceNextYear.reduce((s, b) => s + (parseFloat(b.val) || 0), 0) * 1.2; // +20% inflație/upgrade

  return {
    yearlyStats,
    nextYear,
    toReplaceCount: toReplaceNextYear.length,
    budget: estimatedBudget
  };
}

// PROPUNERI AI
function renderAIPropuneri() {
  const grid = document.getElementById('aiPropuneriGrid');
  if (!grid) return;

  const trends = calculateAiTrends();
  const propuneri = [];

  // 1. Analiză predictivă buget
  if (trends.toReplaceCount > 0) {
    propuneri.push({
      titlu: `Predicție Buget ${trends.nextYear}`,
      desc: `AI estimează necesarul de <strong>${trends.budget.toLocaleString('ro-RO')} RON</strong> pentru înlocuirea a ${trends.toReplaceCount} bunuri care ating limita de exploatare (10 ani) anul viitor.`,
      cta: "Descarcă Prognoză PDF",
      cls: 'urgenta',
      icon: '💰',
      action: "toast('Generare prognoză detaliată în curs...')"
    });
  }

  // 2. Analiză casare (bunuri vechi)
  const vechi = DB.inventar.filter(b => b.data && new Date().getFullYear() - new Date(b.data).getFullYear() > 10 && b.stare !== 'Casat');
  if (vechi.length > 0) {
    propuneri.push({
      titlu: "Optimizare Casare",
      desc: `Există ${vechi.length} bunuri cu durata de viață depășită. Casarea acestora eliberează gestiunea și reduce riscul de inventar scriptic ireal.`,
      cta: "Vezi bunurile",
      cls: 'optimizare',
      icon: '♻️',
      action: "nav('inventar')"
    });
  }

  // 3. Analiză reparații
  const defecte = DB.inventar.filter(b => b.stare === 'Necesită reparații');
  if (defecte.length > 0) {
    propuneri.push({
      titlu: "Mentenanță Inteligentă",
      desc: `${defecte.length} bunuri raportate defecte. AI poate crea automat tichete de reparație pentru personalul tehnic alocat.`,
      cta: "Alocă Task-uri",
      cls: '',
      icon: '🛠️',
      action: "generateAiTasks()"
    });
  }

  grid.innerHTML = propuneri.map(p => `
        <div class="stat-card ${p.cls} propunere-card">
          <div style="font-size:24px; margin-bottom:10px">${p.icon}</div>
          <div class="stat-label" style="font-weight:700; color:var(--ink)">${p.titlu}</div>
          <p style="font-size:12px; color:var(--mist); margin:10px 0">${p.desc}</p>
          <button class="btn btn-primary btn-sm" onclick="${p.action}">${p.cta}</button>
        </div>
      `).join('');
}
window.renderAIPropuneri = renderAIPropuneri;

// TO-DO AI
let aiTasks = [
  { id: 101, title: "Inventariere anuală Corp B", date: "2026-03-20", done: false, type: "Obligatoriu" },
  { id: 102, title: "Verificare extinctoare Corp A", date: "2026-03-15", done: true, type: "Siguranță" },
  { id: 103, title: "Audit consumabile curățenie", date: "2026-04-01", done: false, type: "Optimizare" }
];

function renderAIToDo() {
  const list = document.getElementById('aiTodoList');
  const countEl = document.getElementById('aiTodoCount');
  if (!list) return;

  if (countEl) countEl.textContent = aiTasks.filter(t => !t.done).length;

  list.innerHTML = aiTasks.map(t => `
        <div class="todo-item">
          <div class="todo-check ${t.done ? 'done' : ''}" onclick="toggleAiTodo(${t.id})"></div>
          <div class="todo-content">
            <div class="todo-title" style="${t.done ? 'text-decoration:line-through; color:var(--mist)' : ''}">${t.title}</div>
            <div class="todo-meta">📅 ${t.date} • ${t.type}</div>
          </div>
          <div class="badge ${t.type === 'Siguranță' ? 'b-red' : t.type === 'Obligatoriu' ? 'b-yellow' : 'b-green'}">${t.type}</div>
        </div>
      `).join('');
}
window.renderAIToDo = renderAIToDo;

function toggleAiTodo(id) {
  const t = aiTasks.find(x => x.id === id);
  if (t) t.done = !t.done;
  renderAIToDo();
  toast("Task actualizat!");
}
window.toggleAiTodo = toggleAiTodo;

function generateAiTasks() {
  toast("✨ AI analizează datele...");
  setTimeout(() => {
    const randBun = DB.inventar[Math.floor(Math.random() * DB.inventar.length)];
    aiTasks.push({
      id: Date.now(),
      title: "Verificare stare " + (randBun?.nume || "bun inventar"),
      date: new Date().toISOString().split('T')[0],
      done: false,
      type: "Optimizare"
    });
    renderAIToDo();
    toast("✅ Task-uri noi generate conform stării actuale!");
  }, 1500);
}
window.generateAiTasks = generateAiTasks;

// ===== PATRIMOBOT DEVELOPER (AI) LOGIC =====

let aiReportChart = null;

function renderAIBuilderReports() {
  // Inițializare interfață;
}

function generateAiBuilderReport() {
  const input = document.getElementById('aiBuilderReportInput');
  const val = input.value.trim();
  if (!val) return;

  const messages = document.getElementById('aiBuilderReportsMessages');
  messages.innerHTML += `
        <div class="ai-msg user">
          <div class="ai-bubble">${val}</div>
          <div class="user-avatar" style="width:30px;height:30px;font-size:12px;display:flex;align-items:center;justify-content:center;background:var(--sky);">Tu</div>
        </div>
      `;
  input.value = '';

  const thinkingId = 'think-r-' + Date.now();
  messages.innerHTML += `
        <div class="ai-msg bot" id="${thinkingId}">
          <div class="bot-avatar" style="animation: pulse 1s infinite;">🤖</div>
          <div class="ai-bubble">Analizez datele și construiesc raportul dinamic...</div>
        </div>
      `;
  messages.scrollTop = messages.scrollHeight;

  setTimeout(() => {
    const el = document.getElementById(thinkingId);
    if (el) el.remove();

    messages.innerHTML += `
          <div class="ai-msg bot">
            <div class="bot-avatar">🤖</div>
            <div class="ai-bubble">Graficul a fost generat și este redat mai jos. Puteți acum să îl aprobați pentru administratori.</div>
          </div>
        `;
    messages.scrollTop = messages.scrollHeight;

    const container = document.getElementById('aiReportCanvasContainer');
    container.style.display = 'block';

    let labels = [];
    let data = [];

    if (val.toLowerCase().includes('achizi')) {
      labels = ['Nov 2025', 'Dec 2025', 'Ian 2026', 'Feb 2026', 'Mar 2026'];
      data = [12000, 15000, 8000, 22000, 18500];
    } else {
      labels = DB.cladiri.slice(0, 4).map(c => c.nume.split(' ')[0] + ' ' + (c.nume.split(' ')[1] || ''));
      data = labels.map(() => Math.floor(Math.random() * 40000) + 15000);
    }

    if (aiReportChart) aiReportChart.destroy();
    const ctx = document.getElementById('aiReportCanvas').getContext('2d');
    aiReportChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Valoare (RON)',
          data: data,
          backgroundColor: 'rgba(56, 189, 248, 0.5)',
          borderColor: '#38bdf8',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } },
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } }
        },
        plugins: { legend: { display: false } },
        maintainAspectRatio: false
      }
    });
  }, 1500);
}
window.generateAiBuilderReport = generateAiBuilderReport;

function approveAiReport() {
  alert("✅ Raportul a fost aprobat! Acesta va fi disponibil în secțiunea \"Rapoarte\" a tenanților asociați.");
}
window.approveAiReport = approveAiReport;

// --- SCHEMA BUILDER ---
function renderAIBuilderSchema() { }

function generateAiBuilderSchema() {
  const input = document.getElementById('aiBuilderSchemaInput');
  const val = input.value.trim();
  if (!val) return;

  const messages = document.getElementById('aiBuilderSchemaMessages');
  messages.innerHTML += `
        <div class="ai-msg user">
          <div class="ai-bubble">${val}</div>
          <div class="user-avatar" style="width:30px;height:30px;font-size:12px;display:flex;align-items:center;justify-content:center;background:var(--sky);">Tu</div>
        </div>
      `;
  input.value = '';

  const thinkingId = 'think-s-' + Date.now();
  messages.innerHTML += `
        <div class="ai-msg bot" id="${thinkingId}">
          <div class="bot-avatar" style="animation: pulse 1s infinite;">🤖</div>
          <div class="ai-bubble">Reconstruiesc vizual formularele și generez schema JSON pentru baza de date...</div>
        </div>
      `;
  messages.scrollTop = messages.scrollHeight;

  setTimeout(() => {
    const el = document.getElementById(thinkingId);
    if (el) el.remove();

    messages.innerHTML += `
          <div class="ai-msg bot">
            <div class="bot-avatar">🤖</div>
            <div class="ai-bubble">Modificarea este gata pentru previzualizare! Am construit UI-ul formularului aferent. Dacă totul arată bine, poți aplica modificarea la toți tenanții.</div>
          </div>
        `;
    messages.scrollTop = messages.scrollHeight;

    preview.innerHTML = `
          <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-weight: 600; margin-bottom: 20px; font-size: 14px; display:flex; align-items:center; gap:8px;">
              <span>📝 Formular: Adăugare Achiziție/Inventar</span>
            </div>
            <div class="form-row">
              <label>Denumire Bun *</label>
              <input type="text" class="input-field" value="Echipament IT (Demo)" disabled style="width:100%; padding:10px; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:var(--mist);">
            </div>
            <div class="form-row" style="margin-top:10px;">
              <label>Cont Contabil *</label>
              <input type="number" class="input-field" value="214" disabled style="width:100%; padding:10px; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:var(--mist);">
            </div>
            <div class="form-row" style="background: rgba(234, 179, 8, 0.05); border: 1px dashed var(--gold); border-radius: 8px; padding: 15px; margin-top: 15px; position:relative;">
              <div style="position:absolute; top:-10px; right:15px; background:var(--gold); color:#000; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">CÂMP NOU (AI)</div>
              <label style="color: var(--gold); margin-bottom: 8px; display:block; font-weight:600;">Sursă Finanțare *</label>
              <select class="input-field" style="width:100%; border-color: rgba(234, 179, 8, 0.4); background: rgba(0,0,0,0.2); padding:10px; border-radius:6px; color:white;">
                <option value="">Alege sursa...</option>
                <option value="buget_local">Buget Local</option>
                <option value="pnrr">Fonduri PNRR</option>
                <option value="venit_propriu">Venituri Proprii</option>
              </select>
            </div>
          </div>
        `;

    document.getElementById('deployAiSchemaBtn').style.display = 'inline-block';
  }, 2000);
}
window.generateAiBuilderSchema = generateAiBuilderSchema;

function deployAiSchema() {
  alert("✅ Modificare aplicată (Deploy)! Formularele tuturor tenanților au fost actualizate instant cu noul câmp 'Sursă Finanțare'.");
  document.getElementById('deployAiSchemaBtn').style.display = 'none';
  document.getElementById('aiSchemaPreviewArea').innerHTML = '<div style="text-align:center; padding: 40px; color: var(--teal);">🚀 Schema bazei de date a fost extinsă cu succes. Meniurile sunt actualizate.</div>';
}
window.deployAiSchema = deployAiSchema;

// --- AUDITOR AI ---
function renderAIBuilderAudit(force = false) {
  const tbody = document.getElementById('aiBuilderAuditTable');
  if (!force && tbody.children.length > 2) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; font-style:italic; color:var(--mist);">⏳ AI-ul scanează log-urile de sistem. Vă rugăm așteptați...</td></tr>';

  setTimeout(() => {
    const risks = [
      { level: 'CRITIC', color: 'var(--rose)', action: 'Export Date', details: 'Adminul "S2_Demo" a exportat inventarul la 03:14 AM.', sugestion: 'Adaugă filtru pe ora de export: doar între 07:00 - 20:00.', btn: 'Blochează acces noapte' },
      { level: 'MEDIU', color: 'var(--amber)', action: 'Autentificare repetată', details: '"profesor_cnvga" cu 7 logări eșuate în 60 secunde.', sugestion: 'Activează Lockout pentru 15 minute la contul vizat.', btn: 'Activează Lockout API' },
      { level: 'INFO', color: '#38bdf8', action: 'Performanță Căutare', details: 'Filtrarea după "Cameră" are o latență +300ms.', sugestion: 'AI-ul poate crea un index compus automat pe `cladire_idx` și `camera_idx`.', btn: 'Optimizare Indecși (DB)' }
    ];
    tbody.innerHTML = risks.map((r, i) => `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
            <td style="color: ${r.color}; font-weight: 700;">${r.level}</td>
            <td style="font-weight: 600;">${r.action}</td>
            <td style="color: var(--mist); font-size: 13px;">${r.details}</td>
            <td style="color: var(--teal); font-size: 13px;">💡 ${r.sugestion}</td>
            <td><button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 5px 10px; border-color: ${r.color}; color: ${r.color};" onclick="alert('Acțiunea (${r.btn}) a fost executată de asistentul de sistem!')">${r.btn}</button></td>
          </tr>
        `).join('');
  }, 2000);
}
window.renderAIBuilderAudit = renderAIBuilderAudit;

// ==========================================
// EXPORT FUNCTIONS (CSV & JSON)
// ==========================================

function downloadFile(content, fileName, mimeType) {
  const a = document.createElement('a');
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  a.setAttribute('href', url);
  a.setAttribute('download', fileName);
  a.click();
  URL.revokeObjectURL(url);
}

function exportExpertBugetar(tip) {
  if (!DB.inventar || DB.inventar.length === 0) {
    toast("Nu există bunuri pentru export!", "error");
    return;
  }

  let dataToExport = DB.inventar;
  if (tip === 'cladire') {
    const cladireSelect = document.getElementById('expCladireSelect');
    const cid = cladireSelect ? cladireSelect.value : null;
    if (!cid) { toast("Nu ai selectat nicio clădire!", "error"); return; }
    dataToExport = DB.inventar.filter(b => String(b.cladireId) === String(cid));
  }

  // Headers pentru Expert Bugetar
  let csv = "Nr. Inv.,Denumire Bun,Categorie,Locatie(Cladire),Stare,Valoare(RON),Data PIF,Furnizor,Cont\n";

  dataToExport.forEach(b => {
    const cladireNume = DB.cladiri?.find(c => c.id == b.cladireId)?.nume || 'Neatribuit';
    const vals = [
      b.nrInv || '-',
      `"${(b.nume || '').replace(/"/g, '""')}"`,
      `"${b.cat || '-'}"`,
      `"${cladireNume}"`,
      b.stare || 'Bun',
      b.val || 0,
      b.dataPIF || '-',
      b.furnId ? `"${DB.furnizori?.find(f => f.id == b.furnId)?.nume || ''}"` : '-',
      b.cont || '-'
    ];
    csv += vals.join(',') + "\n";
  });

  downloadFile('\uFEFF' + csv, `patrimonet_inventar_${tip}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  toast("Export Inventar generat cu succes!");
  logAudit('EXPORT', 'inventar', null, `Export CSV Inventar (${tip})`);
}
window.exportExpertBugetar = exportExpertBugetar;

function exportMutariCSV() {
  if (!DB.mutari || DB.mutari.length === 0) { toast("Nu există mutări de exportat!", "error"); return; }
  let csv = "ID,Data,Bun (Nr. Inv),Cladire/Camera De La,Cladire/Camera La,Motiv,Status,Aprobat De\n";
  DB.mutari.forEach(m => {
    const bunInfo = DB.inventar?.find(b => b.id == m.bunId);
    const numeBun = bunInfo ? `${bunInfo.nume} (${bunInfo.nrInv})` : 'Bun Șters';
    const vals = [
      m.id || '-',
      m.data || '-',
      `"${numeBun.replace(/"/g, '""')}"`,
      `"${m.deCladire} / ${m.deCamera}"`.replace(/"/g, '""'),
      `"${m.laCladire} / ${m.laCamera}"`.replace(/"/g, '""'),
      `"${(m.motiv || '').replace(/"/g, '""')}"`,
      `"${m.status || ''}"`,
      `"${m.aprobatDe || ''}"`
    ];
    csv += vals.join(',') + "\n";
  });
  downloadFile('\uFEFF' + csv, `patrimonet_mutari_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  toast("Export Mutări generat cu succes!");
  logAudit('EXPORT', 'mutari', null, `Export CSV Registru Mutări`);
}
window.exportMutariCSV = exportMutariCSV;

function exportMese() {
  if (!DB.mese || DB.mese.length === 0) { toast("Nu există înregistrări mese de exportat!", "error"); return; }
  let csv = "Data,Mic Dejun (portii),Pranz (portii),Cina (portii),Observatii\n";
  DB.mese.forEach(m => {
    const vals = [
      m.data || '-', m.micDejun || 0, m.pranz || 0, m.cina || 0, `"${(m.obs || '').replace(/"/g, '""')}"`
    ];
    csv += vals.join(',') + "\n";
  });
  downloadFile('\uFEFF' + csv, `patrimonet_mese_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  toast("Export Mese generat cu succes!");
  logAudit('EXPORT', 'mese', null, `Export CSV Registru Mese/Internat`);
}
window.exportMese = exportMese;

function exportFullBackup() {
  const backupData = {
    meta: {
      timestamp: new Date().toISOString(),
      user: currentUser?.email,
      school_id: currentUser?.school_id,
      app_version: "2.0"
    },
    data: DB
  };
  const jsonStr = JSON.stringify(backupData, null, 2);
  downloadFile(jsonStr, `patrimonet_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  toast("Full Backup generat cu succes!");
  logAudit('EXPORT', 'toate', null, `Export Full DB Backup JSON`);
}
window.exportFullBackup = exportFullBackup;

async function exportAuditTrail() {
  if (!SUPABASE_ENABLED) { toast("Baza de date online nu este configurată!", "error"); return; }
  toast("🚀 Preluare date audit din Supabase...");
  try {
    const { data, error } = await sbClient.from('audit_trail').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) { toast("Nu s-au găsit loguri de audit."); return; }

    let csv = "ID,Data/Ora,Utilizator (Nume),Rol,ID Scoala,Actiune,Tip Entitate,ID Entitate,Detalii\n";
    data.forEach(r => {
      const vals = [
        r.id,
        r.created_at,
        `"${(r.user_name || '').replace(/"/g, '""')}"`,
        r.user_rol || '',
        r.school_id || '',
        r.action || '',
        r.entity_type || '',
        r.entity_id || '',
        `"${(r.details || '').replace(/"/g, '""')}"`
      ];
      csv += vals.join(',') + "\n";
    });

    downloadFile('\uFEFF' + csv, `patrimonet_audit_log_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    toast("Export Audit descărcat cu succes!");
    logAudit('EXPORT', 'audit_trail', null, `Descarcare CSV Audit Trail`);
  } catch (err) {
    console.error(err);
    toast("Eroare la descărcarea auditului", "error");
  }
}
window.exportAuditTrail = exportAuditTrail;

