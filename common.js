// Bump when deploying so browsers fetch fresh common.js (see script tags ?v=).
const COMMON_JS_VERSION = '3';

const STORAGE_KEYS = {
  tutorialDone: 'portfolioTutorialDone'
};

const LEGACY_LOCAL_KEYS = [
  'portfolioPhotos',
  'portfolioAlbums',
  'portfolioCurrentAlbum',
  'portfolioSavedAlbums',
  'portfolioItems'
];

/** Remove old per-device photo data so every visitor sees the same CMS/GitHub content. */
function clearLegacyLocalPhotoData() {
  try {
    LEGACY_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

clearLegacyLocalPhotoData();

// Shared "database": JSON files in GitHub (photos/gallery.json, albums.json, portfolio.json).
// Netlify CMS writes there; all devices read the same files — not localStorage.
// When enabled, public pages read from GitHub first so new uploads show ASAP.
const SITE_CONTENT = {
  github: {
    owner: 'idkkkkk123',
    repo: 'PhotoPortfolio',
    branch: 'main',
    enabled: true
  },
  liveRefreshMs: 15000,
  cacheVersion: COMMON_JS_VERSION
};

function githubRawUrl(relativePath) {
  const path = String(relativePath).replace(/^\//, '');
  const { owner, repo, branch } = SITE_CONTENT.github;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function resolveMediaUrl(src, entry) {
  if (!src) return src;
  let s = String(src);
  if (!/^https?:\/\//i.test(s) && SITE_CONTENT.github.enabled && s.startsWith('/photos/')) {
    s = githubRawUrl(s);
  }
  const bust = (entry && (entry.id || entry.date || entry.createdAt)) || SITE_CONTENT.cacheVersion;
  const sep = s.includes('?') ? '&' : '?';
  return `${s}${sep}cb=${encodeURIComponent(String(bust))}`;
}

function normalizePhotoEntry(entry) {
  if (!entry) return entry;
  if (typeof entry === 'string') return resolveMediaUrl(entry, null);
  if (typeof entry === 'object' && entry.src) {
    return { ...entry, src: resolveMediaUrl(entry.src, entry) };
  }
  return entry;
}

function normalizeAlbum(album) {
  if (!album || typeof album !== 'object') return album;
  const copy = { ...album };
  if (Array.isArray(copy.photos)) {
    copy.photos = copy.photos.map(normalizePhotoEntry);
  }
  return copy;
}

async function fetchJson(url) {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function loadJson(relativePath) {
  const path = String(relativePath).replace(/^\//, '');
  const tasks = [];

  if (SITE_CONTENT.github.enabled) {
    tasks.push(
      fetchJson(githubRawUrl(path))
        .then((data) => ({ source: 'github', data }))
        .catch(() => ({ source: 'github', data: null }))
    );
  }

  tasks.push(
    fetchJson(path)
      .then((data) => ({ source: 'site', data }))
      .catch(() => ({ source: 'site', data: null }))
  );

  const results = await Promise.all(tasks);
  const fromGithub = results.find((r) => r.source === 'github' && r.data != null);
  const fromSite = results.find((r) => r.source === 'site' && r.data != null);

  if (fromGithub) return fromGithub.data;
  return fromSite ? fromSite.data : null;
}

async function loadStaticGalleryPhotos() {
  const data = await loadJson('photos/gallery.json');
  let photos = [];
  if (Array.isArray(data)) photos = data;
  else if (data && Array.isArray(data.photos)) photos = data.photos;
  return photos.map(normalizePhotoEntry);
}

async function loadStaticAlbums() {
  const data = await loadJson('photos/albums.json');
  let albums = [];
  if (Array.isArray(data)) albums = data;
  else if (data && Array.isArray(data.albums)) albums = data.albums;
  return albums.map(normalizeAlbum);
}

async function loadStaticPortfolioItems() {
  const data = await loadJson('photos/portfolio.json');
  let items = [];
  if (Array.isArray(data)) items = data;
  else if (data && Array.isArray(data.items)) items = data.items;
  return items.map(normalizePhotoEntry);
}

let _liveContentTimer = null;

function startLiveContentSync(refreshFn, intervalMs) {
  const ms = intervalMs ?? SITE_CONTENT.liveRefreshMs ?? 15000;

  const run = (opts) => refreshFn(opts || {});

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run({ silent: true });
  });

  window.addEventListener('focus', () => run({ silent: true }));

  if (_liveContentTimer) clearInterval(_liveContentTimer);
  _liveContentTimer = setInterval(() => {
    if (document.visibilityState === 'visible') run({ silent: true });
  }, ms);

  return {
    stop() {
      if (_liveContentTimer) {
        clearInterval(_liveContentTimer);
        _liveContentTimer = null;
      }
    }
  };
}
  
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
      const file = href.split('/').pop();
      if (file === current) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  window.setActiveNav = setActiveNav;

  // =====================================================
  // PHOTO SORTING
  // =====================================================
  function sortPhotos(photos, sortType) {
    const sorted = [...photos];

    switch(sortType) {
      case 'saved':
        return sorted;
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
  