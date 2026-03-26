const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const photos = JSON.parse(event.body);
    
    // Create a data file to store photo metadata
    const dataPath = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    
    const photosDataPath = path.join(dataPath, 'gallery.json');
    fs.writeFileSync(photosDataPath, JSON.stringify(photos, null, 2));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Photos saved successfully',
        count: photos.length
      })
    };

  } catch (error) {
    console.error('Save error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
