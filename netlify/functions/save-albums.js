const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  try {
    const { albums } = JSON.parse(event.body);
    
    // Ensure photos directory exists
    const photosDir = path.join(__dirname, '..', 'photos');
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
    }

    // Read existing albums data
    const albumsPath = path.join(photosDir, 'albums.json');
    let albumsData = { albums: [] };
    
    if (fs.existsSync(albumsPath)) {
      const existingData = fs.readFileSync(albumsPath, 'utf8');
      albumsData = JSON.parse(existingData);
    }

    // Update albums data
    albumsData.albums = albums || [];
    
    // Save updated albums data
    fs.writeFileSync(albumsPath, JSON.stringify(albumsData, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        albums: albumsData.albums,
        message: 'Albums updated successfully'
      })
    };

  } catch (error) {
    console.error('Save albums error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
