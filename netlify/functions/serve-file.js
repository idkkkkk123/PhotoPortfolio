const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  try {
    // Serve files from uploads directory
    const filePath = event.path.replace('/photos/uploads/', '');
    const uploadsDir = path.join(__dirname, '..', 'photos', 'uploads');
    const fullPath = path.join(uploadsDir, filePath);

    // Security check - only allow image files
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const fileExtension = path.extname(fullPath).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return { statusCode: 403, headers, body: 'File type not allowed' };
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return { statusCode: 404, headers, body: 'File not found' };
    }

    // Read file
    const fileContent = fs.readFileSync(fullPath);
    const contentType = getContentType(fileExtension);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      },
      body: fileContent.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Serve file error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function getContentType(extension) {
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  return contentTypes[extension] || 'image/jpeg';
}
