const STORAGE_KEYS = {
    photos: 'portfolioPhotos',
    albums: 'portfolioAlbums',
    currentAlbum: 'portfolioCurrentAlbum',
    displays: 'portfolioDisplays',
    currentDisplay: 'portfolioCurrentDisplay',
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

    async getDisplays() { throw new Error('Not implemented'); }
    async saveDisplay(display) { throw new Error('Not implemented'); }
    async deleteDisplay(id) { throw new Error('Not implemented'); }

    async getAlbums() { throw new Error('Not implemented'); }
    async saveAlbum(album) { throw new Error('Not implemented'); }
    async deleteAlbum(id) { throw new Error('Not implemented'); }

    async getCurrentAlbum() { throw new Error('Not implemented'); }
    async setCurrentAlbum(id) { throw new Error('Not implemented'); }

    async getCurrentDisplay() { throw new Error('Not implemented'); }
    async setCurrentDisplay(id) { throw new Error('Not implemented'); }
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

    async getDisplays() {
      const raw = localStorage.getItem(STORAGE_KEYS.displays);
      return raw ? JSON.parse(raw) : [];
    }

    async saveDisplay(display) {
      const displays = await this.getDisplays();
      const index = displays.findIndex(d => d.id === display.id);
      if (index !== -1) {
        displays[index] = display;
      } else {
        displays.push(display);
      }
      localStorage.setItem(STORAGE_KEYS.displays, JSON.stringify(displays));
      return display;
    }

    async deleteDisplay(id) {
      const displays = await this.getDisplays();
      const filtered = displays.filter(d => d.id !== id);
      localStorage.setItem(STORAGE_KEYS.displays, JSON.stringify(filtered));
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

    async getCurrentDisplay() {
      return localStorage.getItem(STORAGE_KEYS.currentDisplay) || null;
    }

    async setCurrentDisplay(id) {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.currentDisplay, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.currentDisplay);
      }
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

  function loadDisplays() {
    const raw = localStorage.getItem(STORAGE_KEYS.displays);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveDisplays(displays) {
    localStorage.setItem(STORAGE_KEYS.displays, JSON.stringify(displays));
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
  