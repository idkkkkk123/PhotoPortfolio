const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Try to read from temp directory first
    const tempDir = '/tmp';
    const dataPath = path.join(tempDir, 'data');
    const photosDataPath = path.join(dataPath, 'gallery.json');
    
    let photos = [];
    
    try {
      if (fs.existsSync(photosDataPath)) {
        const data = fs.readFileSync(photosDataPath, 'utf8');
        photos = JSON.parse(data);
      }
    } catch (err) {
      // If we can't read from temp directory, return empty array
      // The client will use localStorage as fallback
      console.log('Could not read from temp directory, using localStorage fallback');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        photos: photos
      })
    };

  } catch (error) {
    console.error('Load error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        photos: []
      })
    };
  }
};
