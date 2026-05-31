(function () {
  function toAdminPhoto(p) {
    return {
      id: p.id || String(Date.now()),
      src: p.src || p.image || '',
      name: p.name || p.title || 'Untitled',
      category: p.category || 'all',
      description: p.description || '',
      date: p.date || p.uploadedAt || new Date().toISOString()
    };
  }

  function toStoredPhoto(p) {
    return {
      id: p.id || String(Date.now()),
      name: p.name || p.title || 'Untitled',
      src: p.src || p.image || '',
      date: p.date || p.uploadedAt || new Date().toISOString(),
      description: p.description || ''
    };
  }

  async function loadGallery() {
    const response = await fetch('/.netlify/functions/load-photos', { cache: 'no-store' });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Could not load gallery');
    return (data.photos || []).map(toAdminPhoto);
  }

  async function saveGallery(photos) {
    const payload = { photos: photos.map(toStoredPhoto) };
    const response = await fetch('/.netlify/functions/save-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Could not save gallery');
    return data;
  }

  async function uploadFiles(files) {
    const response = await fetch('/.netlify/functions/upload-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: files.map(function (f) {
          return {
            id: f.id,
            name: f.name,
            dataBase64: f.dataUrl || f.dataBase64,
            size: f.size || 0
          };
        })
      })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Upload failed');
    return data.files || [];
  }

  async function loadAlbums() {
    const response = await fetch('/.netlify/functions/load-albums', { cache: 'no-store' });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Could not load albums');
    return data.albums || [];
  }

  async function saveAlbums(albums) {
    const response = await fetch('/.netlify/functions/save-albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albums: albums })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Could not save albums');
    return data;
  }

  window.AdminAPI = {
    toAdminPhoto: toAdminPhoto,
    toStoredPhoto: toStoredPhoto,
    loadGallery: loadGallery,
    saveGallery: saveGallery,
    uploadFiles: uploadFiles,
    loadAlbums: loadAlbums,
    saveAlbums: saveAlbums
  };
})();
