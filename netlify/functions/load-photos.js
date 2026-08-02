const https = require('https');
const { getFile, corsHeaders, getToken } = require('./lib/github-repo');

const FILE_PATH = 'photos/gallery.json';
const PUBLIC_GALLERY_URLS = [
  'https://photoportfolioweb.netlify.app/photos/gallery.json',
  'https://raw.githubusercontent.com/idkkkkk123/PhotoPortfolio/main/photos/gallery.json'
];

function fetchJsonFromUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'PhotoPortfolio-App' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Request failed (${res.statusCode}) for ${url}`));
          return;
        }
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
  });
}

async function loadGalleryFromPublicUrls() {
  for (const url of PUBLIC_GALLERY_URLS) {
    try {
      const parsed = await fetchJsonFromUrl(url);
      if (parsed && (Array.isArray(parsed) || (parsed.photos && Array.isArray(parsed.photos)))) {
        return parsed;
      }
    } catch (error) {
      console.warn('Public gallery fetch failed:', url, error.message);
    }
  }
  return null;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  try {
    const publicData = await loadGalleryFromPublicUrls();
    let photos = [];
    if (publicData) {
      if (Array.isArray(publicData)) photos = publicData;
      else if (publicData && Array.isArray(publicData.photos)) photos = publicData.photos;
    }

    if (!photos.length) {
      const token = getToken();
      const file = await getFile(token, FILE_PATH);
      if (file && file.content) {
        const parsed = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
        if (Array.isArray(parsed)) photos = parsed;
        else if (parsed && Array.isArray(parsed.photos)) photos = parsed.photos;
      }
    }

    const normalized = photos.map(normalizePhoto);
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, photos: normalized, sha: null })
    };
  } catch (error) {
    console.error('load-photos:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, photos: [], error: error.message })
    };
  }
};

function normalizePhoto(p) {
  return {
    id: p.id || String(Date.now()),
    name: p.name || p.title || 'Untitled',
    src: p.src || p.image || '',
    date: p.date || p.uploadedAt || new Date().toISOString(),
    description: p.description || ''
  };
}
