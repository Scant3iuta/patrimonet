// ===== UI UTILS =====
function addActivity(msg, color) {
  const t = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  activities.push({ msg, color, time: 'Astăzi ' + t });
}
function toast(msg) {
  const el = document.getElementById('toastEl');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ===== TENANT BADGE =====
function updateTenantBadge() {
    const existing = document.getElementById("tenantBadge");

    if (!window.CURRENT_TENANT_CODE) {
        if (existing) existing.remove();
        return;
    }

    const titleEl = document.getElementById("pageTitle");
    if (!titleEl) return;

    let badge = existing;

    if (!badge) {
        badge = document.createElement("span");
        badge.id = "tenantBadge";
        badge.style.marginLeft = "12px";
        badge.style.padding = "4px 10px";
        badge.style.background = "#e8f3ff";
        badge.style.color = "#1b4f91";
        badge.style.borderRadius = "6px";
        badge.style.fontSize = "12px";

        const exitBtn = document.createElement("button");
        exitBtn.innerText = "Ieșire din instanță";
        exitBtn.style.marginLeft = "8px";

        exitBtn.onclick = () => {
            localStorage.removeItem("activeTenantId");
            localStorage.removeItem("activeTenantCode");
            location.reload();
        };

        badge.appendChild(document.createTextNode("Instanță: "));
        badge.appendChild(document.createTextNode(window.CURRENT_TENANT_CODE));
        badge.appendChild(exitBtn);

        titleEl.appendChild(badge);
    } else {
        badge.childNodes[1].nodeValue = window.CURRENT_TENANT_CODE;
    }
}

// ===== NAVIGATION =====
function nav(id, el) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  // Show requested section
  const target = document.getElementById('section-' + id);
  if (target) { target.style.display = 'block'; target.classList.add('active'); }
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  // Update page title
  const pageTitles = { dashboard: 'Tablou de bord', cladiri: 'Clădiri', camere: 'Camere & Săli', inventar: 'Inventar Bunuri', import: 'Import / Export', qr: 'Coduri QR', internat: 'Internat & Cantină', furnizori: 'Furnizori', achizitii: 'Achiziții', mentenanta: 'Mentenanță', fluxuri: 'Fluxuri de lucru', personal: 'Personal & Utilizatori', setari: 'Setări', rapoarte: 'Rapoarte & Statistici', mutari: 'Mutări bunuri', rezervari: 'Rezervare săli', aprobari: 'Aprobări', istoric: 'Istoric & Log', audit: 'Rapoarte audit', ai_asistent: 'Asistent AI PatrimoNet', ai_propuneri: 'Optimizarări și Propuneri AI', ai_todo: 'Planificator Inteligent AI', ai_builder_reports: 'Generare Rapoarte Custom (AI)', ai_builder_schema: 'Schema Builder & Formulare (AI)', ai_builder_audit: 'Auditor Securitate Sistem (AI)' };
  const pt = document.getElementById('pageTitle');
  if (pt) pt.textContent = pageTitles[id] || id;

  // Mobile UX: Close sidebar on navigation
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }

  // Render section content
  if (id === 'dashboard') updateDashboard();
  if (id === 'camere') { populateCladireSelects(); renderCamere(); }
  if (id === 'inventar') { populateCladireSelects(); renderInventar(); }
  if (id === 'cladiri') renderCladiri();
  if (id === 'qr') renderQR();
  if (id === 'furnizori') renderFurnizori();
  if (id === 'achizitii') renderAchizitii();
  if (id === 'mentenanta') renderTasks();
  if (id === 'personal') renderPersonal();
  if (id === 'rapoarte') renderRapoarte();
  if (id === 'mutari') renderMutari();
  if (id === 'rezervari') { renderCalendarRez(); const d = new Date().toISOString().split('T')[0]; const frd = document.getElementById('filterRezData'); if (frd) frd.value = d; }
  if (id === 'aprobari') renderAprobariPending();
  if (id === 'istoric') renderIstoric();
  if (id === 'audit') {
    var asb = document.getElementById('auditSuperBlock');
    if (asb) asb.style.display = (currentUser && currentUser.rol === 'super_admin') ? 'block' : 'none';
  }
  if (id === 'setari') {
    var ssb = document.getElementById('settingsSuperBlock');
    var isSuper = (currentUser && currentUser.rol === 'super_admin');
    if (ssb) {
      ssb.style.display = isSuper ? 'block' : 'none';
      if (isSuper) renderLicenses();
    }
    // Ascunde cardurile de setări școlare pentru Super Admin
    document.querySelectorAll('.settings-card').forEach(card => {
      if (isSuper) {
        const title = (card.querySelector('.settings-card-title')?.textContent || '').toLowerCase();
        // Verificare mai permisivă pentru a evita probleme de encoding
        const shouldHide = title.includes('institu') ||
          title.includes('logo') ||
          title.includes('permisiuni') ||
          title.includes('prefix') ||
          title.includes('nume clădire');
        if (shouldHide) {
          card.style.display = 'none';
        }
      } else {
        card.style.display = 'block';
      }
    });
  }

  // Control vizibilitate butoane Top Bar
  const isSuperTopBar = (currentUser && currentUser.rol === 'super_admin');
  const bScan = document.getElementById('btnScanQR');
  const bPrint = document.getElementById('btnPrint');
  if (bScan) bScan.style.display = (isSuperTopBar ? 'none' : 'flex');
  if (bPrint) bPrint.style.display = (isSuperTopBar ? 'none' : 'flex');
  if (typeof updateTenantBadge === 'function') updateTenantBadge();
  if (id === 'internat') { updateIntStatBox(); renderPrezenta(); updateIntBadges(); }
  if (id === 'fluxuri') { renderFluxuri(); updateFluxBadge(); }
  if (id === 'ai_asistent') renderAIAsistent();
  if (id === 'ai_propuneri') renderAIPropuneri();
  if (id === 'ai_todo') renderAIToDo();
  if (id === 'ai_builder_reports') renderAIBuilderReports();
  if (id === 'ai_builder_schema') renderAIBuilderSchema();
  if (id === 'ai_builder_audit') renderAIBuilderAudit();
  // Close notif panel and sidebar on mobile
  const np = document.getElementById('notifPanel');
  if (np) np.classList.remove('open');
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb && sb.classList.contains('open')) { sb.classList.remove('open'); if (ov) ov.classList.remove('open'); }
}

function populateCladireSelects() {
  const opts = DB.cladiri.map(c => `<option value="${c.id}">${c.cod} — ${c.nume.substring(0, 30)}</option>`).join('');
  ['filterCladireC', 'filterCladireI', 'camCladire', 'bunCladire', 'taskCladire'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const hasAll = el.id.startsWith('filter');
    el.innerHTML = (hasAll ? '<option value="">Toate</option>' : '') + opts;
  });
}


// ===== RESPONSIVE SIDEBAR =====
function toggleSidebar() {
  const s = document.querySelector('.sidebar');
  const o = document.getElementById('sidebarOverlay');
  if (s) s.classList.toggle('open');
  if (o) o.classList.toggle('open');
}

// ===== NOTIFICATIONS =====
function addNotification(title, body, tip, targetRoles) {
  const n = {
    id: Date.now(),
    title,
    body,
    tip,
    targetRoles: targetRoles || ['super_admin', 'school_admin', 'director', 'contabil'],
    time: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    read: false
  };
  notifications.unshift(n);
  renderNotifications();
}

function renderNotifications() {
  const myNotifs = notifications.filter(n => !n.targetRoles || n.targetRoles.includes(currentUser?.rol));
  const unread = myNotifs.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  const dot = document.getElementById('notifDot');
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'inline' : 'none';
  }
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  const panelCount = document.getElementById('notifPanelCount');
  if (panelCount) panelCount.textContent = unread;

  const list = document.getElementById('notifList');
  if (!list) return;
  if (!myNotifs.length) {
    list.innerHTML = '<div class="empty" style="padding:30px"><div class="empty-icon">🔔</div><p>Nicio notificare</p></div>';
    return;
  }
  const icons = {
    mutare: '🔀',
    rezervare: '📅',
    aprobare: '✅',
    mentenanta: '🔧',
    inventar: '📦',
    import: '📥',
    auth: '🔐'
  };
  list.innerHTML = myNotifs.slice(0, 20).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="readNotif(${n.id})">
      <div class="notif-item-title">${icons[n.tip] || '📌'} ${n.title}</div>
      <div class="notif-item-body">${n.body}</div>
      <div class="notif-item-time">${n.time}</div>
    </div>`).join('');
}

function readNotif(id) {
  const n = notifications.find(x => x.id === id);
  if (n) n.read = true;
  renderNotifications();
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  renderNotifications();
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.toggle('open');
}
