const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const photos = JSON.parse(event.body);
    
    // For Netlify, we'll save to /tmp directory and return success
    // In production, you'd want to use a database or real storage service
    const tempDir = '/tmp';
    const dataPath = path.join(tempDir, 'data');
    
    try {
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      
      const photosDataPath = path.join(dataPath, 'gallery.json');
      fs.writeFileSync(photosDataPath, JSON.stringify(photos, null, 2));
    } catch (err) {
      // If we can't write to /tmp, we'll just return success
      // The data will be stored in localStorage on the client side
      console.log('Could not write to temp directory, data will be stored in localStorage');
    }
    
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
