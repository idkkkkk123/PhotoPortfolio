const { getFile, putFile, corsHeaders, getToken } = require('./lib/github-repo');

const FILE_PATH = 'photos/gallery.json';

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  try {
    const token = getToken();
    if (!token) {
      return {
        statusCode: 503,
        headers: corsHeaders(),
        body: JSON.stringify({
          success: false,
          error: 'Netlify is missing GITHUB_TOKEN. Add it in Site configuration → Environment variables, then redeploy.'
        })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const targetPath = body.path || FILE_PATH;

    if (targetPath === 'photos/portfolio.json') {
      const items = Array.isArray(body.content && body.content.items)
        ? body.content.items
        : (Array.isArray(body.items) ? body.items : []);
      const normalizedItems = items.map((item, index) => ({
        id: item.id || String(Date.now() + Math.random()),
        title: item.title || '',
        description: item.description || '',
        src: item.src || '',
        createdAt: item.createdAt || new Date().toISOString(),
        order: item.order != null ? item.order : index,
        layout: item.layout || (index % 2 === 0 ? 'wide' : 'stacked'),
        accent: item.accent || '#18181b'
      }));

      const file = await getFile(token, targetPath);
      const payload = JSON.stringify({ items: normalizedItems }, null, 2);
      await putFile(
        token,
        targetPath,
        payload,
        `Admin: update portfolio (${normalizedItems.length} items)`,
        file ? file.sha : undefined
      );

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true, count: normalizedItems.length })
      };
    }

    let photos = Array.isArray(body) ? body : (body.photos || []);
    photos = photos.map((p) => ({
      id: p.id || String(Date.now() + Math.random()),
      name: p.name || p.title || 'Untitled',
      src: p.src || p.image || '',
      date: p.date || p.uploadedAt || new Date().toISOString(),
      description: p.description || ''
    }));

    const file = await getFile(token, FILE_PATH);
    const payload = JSON.stringify({ photos }, null, 2);
    await putFile(
      token,
      FILE_PATH,
      payload,
      `Admin: update gallery (${photos.length} photos)`,
      file ? file.sha : undefined
    );

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, count: photos.length })
    };
  } catch (error) {
    console.error('save-photos:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
