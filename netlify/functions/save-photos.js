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
    const dataPath = path.join('/tmp', 'photos.json');
    fs.writeFileSync(dataPath, JSON.stringify(photos, null, 2));
    
    // Read it back to confirm
    const savedData = fs.readFileSync(dataPath, 'utf8');
    
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
