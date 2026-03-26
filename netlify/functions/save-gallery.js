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
    const { photos } = JSON.parse(event.body);
    
    // Ensure photos directory exists
    const photosDir = path.join(__dirname, '..', 'photos');
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
    }

    // Read existing gallery data
    const galleryPath = path.join(photosDir, 'gallery.json');
    let galleryData = { photos: [] };
    
    if (fs.existsSync(galleryPath)) {
      const existingData = fs.readFileSync(galleryPath, 'utf8');
      galleryData = JSON.parse(existingData);
    }

    // Update gallery data
    galleryData.photos = photos || [];
    
    // Save updated gallery data
    fs.writeFileSync(galleryPath, JSON.stringify(galleryData, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        photos: galleryData.photos,
        message: 'Gallery updated successfully'
      })
    };

  } catch (error) {
    console.error('Save gallery error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
