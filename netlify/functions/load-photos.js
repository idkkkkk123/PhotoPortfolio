const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Try to read from data file
    const dataPath = path.join(__dirname, '../../data');
    const photosDataPath = path.join(dataPath, 'gallery.json');
    
    let photos = [];
    if (fs.existsSync(photosDataPath)) {
      const data = fs.readFileSync(photosDataPath, 'utf8');
      photos = JSON.parse(data);
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
