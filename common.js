const STORAGE_KEYS = {
    photos: 'portfolioPhotos',
    albums: 'portfolioAlbums',
    currentAlbum: 'portfolioCurrentAlbum',
    savedAlbums: 'portfolioSavedAlbums',
    portfolio: 'portfolioItems',
    tutorialDone: 'portfolioTutorialDone'
  };

  // =====================================================
  // STORAGE SERVICE ABSTRACTION (Future-proof for database)
  // =====================================================
  class StorageService {
    async getPhotos() { throw new Error('Not implemented'); }
    async savePhoto(photo) { throw new Error('Not implemented'); }
    async deletePhoto(id) { throw new Error('Not implemented'); }

    async getAlbums() { throw new Error('Not implemented'); }
    async saveAlbum(album) { throw new Error('Not implemented'); }
    async deleteAlbum(id) { throw new Error('Not implemented'); }

    async getCurrentAlbum() { throw new Error('Not implemented'); }
    async setCurrentAlbum(id) { throw new Error('Not implemented'); }

  }

  // =====================================================
  // LOCAL STORAGE SERVICE (Current implementation)
  // =====================================================
  class LocalStorageService extends StorageService {
    async getPhotos() {
      const raw = localStorage.getItem(STORAGE_KEYS.photos);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    async savePhoto(photo) {
      const photos = await this.getPhotos();
      const index = photos.findIndex(p => p.id === photo.id);
      if (index !== -1) {
        photos[index] = photo;
      } else {
        photos.unshift(photo);
      }
      localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(photos));
      return photo;
    }

    async deletePhoto(id) {
      const photos = await this.getPhotos();
      const filtered = photos.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(filtered));
      return filtered;
    }

    async getAlbums() {
      const raw = localStorage.getItem(STORAGE_KEYS.savedAlbums);
      return raw ? JSON.parse(raw) : [];
    }

    async saveAlbum(album) {
      const albums = await this.getAlbums();
      const index = albums.findIndex(a => a.id === album.id);
      if (index !== -1) {
        albums[index] = album;
      } else {
        albums.push(album);
      }
      localStorage.setItem(STORAGE_KEYS.savedAlbums, JSON.stringify(albums));
      return album;
    }

    async deleteAlbum(id) {
      const albums = await this.getAlbums();
      const filtered = albums.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEYS.savedAlbums, JSON.stringify(filtered));
      return filtered;
    }

    async getCurrentAlbum() {
      return localStorage.getItem(STORAGE_KEYS.currentAlbum) || 'all';
    }

    async setCurrentAlbum(id) {
      localStorage.setItem(STORAGE_KEYS.currentAlbum, id);
    }

  }

  // Initialize storage service.
  const storage = new LocalStorageService();
  
  function loadPhotos() {
    const raw = localStorage.getItem(STORAGE_KEYS.photos);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  function savePhotos(photos) {
    localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(photos));
  }

// After CMS Publish, GitHub updates in seconds; Netlify deploy can take 1–2 min.
// When enabled, public pages read from GitHub first so new uploads show ASAP.
const SITE_CONTENT = {
  github: {
    owner: 'idkkkkk123',
    repo: 'PhotoPortfolio',
    branch: 'main',
    enabled: true
  },
  liveRefreshMs: 15000
};

function githubRawUrl(relativePath) {
  const path = String(relativePath).replace(/^\//, '');
  const { owner, repo, branch } = SITE_CONTENT.github;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function resolveMediaUrl(src) {
  if (!src) return src;
  const s = String(src);
  if (/^https?:\/\//i.test(s)) return s;
  if (SITE_CONTENT.github.enabled && s.startsWith('/photos/')) {
    return githubRawUrl(s);
  }
  return s;
}

function normalizePhotoEntry(entry) {
  if (!entry) return entry;
  if (typeof entry === 'string') return resolveMediaUrl(entry);
  if (typeof entry === 'object' && entry.src) {
    return { ...entry, src: resolveMediaUrl(entry.src) };
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
  const sources = [];
  if (SITE_CONTENT.github.enabled) {
    sources.push(githubRawUrl(path));
  }
  sources.push(path);

  for (const url of sources) {
    try {
      const data = await fetchJson(url);
      if (data != null) return data;
    } catch {
      /* try next source */
    }
  }
  return null;
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
  
  function loadAlbums() {
    const raw = localStorage.getItem(STORAGE_KEYS.albums);
    if (!raw) return [{ id: 'all', name: 'All Photos' }];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [{ id: 'all', name: 'All Photos' }];
      }
      const hasAll = parsed.some(a => a && a.id === 'all');
      return hasAll ? parsed : [{ id: 'all', name: 'All Photos' }, ...parsed];
    } catch {
      return [{ id: 'all', name: 'All Photos' }];
    }
  }
  
  function saveAlbums(albums) {
    localStorage.setItem(STORAGE_KEYS.albums, JSON.stringify(albums));
  }
  
  function loadCurrentAlbum() {
    return localStorage.getItem(STORAGE_KEYS.currentAlbum) || 'all';
  }
  
  function saveCurrentAlbum(albumId) {
    localStorage.setItem(STORAGE_KEYS.currentAlbum, albumId);
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
      if (href === current) {
        link.classList.add('active');
      }
    });
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
  