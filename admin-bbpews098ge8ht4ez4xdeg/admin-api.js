(function () {
  const BRANCH = 'main';
  const GALLERY_PATH = 'photos/gallery.json';
  const ALBUMS_PATH = 'photos/albums.json';

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

  function stripDataUrl(dataUrl) {
    const s = String(dataUrl || '');
    const comma = s.indexOf(',');
    return comma >= 0 ? s.slice(comma + 1) : s;
  }

  function textToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function decodeGitContent(base64) {
    const cleaned = String(base64 || '').replace(/\s/g, '');
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  async function getGitToken() {
    const identity = window.netlifyIdentity;
    if (!identity) {
      throw new Error('Netlify Identity is not loaded. Refresh the page and try again.');
    }
    const user = identity.currentUser();
    if (!user) {
      throw new Error('Please log in to the admin panel first.');
    }
    if (typeof user.jwt === 'function') {
      return user.jwt();
    }
    if (user.token && user.token.access_token) {
      return user.token.access_token;
    }
    throw new Error('Could not read your login session. Log out and log in again.');
  }

  function gitContentsUrl(method, repoPath) {
    const segments = String(repoPath)
      .replace(/^\//, '')
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    let url = '/.netlify/git/github/contents/' + segments;
    if (method === 'GET') url += '?ref=' + encodeURIComponent(BRANCH) + '&_=' + Date.now();
    return url;
  }

  async function gitFetch(method, repoPath, body) {
    const token = await getGitToken();
    const url = gitContentsUrl(method, repoPath);

    const options = {
      method: method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { message: text };
    }

    if (response.status === 404 && method === 'GET') {
      return null;
    }

    if (!response.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        'Git request failed (' + response.status + ')';
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          msg +
            '. Enable Git Gateway: Netlify → Identity → Services → Git Gateway → Enable.'
        );
      }
      throw new Error(msg);
    }

    return data;
  }

  async function gitGetJson(repoPath) {
    const file = await gitFetch('GET', repoPath);
    if (!file || !file.content) {
      return { data: null, sha: null };
    }
    const raw = decodeGitContent(file.content);
    return { data: JSON.parse(raw), sha: file.sha };
  }

  async function gitPutJson(repoPath, payload, commitMessage, sha) {
    const content = textToBase64(JSON.stringify(payload, null, 2));
    const body = {
      branch: BRANCH,
      message: commitMessage,
      content: content
    };
    if (sha) body.sha = sha;
    await gitFetch('PUT', repoPath, body);
  }

  async function gitPutBinary(repoPath, base64Content, commitMessage, sha) {
    const body = {
      branch: BRANCH,
      message: commitMessage,
      content: stripDataUrl(base64Content)
    };
    if (sha) body.sha = sha;
    await gitFetch('PUT', repoPath, body);
  }

  function parseGalleryData(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.photos && Array.isArray(data.photos)) return data.photos;
    return [];
  }

  function parseAlbumsData(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.albums && Array.isArray(data.albums)) return data.albums;
    return [];
  }

  let gallerySha = null;
  let albumsSha = null;

  async function loadGalleryFromPublicJson() {
    if (typeof window.loadJson === 'function') {
      try {
        const data = await window.loadJson(GALLERY_PATH);
        if (data) {
          const list = parseGalleryData(data).map(toAdminPhoto);
          if (list.length) return list;
        }
      } catch (e) {
        console.warn('loadJson failed:', e);
      }
    }

    const urls = [
      'https://raw.githubusercontent.com/idkkkkk123/PhotoPortfolio/main/photos/gallery.json',
      '/photos/gallery.json',
      '../photos/gallery.json'
    ];
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i] + '?_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        const list = parseGalleryData(data).map(toAdminPhoto);
        if (list.length) return list;
      } catch (e) {
        console.warn('Public gallery load failed:', urls[i], e);
      }
    }
    return [];
  }

  async function loadGallery() {
    let photos = [];
    try {
      const result = await gitGetJson(GALLERY_PATH);
      gallerySha = result.sha;
      photos = parseGalleryData(result.data).map(toAdminPhoto);
    } catch (gitErr) {
      console.warn('Git Gateway load failed:', gitErr.message);
    }
    if (!photos.length) {
      photos = await loadGalleryFromPublicJson();
    }
    if (!photos.length) {
      try {
        const response = await fetch('/.netlify/functions/load-photos', { cache: 'no-store' });
        const data = await response.json();
        if (data.success) photos = (data.photos || []).map(toAdminPhoto);
      } catch (e) {
        console.warn('Server load failed:', e);
      }
    }
    return photos;
  }

  async function saveGallery(photos) {
    const payload = { photos: photos.map(toStoredPhoto) };
    try {
      if (!gallerySha) {
        const current = await gitGetJson(GALLERY_PATH);
        gallerySha = current.sha;
      }
      await gitPutJson(
        GALLERY_PATH,
        payload,
        'Admin: update gallery (' + payload.photos.length + ' photos)',
        gallerySha
      );
      const after = await gitGetJson(GALLERY_PATH);
      gallerySha = after.sha;
      return { success: true };
    } catch (gitErr) {
      console.warn('Git Gateway save failed, trying server:', gitErr.message);
      const response = await fetch('/.netlify/functions/save-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(
          gitErr.message +
            ' Or add GITHUB_TOKEN in Netlify environment variables (see NETLIFY_SETUP.md).'
        );
      }
      return data;
    }
  }

  async function uploadFilesViaGit(files) {
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const safeName = String(f.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
      const repoPath = 'photos/uploads/' + (f.id || Date.now() + '-' + i) + '-' + safeName;
      const base64 = stripDataUrl(f.dataUrl || f.dataBase64 || '');

      let existingSha = null;
      const existing = await gitFetch('GET', repoPath);
      if (existing && existing.sha) existingSha = existing.sha;

      await gitPutBinary(
        repoPath,
        base64,
        'Admin: upload ' + safeName,
        existingSha
      );

      uploaded.push({
        id: f.id,
        name: f.name,
        src: '/' + repoPath,
        size: f.size || 0,
        uploadedAt: new Date().toISOString()
      });
    }
    return uploaded;
  }

  async function uploadFiles(files) {
    try {
      return await uploadFilesViaGit(files);
    } catch (gitErr) {
      console.warn('Git Gateway upload failed, trying server:', gitErr.message);
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
      if (!data.success) {
        throw new Error(
          gitErr.message +
            ' Enable Git Gateway (Identity → Services), or set GITHUB_TOKEN on Netlify.'
        );
      }
      return data.files || [];
    }
  }

  async function loadAlbums() {
    try {
      const result = await gitGetJson(ALBUMS_PATH);
      albumsSha = result.sha;
      return parseAlbumsData(result.data);
    } catch (gitErr) {
      try {
        const response = await fetch('/.netlify/functions/load-albums', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.success) return data.albums || [];
        }
      } catch (fnErr) {
        console.warn('Server load-albums failed:', fnErr);
      }
      
      if (typeof window.loadJson === 'function') {
        const data = await window.loadJson(ALBUMS_PATH);
        if (data) return parseAlbumsData(data);
      }
      return [];
    }
  }

  async function saveAlbums(albums) {
    const payload = { albums: albums };
    try {
      if (!albumsSha) {
        const current = await gitGetJson(ALBUMS_PATH);
        albumsSha = current.sha;
      }
      await gitPutJson(
        ALBUMS_PATH,
        payload,
        'Admin: update albums (' + albums.length + ')',
        albumsSha
      );
      const after = await gitGetJson(ALBUMS_PATH);
      albumsSha = after.sha;
      return { success: true };
    } catch (gitErr) {
      const response = await fetch('/.netlify/functions/save-albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.success) throw new Error(gitErr.message);
      return data;
    }
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
