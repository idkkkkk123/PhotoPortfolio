// =====================================================
// COMMON.JS — API-backed storage with auth
// =====================================================

const API_BASE = '/.netlify/functions';

const STORAGE_KEYS = {
  photos: 'portfolioPhotos',
  albums: 'portfolioAlbums',
  currentAlbum: 'portfolioCurrentAlbum',
  displays: 'portfolioDisplays',
  currentDisplay: 'portfolioCurrentDisplay',
  savedAlbums: 'portfolioSavedAlbums',
  portfolio: 'portfolioItems',
  tutorialDone: 'portfolioTutorialDone',
  authToken: 'vsAuthToken',
  authUser: 'vsAuthUser'
};

// =====================================================
// AUTH STATE
// =====================================================
function getAuthToken() {
  return localStorage.getItem(STORAGE_KEYS.authToken) || null;
}

function getAuthUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.authUser);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setAuth(token, user) {
  if (token && user) {
    localStorage.setItem(STORAGE_KEYS.authToken, token);
    localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.authToken);
    localStorage.removeItem(STORAGE_KEYS.authUser);
  }
}

function isLoggedIn() {
  return !!getAuthToken();
}

function logout() {
  setAuth(null, null);
  window.location.href = 'login.html';
}

function requireAuth() {
  if (!isLoggedIn()) {
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    if (page !== 'login.html' && page !== 'index.html' && page !== '') {
      window.location.href = 'login.html';
      return false;
    }
  }
  return true;
}

// =====================================================
// API HELPER
// =====================================================
async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}/${endpoint}`;

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    console.error('Network error — API unreachable:', networkErr);
    throw new Error('Network error. Please check your connection.');
  }

  // Try to parse JSON, but handle non-JSON responses (e.g. Netlify error pages)
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { data = await res.json(); } catch(e) { data = {}; }
  } else {
    const text = await res.text();
    console.error('Non-JSON response from', url, ':', text.substring(0, 200));
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}. Check that Netlify Functions are deployed and DATABASE_URL is set.`);
    }
    try { data = JSON.parse(text); } catch(e) { data = {}; }
  }

  if (res.status === 401) {
    // Only clear auth and redirect if this was NOT a login/signup attempt
    const isAuthEndpoint = endpoint.includes('api-auth/login') || endpoint.includes('api-auth/signup');
    if (!isAuthEndpoint) {
      setAuth(null, null);
      const page = (window.location.pathname.split('/').pop() || '').toLowerCase();
      if (page !== 'login.html' && page !== 'index.html' && page !== '') {
        window.location.href = 'login.html';
      }
    }
    throw new Error(data.error || 'Unauthorized');
  }

  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }

  return data;
}

// =====================================================
// AUTH API
// =====================================================
async function apiSignup(username, email, password) {
  const data = await apiFetch('api-auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });
  setAuth(data.token, data.user);
  return data;
}

async function apiLogin(email, password) {
  const data = await apiFetch('api-auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setAuth(data.token, data.user);
  return data;
}

async function apiVerifySession() {
  try {
    const data = await apiFetch('api-auth/me', { method: 'GET' });
    return data.user;
  } catch {
    return null;
  }
}

// =====================================================
// PHOTOS API — with local cache for performance
// =====================================================
let _photosCache = null;

async function loadPhotosAsync() {
  try {
    const data = await apiFetch('api-photos', { method: 'GET' });
    const photos = (data.photos || []).map(p => ({
      id: p.id,
      src: p.src,
      name: p.name,
      size: p.size || 0,
      fitMode: p.fit_mode || 'contain',
      date: p.date || p.created_at
    }));
    _photosCache = photos;
    return photos;
  } catch (err) {
    console.error('Failed to load photos:', err);
    return _photosCache || [];
  }
}

// Synchronous fallback — returns cache (pages call this synchronously)
function loadPhotos() {
  return _photosCache || [];
}

async function savePhotosToServer(photosArray) {
  try {
    const data = await apiFetch('api-photos', {
      method: 'POST',
      body: JSON.stringify({ photos: photosArray.map(p => ({
        id: p.id,
        src: p.src,
        name: p.name,
        size: p.size || 0,
        fitMode: p.fitMode || 'contain',
        date: p.date || new Date().toISOString()
      }))})
    });
    // Refresh cache
    await loadPhotosAsync();
    return data;
  } catch (err) {
    console.error('Failed to save photos:', err);
    throw err;
  }
}

// Legacy sync wrapper — still used by some pages
function savePhotos(photos) {
  _photosCache = photos;
  // Fire async save in background
  savePhotosToServer(photos).catch(err => console.error('Background save failed:', err));
}

async function deletePhotoFromServer(id) {
  try {
    await apiFetch(`api-photos/${id}`, { method: 'DELETE' });
    if (_photosCache) _photosCache = _photosCache.filter(p => p.id !== id);
  } catch (err) {
    console.error('Failed to delete photo:', err);
    throw err;
  }
}

// =====================================================
// ALBUMS API — with local cache
// =====================================================
let _albumsCache = null;

async function loadFoldersAsync() {
  try {
    const data = await apiFetch('api-albums', { method: 'GET' });
    _albumsCache = data.albums || [];
    return _albumsCache;
  } catch (err) {
    console.error('Failed to load albums:', err);
    return _albumsCache || [];
  }
}

function loadAlbums() {
  return [{ id: 'all', name: 'All Photos' }];
}

function saveAlbums(albums) {
  // No-op — albums are managed via API now
}

function loadCurrentAlbum() {
  return localStorage.getItem(STORAGE_KEYS.currentAlbum) || 'all';
}

function saveCurrentAlbum(albumId) {
  localStorage.setItem(STORAGE_KEYS.currentAlbum, albumId);
}

// =====================================================
// DISPLAYS API — with local cache
// =====================================================
let _displaysCache = null;

async function loadDisplaysAsync() {
  try {
    const data = await apiFetch('api-displays', { method: 'GET' });
    _displaysCache = data.displays || [];
    return _displaysCache;
  } catch (err) {
    console.error('Failed to load displays:', err);
    return _displaysCache || [];
  }
}

function loadDisplays() {
  return _displaysCache || [];
}

async function saveDisplayToServer(display) {
  try {
    const data = await apiFetch('api-displays', {
      method: 'POST',
      body: JSON.stringify({
        id: display.id,
        name: display.name,
        pages: display.pages,
        exportedImage: display.exportedImage || null
      })
    });
    // Refresh cache
    await loadDisplaysAsync();
    return data;
  } catch (err) {
    console.error('Failed to save display:', err);
    throw err;
  }
}

function saveDisplays(displays) {
  _displaysCache = displays;
  // Save each display that has changed
  for (const d of displays) {
    saveDisplayToServer(d).catch(err => console.error('Background display save failed:', err));
  }
}

async function deleteDisplayFromServer(id) {
  try {
    await apiFetch(`api-displays/${id}`, { method: 'DELETE' });
    if (_displaysCache) _displaysCache = _displaysCache.filter(d => d.id !== id);
  } catch (err) {
    console.error('Failed to delete display:', err);
    throw err;
  }
}

function loadCurrentDisplay() {
  return localStorage.getItem(STORAGE_KEYS.currentDisplay) || null;
}

function saveCurrentDisplay(displayId) {
  if (displayId) {
    localStorage.setItem(STORAGE_KEYS.currentDisplay, displayId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.currentDisplay);
  }
}

// =====================================================
// PORTFOLIO API — with local cache
// =====================================================
let _portfolioCache = null;

async function loadPortfolioAsync() {
  try {
    const data = await apiFetch('api-portfolio', { method: 'GET' });
    _portfolioCache = data.items || [];
    return _portfolioCache;
  } catch (err) {
    console.error('Failed to load portfolio:', err);
    return _portfolioCache || [];
  }
}

async function savePortfolioItemToServer(item) {
  try {
    const data = await apiFetch('api-portfolio', {
      method: 'POST',
      body: JSON.stringify(item)
    });
    await loadPortfolioAsync();
    return data;
  } catch (err) {
    console.error('Failed to save portfolio item:', err);
    throw err;
  }
}

async function deletePortfolioItemFromServer(id) {
  try {
    await apiFetch(`api-portfolio/${id}`, { method: 'DELETE' });
    if (_portfolioCache) _portfolioCache = _portfolioCache.filter(i => i.id !== id);
  } catch (err) {
    console.error('Failed to delete portfolio item:', err);
    throw err;
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String(e.target.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setActiveNav() {
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-btn[href]').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (href === current) {
      link.classList.add('active');
    }
  });

  // Show/hide auth-dependent nav elements
  const authUser = getAuthUser();
  const userBadge = document.getElementById('navUserBadge');
  if (userBadge) {
    if (authUser) {
      userBadge.textContent = authUser.username;
      userBadge.style.display = '';
    } else {
      userBadge.style.display = 'none';
    }
  }
}

function getDefaultCanvasSize() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(window.screen.width * dpr);
  const h = Math.round(window.screen.height * dpr);
  return { width: Math.min(w, 3840), height: Math.min(h, 2160) };
}

function createNewDisplay(name) {
  const displayId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const pageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const size = getDefaultCanvasSize();

  return {
    id: displayId,
    name: name || 'Untitled Collage',
    pages: [
      {
        id: pageId,
        pageNumber: 1,
        width: size.width,
        height: size.height,
        background: '#ffffff',
        items: [],
        guides: []
      }
    ],
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    exportedImage: null
  };
}

function createNewPage() {
  const pageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const size = getDefaultCanvasSize();

  return {
    id: pageId,
    pageNumber: 0,
    width: size.width,
    height: size.height,
    background: '#ffffff',
    items: [],
    guides: []
  };
}

// =====================================================
// PHOTO SORTING
// =====================================================
function sortPhotos(photos, sortType) {
  const sorted = [...photos];

  switch(sortType) {
    case 'newest':
      return sorted.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });
    case 'oldest':
      return sorted.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateA - dateB;
      });
    case 'sizeDesc':
      return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    case 'sizeAsc':
      return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
    case 'nameAsc':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'nameDesc':
      return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    default:
      return sorted;
  }
}

// =====================================================
// LOADING OVERLAY
// =====================================================
function showGlobalLoader(msg) {
  let overlay = document.getElementById('globalLoader');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalLoader';
    overlay.className = 'global-loader';
    overlay.innerHTML = '<div class="global-loader-spinner"></div><div class="global-loader-text"></div>';
    document.body.appendChild(overlay);
  }
  overlay.querySelector('.global-loader-text').textContent = msg || 'Loading...';
  overlay.classList.add('active');
}

function hideGlobalLoader() {
  const overlay = document.getElementById('globalLoader');
  if (overlay) overlay.classList.remove('active');
}

// =====================================================
// INIT — preload data caches on page load
// =====================================================
async function initAppData() {
  if (!isLoggedIn()) return;
  showGlobalLoader('Loading your data...');
  try {
    await Promise.all([
      loadPhotosAsync(),
      loadDisplaysAsync()
    ]);
  } catch (err) {
    console.error('Failed to preload data:', err);
  }
  hideGlobalLoader();
}