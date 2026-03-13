// ============================================================
// PATRIMONET — saveBunBackend.js
// Funcție server-side pentru validarea și salvarea unui bun nou
// în inventarul Supabase, cu izolare strictă multi-tenant.
//
// Arhitectură: Dual-layer security
//   Layer 1 (JS)    → validare explicită tenant_id înainte de orice operație DB
//   Layer 2 (RLS)   → politicile Supabase resping orice rând cu school_id greșit
//                     via funcția SQL get_my_school_id() (SECURITY DEFINER)
//
// Dependențe: supabase_hooks.js (sbClient, sbInsert, sbUpdate, logAudit,
//             sbSaveIstoric, SUPABASE_ENABLED, currentUser, toSb)
// ============================================================

'use strict';

function _safeISODate(d) {
  if (!d) return null;
  if (typeof globalThis.toISODate === 'function') return globalThis.toISODate(d);
  if (d instanceof Date) return d.toISOString().split('T')[0];
  const s = String(d).trim();
  const ro = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ro) return `${ro[3]}-${ro[2].padStart(2, '0')}-${ro[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  return null;
}

// ─── Constante interne ────────────────────────────────────────────────────────

/** Câmpuri obligatorii pentru orice bun nou. */
const BUN_REQUIRED_FIELDS = ['nr_inv', 'nume', 'cat', 'val', 'stare'];

/** Valori acceptate pentru câmpul `stare`. */
const BUN_STARI_VALIDE = ['Bun', 'Uzat', 'Defect', 'Casat', 'În reparație'];

/** Lungimi maxime permise (prevenție SQL injection / overflow). */
const BUN_MAX_LENGTHS = {
  nr_inv: 50,
  nume: 255,
  cat: 100,
  obs: 2000,
  cont: 50,
};

// ─── Erori custom ─────────────────────────────────────────────────────────────

/**
 * Eroare de izolare tenant — aruncată explicit când school_id-ul
 * bunului nu corespunde cu cel al sesiunii curente.
 */
class TenantIsolationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TenantIsolationError';
    this.code = 'TENANT_ISOLATION_VIOLATION';
  }
}

/**
 * Eroare de validare a datelor bunului.
 */
class BunValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'BunValidationError';
    this.code = 'BUN_VALIDATION_FAILED';
    this.field = field;
  }
}

// ─── Utilități locale ─────────────────────────────────────────────────────────

/**
 * Extrage school_id-ul din sesiunea Supabase Auth curentă.
 * Sursa autoritativă: profilul din tabelul `personal` (via JWT → email).
 *
 * NOTĂ: Nu folosim `currentUser.school_id` direct din memorie —
 * acesta poate fi manipulat client-side. Verificăm întotdeauna
 * față de înregistrarea din DB pentru operații critice.
 *
 * @returns {Promise<number|null>} school_id sau null dacă sesiunea e invalidă.
 */
async function _getSessionSchoolId() {
  if (!SUPABASE_ENABLED || !sbClient) return null;

  // 1. Obținem sesiunea activă din Supabase Auth
  const { data: { session }, error: sessionError } = await sbClient.auth.getSession();
  if (sessionError || !session) {
    console.warn('[TENANT] Sesiune Supabase Auth invalidă sau expirată.');
    return null;
  }

  const authEmail = session.user?.email;
  if (!authEmail) {
    console.warn('[TENANT] Email lipsă din JWT-ul sesiunii.');
    return null;
  }

  // 2. Interogăm DB pentru school_id (sursa de adevăr, nu memoria JS)
  const { data: profile, error: profileError } = await sbClient
    .from('personal')
    .select('school_id, rol')
    .eq('email', authEmail)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('[TENANT] Profil personal negăsit pentru:', authEmail, profileError);
    return null;
  }

  return profile.school_id;
}

// ─── Validare ─────────────────────────────────────────────────────────────────

/**
 * Validează obiectul `bun` primit din formular.
 * Rulează ÎNAINTE de orice interacțiune cu DB.
 *
 * @param {Object} bun - Obiectul local (format app_logic.js)
 * @throws {BunValidationError} dacă datele sunt invalide
 */
function _validateBun(bun) {
  if (!bun || typeof bun !== 'object') {
    throw new BunValidationError('Obiectul bun este null sau invalid.');
  }

  // 1. Câmpuri obligatorii
  for (const field of BUN_REQUIRED_FIELDS) {
    // Mapare câmpuri locale → formatul intern al app_logic.js
    const localField = {
      nr_inv: 'nrInv',
      nume: 'nume',
      cat: 'cat',
      val: 'val',
      stare: 'stare',
    }[field] || field;

    const value = bun[localField];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new BunValidationError(`Câmpul obligatoriu lipsește: "${localField}"`, localField);
    }
  }

  // 2. Valoare numerică pozitivă
  const val = parseFloat(bun.val);
  if (isNaN(val) || val < 0) {
    throw new BunValidationError('Valoarea bunului trebuie să fie un număr pozitiv.', 'val');
  }

  // 3. Stare validă
  if (!BUN_STARI_VALIDE.includes(bun.stare)) {
    throw new BunValidationError(
      `Stare invalidă: "${bun.stare}". Valori permise: ${BUN_STARI_VALIDE.join(', ')}.`,
      'stare'
    );
  }

  // 4. Lungimi maxime (prevenție overflow / injection)
  for (const [sbField, maxLen] of Object.entries(BUN_MAX_LENGTHS)) {
    const localField = { nr_inv: 'nrInv' }[sbField] || sbField;
    const value = bun[localField];
    if (value && String(value).length > maxLen) {
      throw new BunValidationError(
        `Câmpul "${localField}" depășește lungimea maximă de ${maxLen} caractere.`,
        localField
      );
    }
  }

  // 5. Nr. inventar — doar alfanumerice și separatori standard
  if (bun.nrInv && !/^[A-Za-z0-9\-\/\._ ]+$/.test(String(bun.nrInv).trim())) {
    throw new BunValidationError(
      'Numărul de inventar conține caractere nepermise.',
      'nrInv'
    );
  }
}

// ─── Verificare unicitate nr_inv per tenant ───────────────────────────────────

/**
 * Verifică dacă numărul de inventar există deja PENTRU ACELAȘI TENANT.
 * Izolarea RLS din Supabase garantează că interogarea returnează doar
 * rânduri cu `school_id = get_my_school_id()`.
 *
 * @param {string} nrInv - Numărul de inventar de verificat
 * @param {number|null} excludeId - ID-ul bunului curent (pentru editări)
 * @returns {Promise<boolean>} true dacă există duplicat
 */
async function _checkDuplicateNrInv(nrInv, excludeId = null) {
  let query = sbClient
    .from('inventar')
    .select('id', { count: 'exact', head: true })
    .eq('nr_inv', String(nrInv).trim());

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;
  if (error) {
    console.error('[VALIDATE] Eroare verificare duplicat nr_inv:', error);
    // Fail-safe: nu blocăm salvarea din cauza unei erori de verificare
    return false;
  }
  return (count ?? 0) > 0;
}

// ─── Funcția principală ───────────────────────────────────────────────────────

/**
 * Validează și salvează un bun nou (sau actualizează unul existent)
 * în tabela `inventar` din Supabase, cu verificare explicită de tenant.
 *
 * ## Fluxul de securitate (în ordine):
 *
 * 1. **Verificare sesiune activă** — fără sesiune, operația e respinsă imediat.
 * 2. **Extragere school_id din Auth** — din DB, nu din memoria JS.
 * 3. **Verificare izolare tenant** — school_id-ul bunului TREBUIE să
 *    corespundă cu cel al sesiunii. Orice discrepanță = TenantIsolationError.
 * 4. **Validare date** — câmpuri obligatorii, formate, lungimi.
 * 5. **Verificare unicitate** — nr_inv unic per tenant.
 * 6. **Salvare în DB** — via `sbInsert`/`sbUpdate` din supabase_hooks.js.
 * 7. **Audit trail** — logare CREATE/UPDATE cu school_id și user info.
 * 8. **Fallback offline** — dacă nu există conexiune, adaugă în sync queue.
 *
 * @param {Object} bunLocal  - Obiectul bun în formatul intern al app_logic.js
 * @param {boolean} isUpdate - true pentru editare, false pentru creare nouă
 * @param {number|null} localId - ID-ul Supabase al bunului (doar pentru isUpdate)
 *
 * @returns {Promise<{success: boolean, data?: Object, error?: string, code?: string}>}
 *
 * @example
 * // Creare bun nou
 * const result = await saveBunSecure({
 *   nrInv: 'INV-2026-001',
 *   nume:  'Laptop Dell Latitude',
 *   cat:   'Echipamente IT',
 *   val:   4500,
 *   stare: 'Bun',
 *   cladireId: 12,
 *   cameraId:  34,
 * });
 *
 * @example
 * // Actualizare bun existent
 * const result = await saveBunSecure({ ...bunModificat }, true, 101);
 */
async function saveBunSecure(bunLocal, isUpdate = false, localId = null) {

  // ── Pas 1: Verificare Supabase disponibil ──────────────────────────────────
  if (!SUPABASE_ENABLED || !sbClient) {
    // Fallback offline — delegăm sync queue-ului din supabase_hooks.js
    if (!navigator.onLine) {
      addToSyncQueue('save', 'inventar', bunLocal, isUpdate, localId);
      return {
        success: true,
        offline: true,
        data: bunLocal,
        message: 'Offline: bunul a fost salvat local și va fi sincronizat la reconectare.',
      };
    }
    return {
      success: false,
      error: 'Conexiunea cu Supabase nu este disponibilă.',
      code: 'SUPABASE_UNAVAILABLE',
    };
  }

  try {

    // ── Pas 2: Obținere school_id din sesiunea Auth (sursa de adevăr) ────────
    const sessionSchoolId = await _getSessionSchoolId();

    if (!sessionSchoolId) {
      // Sesiune invalidă sau utilizator neautentificat
      await sbSaveIstoric(
        'security_alert',
        `Tentativă salvare bun fără sesiune validă. nrInv: "${bunLocal?.nrInv}"`,
        currentUser
      );
      return {
        success: false,
        error: 'Sesiune invalidă. Autentificați-vă din nou.',
        code: 'INVALID_SESSION',
      };
    }

    // ── Pas 3: VERIFICARE CRITICĂ — izolare tenant ────────────────────────────
    //
    // Dacă bunul conține deja un school_id explicit (ex: la editare sau import),
    // acesta TREBUIE să fie identic cu school_id-ul sesiunii curente.
    // Nu permitem niciodată salvarea unui bun care "pretinde" că aparține
    // altui tenant, indiferent de context.
    //
    const bunSchoolId = bunLocal.school_id ?? currentUser?.school_id ?? null;

    if (bunSchoolId !== null && String(bunSchoolId) !== String(sessionSchoolId)) {
      // ⚠️ ALERTĂ CRITICĂ DE SECURITATE — logăm detalii complete
      const alertDetails = [
        `TENANT ISOLATION VIOLATION`,
        `User: ${currentUser?.email || 'necunoscut'}`,
        `Session school_id: ${sessionSchoolId}`,
        `Bun school_id: ${bunSchoolId}`,
        `nrInv: ${bunLocal?.nrInv}`,
        `isUpdate: ${isUpdate}`,
        `localId: ${localId}`,
        `Timestamp: ${new Date().toISOString()}`,
      ].join(' | ');

      console.error('[SECURITY]', alertDetails);

      // Logăm în audit_trail (nivel error, vizibil super_admin)
      await logAudit('SECURITY_ALERT', 'inventar', localId, alertDetails);

      // Logăm și în istoric_log pentru vizibilitate admin-tenant
      await sbSaveIstoric('security_alert', alertDetails, currentUser);

      throw new TenantIsolationError(
        `Operație respinsă: school_id din bun (${bunSchoolId}) ` +
        `nu corespunde cu sesiunea curentă (${sessionSchoolId}).`
      );
    }

    // ── Pas 4: Injectăm school_id din sesiune (sursa autoritativă) ───────────
    // Suprascrierea deliberată — nu permitem clientului să dicteze tenant-ul.
    bunLocal.school_id = sessionSchoolId;

    // ── Pas 5: Validare date ──────────────────────────────────────────────────
    _validateBun(bunLocal);

    // ── Pas 6: Verificare unicitate nr_inv per tenant ─────────────────────────
    if (!isUpdate) {
      const isDuplicate = await _checkDuplicateNrInv(bunLocal.nrInv);
      if (isDuplicate) {
        return {
          success: false,
          error: `Numărul de inventar "${bunLocal.nrInv}" există deja în instituția dvs.`,
          code: 'DUPLICATE_NR_INV',
          field: 'nrInv',
        };
      }
    }

    // ── Pas 7: Conversie format local → Supabase (via toSb din hooks) ────────
    // toSb.inventar() aplică și fallback-ul school_id = currentUser?.school_id,
    // dar noi am setat deja bunLocal.school_id la valoarea din sesiune (Pas 4).
    const sbRow = toSb('inventar', bunLocal);
    // Asigurăm formatul ISO pentru dată folosind helper-ul local safe
    sbRow.data_pif = _safeISODate(bunLocal.dataPIF);
    sbRow.cant = parseInt(bunLocal.cant) || 1;
    sbRow.locatii = Array.isArray(bunLocal.locatii) ? bunLocal.locatii : [];

    // Sanity check final — ultima linie de apărare înainte de DB
    if (String(sbRow.school_id) !== String(sessionSchoolId)) {
      throw new TenantIsolationError(
        `Conversie toSb a alterat school_id! Așteptat: ${sessionSchoolId}, ` +
        `primit: ${sbRow.school_id}. Operație anulată.`
      );
    }

    // ── Pas 8: Salvare în Supabase ────────────────────────────────────────────
    // RLS din Supabase (politica "inventar_tenant") va respinge automat orice
    // INSERT/UPDATE cu school_id ≠ get_my_school_id() — strat de securitate 2.
    let savedData;

    if (isUpdate && localId) {
      console.log('[DEBUG] sbRow.locatii:', sbRow.locatii);
      console.log('[DEBUG] bunLocal.locatii:', bunLocal.locatii);

      const { data: updatedRow, error: updateError } = await sbClient
        .from('inventar')
        .update(sbRow)
        .eq('id', localId)
        .select()
        .single();

      if (updateError || !updatedRow) {
        console.error('[saveBunSecure] Update error:', updateError);
        return {
          success: false,
          error: 'Actualizarea în Supabase a eșuat.',
          code: 'DB_UPDATE_FAILED'
        };
      }

      savedData = updatedRow;

      const bunUpdated = (typeof fromSb !== 'undefined' && fromSb.inventar)
        ? fromSb.inventar(updatedRow)
        : updatedRow;
      Object.assign(bunLocal, bunUpdated);

      await logAudit('UPDATE', 'inventar', localId,
        `Actualizare: "${sbRow.nr_inv} — ${sbRow.nume}" | school_id: ${sessionSchoolId}`);
    } else {
      savedData = await sbInsert('inventar', sbRow);
      if (!savedData) {
        return {
          success: false,
          error: 'Inserarea în Supabase a eșuat. Verificați logurile.',
          code: 'DB_INSERT_FAILED',
        };
      }
      // Propagăm ID-ul Supabase înapoi în obiectul local (pattern din hooks)
      bunLocal.id = savedData.id;

      await logAudit(
        'CREATE',
        'inventar',
        savedData.id,
        `Bun nou creat: "${sbRow.nr_inv} — ${sbRow.nume}" | school_id: ${sessionSchoolId}`
      );
    }

    // ── Pas 9: Logare istoric operațional ─────────────────────────────────────
    await sbSaveIstoric(
      isUpdate ? 'update' : 'create',
      `${isUpdate ? 'Actualizare' : 'Adăugare'} bun: ${sbRow.nr_inv} — ${sbRow.nume}`,
      currentUser
    );

    // ── Pas 10: Actualizare DB local (sincronizare cu rândul returnat de DB) ───
    const objFinal = fromSb('inventar', savedData);
    if (isUpdate && localId) {
      const idx = DB.inventar.findIndex(x => x.id == localId);
      if (idx !== -1) {
        DB.inventar[idx] = objFinal;
      }
    } else {
      // Verificăm să nu existe deja (evitare dubluri la retry rapid)
      if (!DB.inventar.find(x => x.id === objFinal.id)) {
        DB.inventar.push(objFinal);
      }
    }

    return {
      success: true,
      data: savedData,
      message: `Bunul "${sbRow.nume}" a fost ${isUpdate ? 'actualizat' : 'salvat'} cu succes.`,
    };

  } catch (err) {

    // ── Gestionare erori tipizate ─────────────────────────────────────────────
    if (err instanceof TenantIsolationError) {
      return {
        success: false,
        error: err.message,
        code: err.code,
      };
    }

    if (err instanceof BunValidationError) {
      return {
        success: false,
        error: err.message,
        code: err.code,
        field: err.field,
      };
    }

    // Eroare necunoscută — logăm complet
    console.error('[saveBunSecure] Eroare neașteptată:', err);
    await logAudit(
      'ERROR',
      'inventar',
      localId,
      `Eroare la salvare bun: ${err.message}`
    ).catch(() => { }); // Nu permitem unui eșec de audit să blocheze răspunsul

    return {
      success: false,
      error: `Eroare internă: ${err.message}`,
      code: 'INTERNAL_ERROR',
    };
  }
}

// ─── Integrare cu formularul existent (înlocuiește saveBun() din app_logic) ──

/**
 * Handler pentru butonul "Salvează bun" din UI.
 * Înlocuiește / supraapelează funcția `saveBun()` din app_logic.js,
 * adăugând stratul de securitate tenant.
 *
 * @example
 * // În HTML:
 * // <button onclick="saveInventarHandler()">💾 Salvează</button>
 */
async function saveInventarHandler() {
  console.log('[DEBUG SAVE HANDLER] INTRAT ÎN FUNCȚIE!');
  // Guard anti-double-submit (pattern din app_logic.js)
  if (window._isSaving) {
    console.log('[DEBUG SAVE HANDLER] BLOCHED DE _isSaving!');
    return;
  }
  window._isSaving = true;
  setTimeout(() => (window._isSaving = false), 2000);

  // Citire valori din formular (același pattern ca saveBun() original)
  const id = document.getElementById('bunEditId')?.value;
  const bunLocal = {
    id: id ? parseInt(id) : undefined,
    nrInv: document.getElementById('bunNrInv')?.value?.trim(),
    nume: document.getElementById('bunNume')?.value?.trim(),
    cat: document.getElementById('bunCat')?.value?.trim(),
    cant: parseInt(document.getElementById('bunQty')?.value) || 1,
    val: parseFloat(document.getElementById('bunVal')?.value) || 0,
    stare: document.getElementById('bunStare')?.value,
    cladireId: parseInt(document.getElementById('bunCladire')?.value) || null,
    cameraId: parseInt(document.getElementById('bunCamera')?.value) || null,
    dataPIF: document.getElementById('bunData')?.value || null,
    furnId: parseInt(document.getElementById('bunFurnizor')?.value) || null,
    obs: document.getElementById('bunDesc')?.value?.trim() || '',
    locatii: typeof getLocatiiFromModal === 'function' ? getLocatiiFromModal() : [],
    // school_id este intenționat OMIS din formular — va fi injectat
    // exclusiv din sesiunea Auth în saveBunSecure() (Pas 4)
  };

  console.log('[DEBUG] getLocatiiFromModal:', typeof getLocatiiFromModal === 'function' ? getLocatiiFromModal() : 'NOT FOUND');
  console.log('[DEBUG] bunLocal from form:', JSON.stringify(bunLocal.locatii));

  toast('⏳ Se salvează bunul...', 'info');

  const result = await saveBunSecure(bunLocal, !!id, id ? parseInt(id) : null);

  if (result.success) {
    toast(result.offline
      ? `📡 ${result.message}`
      : `✅ ${result.message}`
    );
    closeModal('modalBun');
    renderInventar();
    updateDashboard();
    addActivity(
      `Bun ${id ? 'actualizat' : 'adăugat'}: ${bunLocal.nrInv} — ${bunLocal.nume}`,
      'teal'
    );
  } else {
    // Mesaje de eroare diferențiate pe tip
    if (result.code === 'TENANT_ISOLATION_VIOLATION') {
      toast('🚨 Acces interzis: nu puteți salva date din altă instituție!', 'error');
    } else if (result.code === 'BUN_VALIDATION_FAILED') {
      toast(`⚠️ Date invalide: ${result.error}`, 'error');
      // Focus pe câmpul cu eroare dacă îl cunoaștem
      if (result.field) {
        const fieldMap = { nrInv: 'bunNrInv', val: 'bunVal', stare: 'bunStare' };
        document.getElementById(fieldMap[result.field] || result.field)?.focus();
      }
    } else if (result.code === 'DUPLICATE_NR_INV') {
      toast(`⚠️ ${result.error}`, 'error');
      document.getElementById('bunNrInv')?.focus();
    } else if (result.code === 'INVALID_SESSION') {
      toast('🔒 Sesiune expirată. Vă rugăm să vă autentificați din nou.', 'error');
      // Opțional: redirect la login
      // setTimeout(() => doLogout(), 1500);
    } else {
      toast(`❌ ${result.error}`, 'error');
    }
  }
}

// ─── Export (pentru medii Node.js / testare unitară) ──────────────────────────
// În browser, funcțiile sunt disponibile global automat.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveBunSecure,
    saveInventarHandler,
    TenantIsolationError,
    BunValidationError,
    _validateBun,        // exportat pentru unit tests
    _checkDuplicateNrInv,
  };
} else {
  // Expose explicitly to window for in-browser DOM onclick handlers
  window.saveInventarHandler = saveInventarHandler;
  window.saveBunSecure = saveBunSecure;
}
