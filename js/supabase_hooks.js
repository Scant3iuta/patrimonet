

// ===== SUPABASE CONFIG =====// ===== SUPABASE CONFIG =====
// Înlocuiește cu valorile tale din Supabase Dashboard → Settings → API (sau folosește .env)
const SUPABASE_URL = window.ENV_SUPABASE_URL || 'https://pztgawexnbuuwygidppm.supabase.co';
const SUPABASE_ANON_KEY = window.ENV_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dGdhd2V4bmJ1dXd5Z2lkcHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODg5MzAsImV4cCI6MjA4NzM2NDkzMH0.tLW1Fwg3KFnwa9IOA9DunLuSrIrUvQkxCArsr4PeRoI';

let sbClient = null;
let SUPABASE_ENABLED = false;

function initSupabase() {
  // Păstrăm referința la biblioteca originală
  if (!window.supabaseLib) window.supabaseLib = window.supabase;

  // Dacă biblioteca nu e încărcată, mai încercăm peste 500ms
  if (!window.supabaseLib || typeof window.supabaseLib.createClient !== 'function') {
    console.log('⌛ Supabase lib nu e gata, reîncerc...');
    setTimeout(initSupabase, 500);
    return;
  }

  try {
    if (!sbClient) {
      sbClient = window.supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.sbInstance = sbClient;
    }

    SUPABASE_ENABLED = true;
    console.log('✅ Supabase conectat la patrimonet!');
    const badge = document.getElementById('sbStatusBadge');
    if (badge) { badge.textContent = '✅ Conectat'; badge.className = 'badge b-green'; }
  } catch (e) {
    console.error('Supabase init failed:', e);
    SUPABASE_ENABLED = false;
  }
}

// Asigurăm pre-inițializare rapidă pentru doLogin() înainte de _loadData 
// care apelează initSupabase de obicei mult mai târziu.
initSupabase();

// ===== SYNC HELPERS =====
// Generic fetch all rows from a table
async function sbFetch(table) {
  if (!SUPABASE_ENABLED) return null;

  let query = sbClient.from(table).select('*');
  if (typeof CURRENT_TENANT !== 'undefined' && CURRENT_TENANT) {
    // Only filter tables that likely have school_id
    const globalTables = ['schools'];
    if (!globalTables.includes(table)) {
      query = query.eq('school_id', CURRENT_TENANT);
    }
  }

  const { data, error } = await query;
  if (error) { console.error('Supabase fetch error:', table, error); return null; }
  return data;
}

// Generic insert
async function sbInsert(table, row) {
  if (!SUPABASE_ENABLED) return null;
  const { data, error } = await sbClient.from(table).insert(row).select().single();
  if (error) { console.error('Supabase insert error:', table, error); return null; }
  return data;
}

// Generic update
async function sbUpdate(table, id, updates) {
  if (!SUPABASE_ENABLED) return null;
  const { data, error } = await sbClient.from(table).update(updates).eq('id', id).select().single();
  if (error) { console.error('Supabase update error:', table, error); return null; }
  return data;
}

// Generic delete
async function sbDelete(table, id, fromSync = false) {
  if (!SUPABASE_ENABLED) return null;

  if (!navigator.onLine && !fromSync) {
    addToSyncQueue('delete', table, {}, false, id);
    return true;
  }

  const { error } = await sbClient.from(table).delete().eq('id', id);
  if (error) { console.error('Supabase delete error:', table, error); return null; }
  // Audit trail — log delete
  logAudit('DELETE', table, id, `Ștergere ${table} #${id}`);
  return true;
}
// ===== ERROR LOGGING (METHOD 2) =====
window.onerror = function (msg, url, line, col, error) {
  if (typeof sbInsert === 'function' && SUPABASE_ENABLED) {
    sbInsert('istoric_log', {
      tip: 'error',
      descriere: `JS Error: ${msg} | ${url} | L${line}:C${col}`,
      user_name: currentUser ? (currentUser.prenume + ' ' + currentUser.nume) : 'Sistem',
      user_rol: currentUser ? currentUser.rol : '—',
      school_id: currentUser?.school_id || null
    });
  }
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  if (typeof sbInsert === 'function' && SUPABASE_ENABLED) {
    sbInsert('istoric_log', {
      tip: 'error',
      descriere: 'Unhandled Rejection: ' + (event.reason ? (event.reason.message || event.reason) : 'Unknown'),
      user_name: currentUser ? (currentUser.prenume + ' ' + currentUser.nume) : 'Sistem',
      user_rol: currentUser ? currentUser.rol : '—',
      school_id: currentUser?.school_id || null
    });
  }
});

// ===== CENTRALIZED MAPPING LAYER =====
const SB_MAP = {
  cladiri: {
    toDb: { cod: 'cod', nume: 'nume', adresa: 'adresa', etaje: 'etaje', an: 'an_constructie', supUtila: 'suprafata', supDesfasurata: 'suprafata_desfasurata', stare: 'stare_generala', codSiiir: 'cod_siiir', tipAcoperis: 'tip_acoperis', tipIncalzire: 'tip_incalzire', supraveghere: 'supraveghere', grupuriSanitare: 'grupuri_sanitare', stareReabilitare: 'stare_reabilitare', anReabilitare: 'an_reabilitare', regimInaltime: 'regim_inaltime', tipStructura: 'tip_structura', note: 'observatii' },
    fromDb: { cod: 'cod', nume: 'nume', adresa: 'adresa', etaje: 'etaje', an_constructie: 'an', suprafata: 'supUtila', suprafata_desfasurata: 'supDesfasurata', stare_generala: 'stare', cod_siiir: 'codSiiir', tip_acoperis: 'tipAcoperis', tip_incalzire: 'tipIncalzire', supraveghere: 'supraveghere', grupuri_sanitare: 'grupuriSanitare', stare_reabilitare: 'stareReabilitare', an_reabilitare: 'anReabilitare', regim_inaltime: 'regimInaltime', tip_structura: 'tipStructura', observatii: 'note' }
  },
  camere: {
    toDb: { cladireId: 'cladire_id', cod: 'cod', nume: 'nume', tip: 'tip', etaj: 'etaj', sup: 'suprafata', resp: 'responsabil', cap: 'capacitate' },
    fromDb: { cladire_id: 'cladireId', cod: 'cod', nume: 'nume', tip: 'tip', etaj: 'etaj', suprafata: 'sup', responsabil: 'resp', capacitate: 'cap' }
  },
  inventar: {
    toDb: {
      nrInv: 'nr_inv',
      nume: 'nume',
      cat: 'cat',
      cant: 'cant',
      val: 'val',
      desc: 'obs',
      obs: 'obs',
      stare: 'stare',
      cladireId: 'cladire_id',
      cameraId: 'camera_id',
      dataPIF: 'data_pif',
      furnId: 'furnizor_id',
      cont: 'cont',
      durata: 'durata',
      amortizare: 'amortizare',
      school_id: 'school_id',
      locatii: 'locatii',
    },
    fromDb: {
      nr_inv: 'nrInv',
      nume: 'nume',
      cat: 'cat',
      cant: 'cant',
      val: 'val',
      obs: 'desc',
      stare: 'stare',
      cladire_id: 'cladireId',
      camera_id: 'cameraId',
      data_pif: 'dataPIF',
      furnizor_id: 'furnId',
      cont: 'cont',
      durata: 'durata',
      amortizare: 'amortizare',
      school_id: 'school_id',
      locatii: 'locatii',
    },
  },
  achizitii: {
    toDb: { produs: 'descriere', descriere: 'descriere', furnId: 'furnizor_id', qty: 'cantitate', val: 'val', data: 'data_doc', dataDoc: 'data_doc', status: 'status', aprobare: 'aprobare_necesara', note: 'note', userId: 'user_id', nrDoc: 'nr_doc', tipDoc: 'tip_doc' },
    fromDb: { descriere: 'produs', furnizor_id: 'furnId', cantitate: 'qty', val: 'val', data_doc: 'data', status: 'status', aprobare_necesara: 'aprobare', note: 'note', user_id: 'userId', nr_doc: 'nrDoc', tip_doc: 'tipDoc' }
  },
  personal: {
    toDb: { prenume: 'prenume', nume: 'nume', email: 'email', parola: 'parola', rol: 'rol', tel: 'tel', functie: 'functie', categorie: 'categorie' },
    fromDb: { prenume: 'prenume', nume: 'nume', email: 'email', parola: 'parola', rol: 'rol', tel: 'tel', functie: 'functie', categorie: 'categorie' }
  },
  tasks: {
    toDb: { titlu: 'titlu', title: 'titlu', prioritate: 'prioritate', prio: 'prioritate', status: 'status', cameraId: 'camera_id', bunId: 'bun_id', assignId: 'assign_id', assignIds: 'assign_ids', desc: 'description', description: 'description', termen: 'termen' },
    fromDb: { titlu: 'titlu', prioritate: 'prioritate', status: 'status', camera_id: 'cameraId', bun_id: 'bunId', assign_id: 'assignId', assign_ids: 'assignIds', description: 'desc', termen: 'termen' }
  }
};

function sbMapToDb(table, obj) {
  const map = SB_MAP[table]?.toDb;
  if (!map) return obj;
  const row = {};
  for (const [uiKey, dbCol] of Object.entries(map)) {
    if (obj[uiKey] !== undefined) row[dbCol] = obj[uiKey];
  }
  return row;
}

function sbMapFromDb(table, row) {
  const map = SB_MAP[table]?.fromDb;
  if (!map) return row;
  const obj = { _loaded: true, id: row.id };
  for (const [dbCol, uiKey] of Object.entries(map)) {
    if (row[dbCol] !== undefined) obj[uiKey] = row[dbCol];
  }
  return obj;
}

/**
 * Convertește un obiect local în rând de bază de date folosind harta SB_MAP.
 * Include automat school_id dacă este disponibil în context.
 */
function toSb(table, obj) {
  if (!obj) return null;
  const map = SB_MAP[table]?.toDb;
  const row = {};

  if (map) {
    for (const [localKey, dbKey] of Object.entries(map)) {
      if (obj[localKey] !== undefined) {
        let val = obj[localKey];
        // Conversii speciale
        if (dbKey.includes('data') || dbKey.includes('termen')) {
          val = (typeof globalThis.toISODate === 'function')
            ? globalThis.toISODate(val)
            : (val ? new Date(val).toISOString().split('T')[0] : null);
        }
        if (dbKey === 'assign_ids' && Array.isArray(val)) val = JSON.stringify(val);
        if (dbKey === 'locatii' && Array.isArray(val)) val = val;
        row[dbKey] = val;
      }
    }
  } else {
    // Fallback pentru tabele neraportate
    Object.assign(row, obj);
  }

  // Ensure school_id for multi-tenancy
  row.school_id = obj.school_id || currentUser?.school_id || null;
  return row;
}

/**
 * Convertește un rând de bază de date într-un obiect local.
 */
function fromSb(table, row) {
  if (!row) return null;
  const map = SB_MAP[table]?.fromDb;
  const obj = { _loaded: true, _sbId: row.id, id: parseInt(row.id) };

  if (map) {
    for (const [dbKey, localKey] of Object.entries(map)) {
      if (row[dbKey] !== undefined) {
        let val = row[dbKey];
        // Conversii speciale inversate
        if (dbKey === 'assign_ids' && typeof val === 'string') {
          try { val = JSON.parse(val); } catch (e) { val = []; }
        }
        if (dbKey === 'locatii') {
          val = (() => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
              try { return JSON.parse(val); } catch { return []; }
            }
            return [];
          })();
        }
        if (dbKey === 'id' || dbKey.includes('_id')) val = val ? parseInt(val) : null;
        if (dbKey === 'val' || dbKey === 'amortizare' || dbKey === 'suprafata') val = parseFloat(val) || 0;

        obj[localKey] = val;
      }
    }
    // Câmpuri speciale redundante pentru compatibilitate UI
    if (table === 'inventar') obj.data = row.data_pif;
    if (table === 'achizitii') obj.dataDoc = row.data_doc;
  } else {
    Object.assign(obj, row);
  }

  return obj;
}

// Backward compatibility for old-style calls: toSb.table(obj)
Object.keys(SB_MAP).forEach(table => {
  toSb[table] = (obj) => toSb(table, obj);
  fromSb[table] = (row) => fromSb(table, row);
});

// ===== LOAD ALL DATA FROM SUPABASE =====
let _supabaseLoaded = false;

async function loadFromSupabase() {
  if (!SUPABASE_ENABLED || !sbClient) return;
  if (_supabaseLoaded) { console.log('Supabase already loaded this session'); return; }

  // RESTORE ACTIVE TENANT FROM STORAGE
  const activeTenant = localStorage.getItem("active_tenant_id");
  if (activeTenant) {
    window.CURRENT_TENANT = parseInt(activeTenant);
    console.log("Active tenant restored:", CURRENT_TENANT);
  }

  const isSuperAdmin = currentUser?.rol === 'super_admin';

  // Super Admin loads only platform-level tables — never tenant data
  const SUPER_ADMIN_TABLES  = ['schools', 'personal'];
  const TENANT_TABLES       = ['cladiri', 'camere', 'inventar', 'furnizori', 'achizitii', 'personal', 'mutari', 'rezervari', 'tasks', 'prezenta', 'mese', 'probleme', 'fluxuri', 'istoric_log'];
  const tables = isSuperAdmin ? SUPER_ADMIN_TABLES : TENANT_TABLES;

  // Check if Supabase has any data at all first
  const { data: testData } = await sbClient.from('cladiri').select('id').limit(1);
  if (!testData || testData.length === 0) {
    console.log('Supabase este gol — se păstrează datele locale demo. Apasă Sincronizează pentru a urca datele.');
    // If Supabase is empty, we should still load local data if available
    if (loadLocalDB(true)) {
      toast('✅ Date locale restaurate (Supabase este gol).');
    }
    return; // Keep local seed data intact
  }

  toast(isSuperAdmin ? '⏳ Se încarcă datele platformei...' : '⏳ Se încarcă datele din Supabase...');
  for (const tbl of tables) {
    const rows = await sbFetch(tbl);
    // DOAR dacă tabelul are date în Cloud, le suprascriem pe cele locale
    // Dacă Cloud-ul e gol, păstrăm ce avem local (pentru a putea face Sync UP ulterior)
    if (rows !== null && rows.length > 0) {
      DB[tbl] = rows.map(r => {
        const obj = fromSb[tbl] ? fromSb[tbl](r) : { ...r, _loaded: true };
        return obj;
      });
    }
  }
  // 1. Dedup + normalize FIRST
  // For tasks: keep only Supabase records, remove seed duplicates
  const tasksSeen = {};
  DB.tasks = DB.tasks.filter(t => {
    const key = t.titlu || t.title || t.id;
    if (tasksSeen[key]) {
      // Keep the _loaded (Supabase) version
      if (t._loaded) { tasksSeen[key] = t; return true; }
      return false;
    }
    tasksSeen[key] = t;
    return true;
  });
  // Use only Supabase tasks when available (ignore seed data)
  const tasksLoaded = DB.tasks.filter(t => t._loaded);
  if (tasksLoaded.length > 0) {
    DB.tasks = tasksLoaded;
    // Dedup Supabase tasks by titlu
    const sbTaskSeen = {};
    DB.tasks = DB.tasks.filter(t => {
      const key = (t.titlu || t.title || '').trim();
      if (sbTaskSeen[key]) return false;
      sbTaskSeen[key] = true;
      return true;
    });
  }

  const cldSeen = {};
  DB.cladiri = DB.cladiri.filter(c => { if (cldSeen[c.cod]) return false; cldSeen[c.cod] = true; return true; });
  // For personal: keep Supabase records (with _loaded=true) over seed records
  // Group by email, prefer _loaded records
  const perByEmail = {};
  DB.personal.forEach(p => {
    if (!perByEmail[p.email] || p._loaded) perByEmail[p.email] = p;
  });
  DB.personal = Object.values(perByEmail);
  const invSeen = {};
  DB.inventar = DB.inventar.filter(b => { if (invSeen[b.nrInv]) return false; invSeen[b.nrInv] = true; return true; });
  DB.inventar.forEach(b => { b.cant = parseInt(b.cant) || 1; b.val = parseFloat(b.val) || 0; });
  // Normalize task status and remap assignId to local personal id
  DB.tasks.forEach(t => {
    t.titlu = t.titlu || t.title || (t.desc || t.description ? (t.desc || t.description).substring(0, 50) : '') || '—';
    t.desc = t.desc || t.description || '';
    t.status = { 'deschis': 'Deschisă', 'deschisa': 'Deschisă', 'finalizat': 'Finalizată', 'finalizata': 'Finalizată' }[t.status] || t.status || 'Deschisă';
    t.prioritate = t.prioritate || t.prio || 'Medie';
    // assignId from Supabase is the Supabase personal.id (large number)
    // Find the matching person in DB.personal by Supabase id
    if (t.assignId) {
      const per = DB.personal.find(p => p.id === t.assignId || p._sbId === t.assignId);
      if (!per) {
        // Try to find by _sbId stored on personal records
        const perBySb = DB.personal.find(p => p._loaded && p.id === t.assignId);
        if (!perBySb) {
          // assignId is a Supabase id - personal loaded from Supabase also has Supabase ids
          // They should match since both come from Supabase
          console.log('Task assignId', t.assignId, 'not found in personal', DB.personal.map(p => p.id));
        }
      }
    }
  });

  // MULTI-TENANT ISOLATION FILTER (Faza 1.5)
  // Dacă utilizatorul nu este Super Admin, izolăm datele vizibile doar la școala sa.
  if (currentUser && currentUser.rol !== 'super_admin') {
    const sid = currentUser.school_id;
    // Permitem fallback pentru datele demonstrative / legacy care nu au încă school_id, considerându-le globale parțial sau alocate primului tenant
    const isOwn = (item) => !item.school_id || String(item.school_id) === String(sid);

    DB.cladiri = DB.cladiri.filter(isOwn);
    DB.camere = DB.camere.filter(isOwn);
    DB.inventar = DB.inventar.filter(isOwn);
    DB.personal = DB.personal.filter(isOwn);
    DB.achizitii = DB.achizitii.filter(isOwn);
    // Furnizorii ar putea fi considerați globali sau per tenant - aici îi lăsăm globali momentan
  }

  _supabaseLoaded = true;

  // 2. Render everything
  if (isSuperAdmin) {
    toast('✅ Platformă încărcată! (' + (DB.schools || []).length + ' tenanți, ' + (DB.personal || []).length + ' utilizatori)');
    renderPersonal();
    updateDashboard();
    updateBadges();
  } else {
    toast('✅ Date încărcate din Supabase! (' +
      DB.cladiri.length + ' clăd, ' + DB.camere.length + ' cam, ' +
      DB.inventar.length + ' bun, ' + DB.tasks.length + ' sarcini)');
    renderCladiri();
    renderInventar();
    renderTasks();
    renderFurnizori();
    renderAchizitii();
    typeof renderMutari === 'function' && renderMutari();
    typeof renderRezervari === 'function' && renderRezervari();
    renderPersonal();
    typeof renderFluxuri === 'function' && renderFluxuri();
    updateDashboard();
    updateBadges();
    typeof renderAprobariPending === 'function' && renderAprobariPending();
  }
  console.log('✅ SB loaded:', { cladiri: DB.cladiri.length, camere: DB.camere.length, inventar: DB.inventar.length, tasks: DB.tasks.length, personal: DB.personal.length });
  checkSyncQueue(); // Verificăm dacă avem date de urcat din sesiuni offline anterioare

  // PATCH 5: delayed navigation after Supabase load
  if (window._pendingNavAfterLoad) {
    const route = window._pendingNavAfterLoad;
    window._pendingNavAfterLoad = null;
    nav(route);
  }
}

// ===== SYNC QUEUE (OFFLINE SUPPORT) =====
let syncQueue = JSON.parse(localStorage.getItem('patrimonet_sync_queue') || '[]');

function addToSyncQueue(op, table, data, isUpdate, localId) {
  syncQueue.push({ op, table, data, isUpdate, localId, time: Date.now() });
  localStorage.setItem('patrimonet_sync_queue', JSON.stringify(syncQueue));
  updateSyncIndicator();
  toast('📡 Offline: Modificarea a fost salvată local și va fi sincronizată la reconectare.', 'info');
}

async function checkSyncQueue() {
  if (!navigator.onLine || syncQueue.length === 0) {
    updateSyncIndicator();
    return;
  }

  console.log(`[SYNC] Procesare coadă (${syncQueue.length} operații)...`);
  toast(`📡 Sincronizare ${syncQueue.length} modificări offline...`, 'info');

  const queueToProcess = [...syncQueue];
  syncQueue = [];
  localStorage.setItem('patrimonet_sync_queue', '[]');

  for (const item of queueToProcess) {
    try {
      if (item.op === 'save') {
        const result = await sbSave(item.table, item.data, item.isUpdate, item.localId, true);
        console.log(`[SYNC] Salvat ${item.table} #${item.localId || 'new'}`);
      } else if (item.op === 'delete') {
        await sbDelete(item.table, item.localId, true);
        console.log(`[SYNC] Șters ${item.table} #${item.localId}`);
      }
    } catch (e) {
      console.error('[SYNC] Eroare la sincronizarea itemului:', item, e);
      syncQueue.push(item); // Reintroducem în coadă dacă a eșuat
    }
  }

  localStorage.setItem('patrimonet_sync_queue', JSON.stringify(syncQueue));
  updateSyncIndicator();
  if (syncQueue.length === 0) {
    toast('✅ Sincronizare finalizată cu succes!', 'success');
  }
}

function updateSyncIndicator() {
  const el = document.getElementById('sync-indicator');
  if (!el) return;

  if (!navigator.onLine) {
    el.innerHTML = '<span class="badge b-gray" title="Ești offline (modificările se salvează local)">🔴 Offline</span>';
  } else if (syncQueue.length > 0) {
    el.innerHTML = `<span class="badge b-gold" style="cursor:pointer" onclick="checkSyncQueue()" title="Apasă pentru sincronizare manuală">🔄 ${syncQueue.length} în așteptare</span>`;
  } else {
    el.innerHTML = '<span class="badge b-teal" title="Conexiune activă cu Supabase">🟢 Online</span>';
  }
}

window.addEventListener('online', () => {
  updateSyncIndicator();
  setTimeout(checkSyncQueue, 2000); // Mic delay pentru a asigura stabilitatea conexiunii
});
window.addEventListener('offline', updateSyncIndicator);

// ===== SUPABASE SAVE WRAPPER =====
async function sbSave(table, localObj, isUpdate = false, localId = null, fromSync = false) {
  if (!SUPABASE_ENABLED) return localObj;

  if (!navigator.onLine && !fromSync) {
    addToSyncQueue('save', table, localObj, isUpdate, localId);
    return localObj;
  }

  const sbRow = toSb(table, localObj) || localObj;
  let result;
  if (isUpdate && localId) {
    result = await sbUpdate(table, localId, sbRow);
    logAudit('UPDATE', table, localId, `Actualizare ${table} #${localId}`);
  } else {
    result = await sbInsert(table, sbRow);
    if (result) {
      localObj.id = result.id;
      logAudit('CREATE', table, result.id, `Creare ${table} #${result.id}` + (sbRow.nume ? ` — ${sbRow.nume}` : (sbRow.titlu ? ` — ${sbRow.titlu}` : '')));
    }
  }
  return result;
}

async function sbSaveIstoric(tip, descriere, user) {
  if (!SUPABASE_ENABLED) return;
  await sbInsert('istoric_log', { tip, descriere, user_name: user?.prenume + ' ' + user?.nume, user_rol: user?.rol, school_id: currentUser?.school_id || null });
}

// ===== AUDIT TRAIL — Logare Structurată =====
async function logAudit(action, entityType, entityId, details) {
  if (!SUPABASE_ENABLED || !sbClient) return;
  try {
    const payload = {
      user_id: currentUser?.id || null,
      user_name: currentUser
        ? currentUser.prenume + " " + currentUser.nume
        : "Anonim",
      school_id: currentUser?.school_id || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || ""
    };

    try {
      const { error } = await sbClient.from("audit_trail").insert(payload);
      if (error) {
        console.warn("[AUDIT skipped]:", error.message);
      }
    } catch (e) {
      console.warn("Audit skipped:", e);
    }
  } catch (err) {
    console.warn("[AUDIT error]:", err.message || err);
  }
}

