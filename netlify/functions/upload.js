const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Handle FormData upload
    const contentType = event.headers['content-type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return { statusCode: 400, body: 'Content-Type must be multipart/form-data' };
    }

    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8');
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      return { statusCode: 400, body: 'Invalid boundary in Content-Type' };
    }
    
    const uploadedFiles = [];
    const parts = body.toString().split('--' + boundary);
    
    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
        // Extract filename
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (!filenameMatch) continue;
        
        const filename = filenameMatch[1];
        const timestamp = Date.now();
        
        // Extract file data - look for the end of headers and start of data
        const headerEndIndex = part.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) continue;
        
        const fileData = part.substring(headerEndIndex + 4);
        
        // Remove any trailing boundary markers
        const dataEndIndex = fileData.lastIndexOf('\r\n');
        const cleanData = dataEndIndex > 0 ? fileData.substring(0, dataEndIndex) : fileData;
        
        // Get MIME type
        const mimeType = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp'
        };
        
        // Create base64 data URL
        const base64Data = Buffer.from(cleanData, 'binary').toString('base64');
        const dataUrl = `data:${mimeTypes[mimeType] || 'image/jpeg'};base64,${base64Data}`;
        
        uploadedFiles.push({
          id: timestamp.toString(),
          name: filename,
          src: dataUrl,
          size: cleanData.length,
          type: mimeType,
          uploadedAt: new Date().toISOString()
        });
      }
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
