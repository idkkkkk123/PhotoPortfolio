const { getFile, putFile, corsHeaders, getToken } = require('./lib/github-repo');

const FILE_PATH = 'photos/albums.json';

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
          error: 'GITHUB_TOKEN is not set in Netlify environment variables.'
        })
      };
    }

    const body = JSON.parse(event.body);
    const albums = Array.isArray(body) ? body : (body.albums || []);
    const file = await getFile(token, FILE_PATH);
    const payload = JSON.stringify({ albums }, null, 2);
    await putFile(
      token,
      FILE_PATH,
      payload,
      `Admin: update albums (${albums.length})`,
      file ? file.sha : undefined
    );

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, count: albums.length })
    };
  } catch (error) {
    console.error('save-albums:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
