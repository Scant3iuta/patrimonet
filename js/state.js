// ===== CONFIG & STATE =====
let DB = { schools: [], cladiri: [], camere: [], inventar: [], furnizori: [], achizitii: [], personal: [], tasks: [], mutari: [], rezervari: [], aprobari: [] };

function resetAppState() {
  DB.cladiri      = [];
  DB.camere       = [];
  DB.inventar     = [];
  DB.tasks        = [];
  DB.personal     = [];
  DB.locatii      = [];
  DB.furnizori    = [];
  DB.achizitii    = [];
  DB.mutari       = [];
  DB.rezervari    = [];
  DB.aprobari     = [];
  DB.schools      = [];
  DB.istoric_log  = [];
  istoricLog      = [];
  activities      = [];
  notifications   = [];
}
let currentUser = null;
let activities = [];
let istoricLog = []; // Va fi populat din DB.istoric_log la nevoie, mentinem ptr compatibilitate rapida
DB.istoric_log = [];
let notifications = [];
let ROLE_PERMISSIONS = {};

// ===== CONSTANTS =====
const ROLE_LABELS = {
  super_admin: 'Super Admin Platformă',
  school_admin: 'Administrator Patrimoniu',
  director: 'Conducere — Director',
  dir_adj: 'Conducere — Director Adjunct',
  contabil: 'Contabilitate — Contabil Șef',
  contabil_sec: 'Contabilitate — Contabil',
  casier: 'Contabilitate — Casier',
  economist: 'Contabilitate — Economist',
  informatician: 'Informatician Școlar',
  profesor: 'Profesor',
  mentenanta: 'Personal Mentenanță',
  pedagog: 'Pedagog Internat',
  bucatar: 'Personal Cantină',
  ingrijitor: 'Personal Curățenie',
  paznic: 'Personal Pază'
};
const ROLE_COLORS = {
  super_admin: '#1a1f2e',
  school_admin: '#0d7c6b',
  director: '#7c3aed',
  dir_adj: '#9d5ce5',
  contabil: '#1a6fa8',
  contabil_sec: '#2980b9',
  casier: '#1a6fa8',
  economist: '#1a6fa8',
  informatician: '#0369a1',
  profesor: '#0891b2',
  mentenanta: '#d97706',
  pedagog: '#0891b2',
  bucatar: '#f59e0b',
  ingrijitor: '#84cc16',
  paznic: '#64748b'
};

// ===== LOGIN =====
async function doLogin() {
  console.log('[AUTH] doLogin() apelat');
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;

  if (!u || !p) {
    alert('Te rugăm să introduci email-ul și parola.');
    return;
  }

  console.log('[AUTH] Încercare login prin Supabase Auth...');
  const btn = document.querySelector('.login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Autentificare...⏳'; }

  try {
    const { data, error } = await sbClient.auth.signInWithPassword({
      email: u,
      password: p
    });

    if (error) {
      console.error('[AUTH ERROR]', error.message);
      alert('Credențiale incorecte! ' + error.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Autentificare →'; }
      return;
    }

    console.log('[AUTH] Autentificare reușită via Supabase.');

    // Acum preluăm datele reale ale userului din DB.personal sau direct din DB dacă nu e sincronizat încă
    let found = (DB.personal || []).find(x => x.email === u);

    if (!found) {
      console.warn('[AUTH] Profil local negăsit, reîncercare direct din DB...');
      try {
        const { data: dbUser, error: dbErr } = await sbClient
          .from('personal')
          .select('*')
          .eq('email', u)
          .limit(1)
          .maybeSingle();

        if (dbErr || !dbUser) {
          throw dbErr || new Error("User not found");
        }

        // Dacă-l găsim în DB, îl adăugăm temporar ca să poată continua login-ul
        found = {
          id: dbUser.id,
          prenume: dbUser.prenume || '',
          nume: dbUser.nume || '',
          email: dbUser.email,
          rol: dbUser.rol || 'viewer',
          school_id: dbUser.school_id,
          _loaded: true
        };
        console.log('[AUTH] Profil recuperat din DB cu succes:', found.email);
      } catch (e) {
        console.error('[AUTH] Eroare recuperare profil DB:', e.message);
        alert('Contul a fost conectat dar nu are profil asociat în aplicație.');
        await sbClient.auth.signOut();
        if (btn) { btn.disabled = false; btn.textContent = 'Autentificare →'; }
        return;
      }
    }

    let finalRole = found.rol;
    if (finalRole === 'admin_pat') finalRole = 'school_admin';

    currentUser = {
      ...found,
      rol: finalRole,
      school_id: found.school_id || 1,
      school_name: found.school_name || 'Colegiul Național „Vasile Goldiș”',
      logo_url: found.logo_url || 'https://cnvga.ro/wp-content/uploads/2023/11/colegiu-vasile-goldis-arad-logo-svg.svg'
    };

    try {
      sessionStorage.setItem('patrimonet_session', JSON.stringify(currentUser));
    } catch (e) { console.warn('[AUTH] SessionStorage warn:', e); }

    _enterApp();
  } catch (err) {
    console.error('[AUTH CATCH]', err);
    alert('A apărut o eroare la conectare.');
    if (btn) { btn.disabled = false; btn.textContent = 'Autentificare →'; }
  }
}

function _enterApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  document.body.classList.add('has-session');
  // Reset ALL nav items visibility before applying role permissions
  document.querySelectorAll('.nav-item, .nav-group').forEach(el => { el.style.display = 'flex'; el.classList.remove('active'); });
  // Reset ALL sections
  document.querySelectorAll('.section').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
  // Audit trail — log login
  logAudit('LOGIN', 'personal', currentUser?.id, `Autentificare: ${currentUser?.prenume} ${currentUser?.nume} (${currentUser?.rol})`);
  try {
    initApp();
  } catch (e) {
    console.error('[AUTH] Eroare la initApp, dar sesiunea e restaurată:', e);
  }
}

// Auto-restore sesiune la încărcarea paginii cu verificare Supabase
async function tryRestoreSession() {
  try {
    const { data: { session }, error } = await sbClient.auth.getSession();

    if (error || !session) {
      console.log('[AUTH] Nicio sesiune Supabase activă.');
      sessionStorage.removeItem('patrimonet_session');
      return false;
    }

    console.log('[AUTH] Sesiune validă Supabase găsită pentru:', session.user.email);

    const raw = sessionStorage.getItem('patrimonet_session');
    let savedUser = null;
    if (raw) savedUser = JSON.parse(raw);

    // Dacă nu avem user-ul în cache, sau e altul, facem un fallback fetch din datele noastre
    if (!savedUser || savedUser.email !== session.user.email) {
      console.log('[AUTH] Reconstruire cache sesiune...');
      let found = (DB.personal || []).find(x => x.email === session.user.email);

      if (!found) {
        console.warn('[AUTH] Profil local negăsit la restore, reîncercare direct din DB...');
        try {
          const { data: dbUser, error: dbErr } = await sbClient
            .from('personal')
            .select('*')
            .eq('email', session.user.email)
            .limit(1)
            .maybeSingle();

          if (!dbErr && dbUser) {
            found = {
              id: dbUser.id,
              prenume: dbUser.prenume || '',
              nume: dbUser.nume || '',
              email: dbUser.email,
              rol: dbUser.rol || 'viewer',
              school_id: dbUser.school_id,
              _loaded: true
            };
            console.log('[AUTH] Profil restaurat din DB cu succes:', found.email);
          }
        } catch (e) {
          console.error('[AUTH] Eroare recuperare profil DB la restore:', e.message);
        }
      }

      if (found) {
        let finalRole = found.rol;
        if (finalRole === 'admin_pat') finalRole = 'school_admin';
        savedUser = {
          ...found, rol: finalRole,
          school_id: found.school_id || 1,
          school_name: found.school_name || 'Colegiul Național „Vasile Goldiș”',
          logo_url: found.logo_url || 'https://cnvga.ro/wp-content/uploads/2023/11/colegiu-vasile-goldis-arad-logo-svg.svg'
        };
        sessionStorage.setItem('patrimonet_session', JSON.stringify(savedUser));
      } else {
        console.warn('[AUTH] User-ul din sesiune nu are profil valid nici in DB local nici pe server. Logout forțat.');
        await sbClient.auth.signOut();
        return false;
      }
    }

    console.log('[AUTH] Restaurez complet profilul pentru:', savedUser.email, '/', savedUser.rol);
    currentUser = savedUser;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => _enterApp());
    } else {
      _enterApp();
    }
    return true;
  } catch (e) {
    console.warn('[AUTH] Eroare majoră la restaurarea sesiunii:', e);
    sessionStorage.removeItem('patrimonet_session');
    return false;
  }
}

// Executează restaurarea sesiunii imediat
// tryRestoreSession(); // Execuția este acum mutată în index.html la evenimentul window.load

async function logout() {
  // Audit trail — log logout (înainte de resetarea currentUser)
  logAudit('LOGOUT', 'personal', currentUser?.id, `Deconectare: ${currentUser?.prenume} ${currentUser?.nume}`);
  currentUser = null;
  _supabaseLoaded = false; // Reset so next user gets fresh data from Supabase
  // Șterge sesiunea salvată
  try { sessionStorage.removeItem('patrimonet_session'); } catch (e) { }
  document.body.classList.remove('has-session');
  // Reset DB to empty so no previous user's view leaks
  resetAppState();
  // Reset nav items
  document.querySelectorAll('.nav-item, .nav-group').forEach(el => { el.style.display = 'flex'; el.classList.remove('active'); });
  // Reset sections
  document.querySelectorAll('.section').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
  // Reset notifications
  notifications = [];
  document.getElementById('notifPanel').classList.remove('open');
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  const btn = document.querySelector('.login-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Autentificare →'; }

  // Semnalăm către Supabase
  try { await sbClient.auth.signOut(); } catch (e) { }

  toast('La revedere!');
}

function doLogout() { logout(); }

// ===== INIT =====
function initApp() {
  if (!currentUser) {
    console.warn('[INIT] currentUser este null, anulez inițializarea.');
    return;
  }
  seedData();

  if (!window.__dbAutoSaveIv) {
    window.__dbAutoSaveIv = setInterval(() => { if (typeof saveLocalDB === 'function') saveLocalDB(); }, 3000);
  }

  // Personalizare Branding UI pe baza Tenant-ului (school_id)
  const schoolName = currentUser.school_name || 'PatrimoNet';
  const logoUrl = currentUser.logo_url || '';
  const schoolId = currentUser.school_id || 1;

  if (currentUser.rol === 'super_admin') {
    document.getElementById('sidebarSchoolName').innerHTML = `Platformă<br>PatrimoNet Pro`;
    document.getElementById('sidebarLogoBox').innerHTML = `<div style="font-size:24px;text-align:center;width:100%">🌐</div>`;
    document.querySelector('.sidebar-logo-text').textContent = "PatrimoNet Global";
  } else {
    document.getElementById('sidebarSchoolName').innerHTML = schoolName.replace(/ /g, '<br>');
    if (logoUrl) {
      document.getElementById('sidebarLogoBox').innerHTML = `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;padding:2px">`;
    } else {
      document.getElementById('sidebarLogoBox').innerHTML = `🏫`;
    }
    document.querySelector('.sidebar-logo-text').textContent = "PatrimoNet " + (schoolId === 1 ? "- CNVGA" : "- " + schoolName);
  }

  // Show user info
  const initials = ((currentUser.prenume?.[0] || 'U') + (currentUser.nume?.[0] || '')).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = (currentUser.prenume || '') + ' ' + (currentUser.nume || '');
  document.getElementById('userRoleLabel').textContent = ROLE_LABELS[currentUser.rol] || currentUser.rol;
  const todayEl = document.getElementById('todayLabel');
  if (todayEl) todayEl.textContent = new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  // Filter nav items and groups by role
  document.querySelectorAll('.nav-item, .nav-group').forEach(el => {
    const roles = el.getAttribute('data-roles');
    if (roles && !roles.split(',').includes(currentUser.rol)) {
      el.style.display = 'none';
    } else {
      // ensure it's visible if it was hidden before
      if (el.classList.contains('nav-group')) el.style.display = 'block';
      if (el.classList.contains('nav-item')) el.style.display = 'flex';
    }
  });
  updateDashboard();
  updateBadges();
  // Init extended state
  DB.mutari = DB.mutari || [];
  DB.rezervari = DB.rezervari || [];
  DB.probleme = DB.probleme || [];
  DB.prezenta = DB.prezenta || [];
  DB.mese = DB.mese || [];
  DB.fluxuri = DB.fluxuri || [];
  istoricLog = [];
  // Load persistence after core resets but before Supabase sync
  try { loadPersistedIstoric(); } catch (e) { console.warn('[INIT] loadPersistedIstoric eroare:', e); }

  // Connect Supabase
  initSupabase();
  // Load from Supabase if configured, otherwise use demo data
  if (SUPABASE_ENABLED) {
    // Curăță datele seed înainte de încărcare din SB
    // (seed-ul rămâne doar dacă SB e gol sau deconectat)
    loadFromSupabase();
  }

  // Log authentication ONLY if it's a new session or the last log is old
  const lastLog = istoricLog[0];
  const authMsg = `Autentificare: ${currentUser.prenume} ${currentUser.nume} (${ROLE_LABELS[currentUser.rol] || currentUser.rol})`;
  if (!lastLog || lastLog.descriere !== authMsg) {
    addIstoricEvent('auth', authMsg, currentUser);
    persistIstoric();
  }
  // Populate filters
  setTimeout(() => {
    const sel = document.getElementById('filterIstoricUser');
    if (sel) sel.innerHTML = '<option value="">Toți utilizatorii</option>' + DB.personal.map(p => `<option>${p.prenume} ${p.nume}</option>`).join('');
    const auditUser = document.getElementById('auditUser');
    if (auditUser) auditUser.innerHTML = DB.personal.map(p => `<option>${p.prenume} ${p.nume}</option>`).join('');
    const rezCam = document.getElementById('filterRezCam');
    if (rezCam) rezCam.innerHTML = '<option value="">Toate sălile</option>' + DB.camere.map(cam => `<option value="${cam.id}">${cam.cod} — ${cam.nume}</option>`).join('');
  }, 100);
  applyRolePermissions();
  updateQRScanButton();
  updateAprobari();
  updateFluxBadge();
  // Navigate to dashboard
  nav('dashboard', document.querySelector('.nav-item'));
}

// ===== PERSISTENȚĂ LOCALDB =====
window.loadLocalDB = function (silent = false) {
  if (!currentUser) return false;
  const sid = currentUser.school_id || 1;
  const key = 'patrimonet_db_' + sid;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.cladiri && parsed.cladiri.length > 0) {
        DB = { ...DB, ...parsed };
        if (!silent) toast('✅ Date restaurate din memoria locală.');
        return true;
      }
    } catch (e) {
      console.warn('Eroare la parsarea datelor locale:', e);
    }
  }
  // Dacă nu s-a găsit nimic pe cheia specifică, încearcă o recuperare mai agresivă
  return rescueData(silent);
}

window.saveLocalDB = function () {
  if (!currentUser) return;
  const key = 'patrimonet_db_' + (currentUser.school_id || 1);

  // SIGURANȚĂ: Nu suprascriem un backup existent cu o bază de date goală
  // (Prevenim ștergerea accidentală la login/sync eșuat)
  const existing = localStorage.getItem(key);
  if (existing && existing.length > 50 && (DB.cladiri.length === 0 && DB.inventar.length === 0)) {
    console.warn('[SECURITY] Save blocat pentru a preveni pierderea datelor locale.');
    return;
  }

  localStorage.setItem(key, JSON.stringify(DB));
}

// FUNCȚIE AUTOMATĂ DE RECUPERARE (Internă)
window.rescueData = function (silent = false) {
  const sid = currentUser ? (currentUser.school_id || 1) : 1;
  // Căutăm în toate locurile posibile unde s-ar fi putut salva datele (mutații de dezvoltare)
  const keys = ['patrimonet_db_' + sid, 'patrimonet_db_undefined', 'patrimonet_db_1', 'patrimonet_db_null', 'db_1'];

  for (let k of keys) {
    const data = localStorage.getItem(k);
    if (data && data.length > 200) {
      try {
        const p = JSON.parse(data);
        if (p.cladiri && p.cladiri.length > 0) {
          console.log('[RECOVERY] Backup găsit în ' + k + ' (' + p.cladiri.length + ' clădiri)');
          DB = p;
          if (!silent) toast('✅ Date restaurate automat din memoria locală.');
          return true;
        }
      } catch (e) { }
    }
  }
  return false;
}

// ===== SEED =====
function seedData() {
  // Nu mai folosim date hardcodate pentru securitate.
  // Totul se încarcă din Supabase sau LocalStorage-ul securizat.

  if (loadLocalDB() || rescueData(true)) {
    console.log('[LocalDB] Date restaurate.');
    return;
  }

  // Activități inițiale golite pentru a nu induce în eroare
  if (!activities.length) {
    activities = [
      { msg: 'Sistem pornit. Vă rugăm să vă autentificați.', color: 'sky', time: 'Acum' }
    ];
  }
}

