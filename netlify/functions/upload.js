exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Simple approach: parse the FormData manually
    const contentType = event.headers['content-type'];
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Content-Type must be multipart/form-data' }) };
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'No boundary found' }) };
    }

    const uploadedFiles = [];
    const parts = body.split('--' + boundary);
    
    for (const part of parts) {
      // Skip empty parts and the final boundary
      if (!part || part.trim() === '--' || !part.includes('filename=')) {
        continue;
      }

      // Extract filename
      const filenameMatch = part.match(/filename="([^"]+)"/);
      if (!filenameMatch) continue;
      
      const filename = filenameMatch[1];
      if (!filename) continue; // Skip empty filenames
      
      // Find the start of the file data (after headers)
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      
      // Extract file data
      const fileData = part.substring(headerEnd + 4);
      
      // Remove trailing boundary and newlines
      const dataEnd = fileData.indexOf('\r\n--' + boundary);
      const cleanData = dataEnd > 0 ? fileData.substring(0, dataEnd) : fileData;
      
      // Get the actual binary data
      const binaryData = Buffer.from(cleanData, 'binary');
      
      // Determine MIME type
      const extension = filename.split('.').pop().toLowerCase();
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml'
      };
      
      const mimeType = mimeTypes[extension] || 'image/jpeg';
      
      // Create proper base64 data URL
      const base64Data = binaryData.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      uploadedFiles.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: filename,
        src: dataUrl,
        size: binaryData.length,
        type: mimeType,
        uploadedAt: new Date().toISOString()
      });
    }

    if (uploadedFiles.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'No valid files found' }) };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        files: uploadedFiles
      })
    };

  } catch (error) {
    console.error('Upload error:', error);
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
