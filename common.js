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

let staticPhotosCache = null;

async function loadStaticPhotos() {
  if (Array.isArray(staticPhotosCache)) return staticPhotosCache;
  try {
    const res = await fetch('photos/manifest.json', { cache: 'no-cache' });
    if (!res.ok) {
      staticPhotosCache = [];
      return staticPhotosCache;
    }
    const data = await res.json();
    staticPhotosCache = Array.isArray(data) ? data : [];
    return staticPhotosCache;
  } catch {
    staticPhotosCache = [];
    return staticPhotosCache;
  }
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
  