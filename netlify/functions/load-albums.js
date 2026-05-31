const { getFile, corsHeaders, getToken } = require('./lib/github-repo');

const FILE_PATH = 'photos/albums.json';

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  try {
    const token = getToken();
    if (!token) {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true, albums: [] })
      };
    }

    const file = await getFile(token, FILE_PATH);
    let albums = [];
    if (file && file.content) {
      const parsed = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
      if (Array.isArray(parsed)) albums = parsed;
      else if (parsed && Array.isArray(parsed.albums)) albums = parsed.albums;
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, albums })
    };
  } catch (error) {
    console.error('load-albums:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, albums: [], error: error.message })
    };
  }
};
