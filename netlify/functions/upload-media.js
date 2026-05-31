const { getFile, putFile, corsHeaders, getToken } = require('./lib/github-repo');

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
        body: JSON.stringify({ success: false, error: 'GITHUB_TOKEN not configured on Netlify' })
      };
    }

    const body = JSON.parse(event.body);
    const files = body.files || [];
    const uploaded = [];

    for (const file of files) {
      const safeName = String(file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `photos/uploads/${file.id || Date.now()}-${safeName}`;
      const base64 = String(file.dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
      const existing = await getFile(token, path);
      await putFile(
        token,
        path,
        Buffer.from(base64, 'base64'),
        `Upload ${safeName}`,
        existing ? existing.sha : undefined,
        true
      );
      uploaded.push({
        id: file.id,
        name: file.name,
        src: `/${path}`,
        size: file.size || 0,
        uploadedAt: new Date().toISOString()
      });
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, files: uploaded })
    };
  } catch (error) {
    console.error('upload-media:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
