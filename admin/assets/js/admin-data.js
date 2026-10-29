/**
 * BBF SUPER-ADMIN — SHARED UTILITIES
 * All mock data removed. Data loads from real API endpoints.
 */
'use strict';

// Admin API token — matches hash in middleware.php
const BBF_ADMIN_TOKEN = '43655cb79b14d785bce1e0b7937a451a20a8d00193cdf5b8136df2501c2f31f2';

// Authenticated fetch wrapper — always sends token + credentials
function admFetch(url, options = {}) {
  const opts = Object.assign({}, options);
  opts.credentials = 'include';
  opts.headers = Object.assign({}, opts.headers || {}, {
    'X-Admin-Token': BBF_ADMIN_TOKEN
  });
  // If body is a plain object, JSON-stringify it
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  return fetch(url, opts).then(async res => {
    // Strip BOM from response text before parsing JSON
    const text = (await res.text()).replace(/^\uFEFF/, '');
    const json = JSON.parse(text);
    // Re-attach status so callers can check res.status
    Object.defineProperty(json, '_status', { value: res.status });
    // Make it behave like a Response with .json()
    res._json = json;
    return {
      ok: res.ok,
      status: res.status,
      json: () => Promise.resolve(json)
    };
  });
}

/* ─── Formatters ─────────────────────────────────────────────────────────────── */
function admFmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function admFmtTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}

/* ─── Status badge HTML ──────────────────────────────────────────────────────── */
function admBadge(status) {
  const map = {
    'Active':'active','Pending':'pending','Suspended':'suspended',
    'upcoming':'upcoming','published':'published','draft':'draft',
    'success':'active','failed':'suspended',
  };
  return `<span class="adm-badge ${map[status]||'draft'}">${status}</span>`;
}

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
function admToast(message, type = 'success') {
  const container = document.getElementById('adm-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `adm-toast ${type}`;
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  toast.innerHTML = `<i class="fas ${icons[type]||'fa-circle-info'}"></i><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 350); }, 3200);
}

/* ─── Confirm dialog ─────────────────────────────────────────────────────────── */
function admConfirm(title, message, onConfirm, danger = true) {
  const overlay = document.getElementById('adm-confirm');
  if (!overlay) return;
  document.getElementById('adm-confirm-title').textContent = title;
  document.getElementById('adm-confirm-msg').textContent   = message;
  const icon = document.getElementById('adm-confirm-icon');
  if (icon) icon.textContent = danger ? '⚠️' : 'ℹ️';
  overlay.classList.add('show');
  const okBtn  = document.getElementById('adm-confirm-ok');
  const canBtn = document.getElementById('adm-confirm-cancel');
  if (okBtn) okBtn.className = `adm-btn ${danger ? 'adm-btn-danger' : 'adm-btn-primary'}`;
  function cleanup() {
    overlay.classList.remove('show');
    okBtn?.removeEventListener('click', doConfirm);
    canBtn?.removeEventListener('click', doCancel);
  }
  function doConfirm() { cleanup(); onConfirm(); }
  function doCancel()  { cleanup(); }
  okBtn?.addEventListener('click',  doConfirm);
  canBtn?.addEventListener('click', doCancel);
  overlay.addEventListener('click', e => { if (e.target === overlay) doCancel(); }, { once: true });
}

/* ─── Modal open/close ───────────────────────────────────────────────────────── */
function admOpenModal(id)  { document.getElementById(id)?.classList.add('open');    document.body.style.overflow = 'hidden'; }
function admCloseModal(id) { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow = ''; }

/* ─── Auth guard ─────────────────────────────────────────────────────────────── */
function admAuthGuard() {
  // Check sessionStorage first (fast)
  const sess = sessionStorage.getItem('bbf_admin_logged_in');
  if (sess) return; // already logged in

  // Check URL param (just redirected from auth.php)
  const urlParams = new URLSearchParams(window.location.search);
  const loginParam = urlParams.get('login');
  if (loginParam) {
    try {
      const adminData = JSON.parse(decodeURIComponent(loginParam));
      sessionStorage.setItem('bbf_admin_logged_in', 'true');
      sessionStorage.setItem('bbf_admin', JSON.stringify(adminData));
      window.history.replaceState({}, '', window.location.pathname);
      return;
    } catch(e) {}
  }

  // Not authenticated — redirect to login
  if (!window.location.pathname.endsWith('login.html')) {
    window.location.href = 'login.html';
  }
}

/* ─── Logout ─────────────────────────────────────────────────────────────────── */
function admLogout() {
  fetch('../api/admin/auth/logout.php', { method:'POST', credentials:'include' })
    .finally(() => {
      sessionStorage.removeItem('bbf_admin_logged_in');
      sessionStorage.removeItem('bbf_admin');
      window.location.href = 'login.html';
    });
}

/* ─── Mobile sidebar ─────────────────────────────────────────────────────────── */
function admInitSidebar() {
  const sidebar = document.getElementById('adm-sidebar');
  const overlay = document.getElementById('adm-sidebar-overlay');
  const toggle  = document.getElementById('adm-sidebar-toggle');
  toggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  });
}

/* ─── Debounce ───────────────────────────────────────────────────────────────── */
function admDebounce(fn, delay = 280) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
