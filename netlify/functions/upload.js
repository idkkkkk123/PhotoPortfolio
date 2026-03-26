const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;
    const contentType = event.headers['content-type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return { statusCode: 400, body: 'Content-Type must be multipart/form-data' };
    }

    // Parse multipart form data
    const boundary = contentType.split('boundary=')[1];
    const parts = body.split('--' + boundary);
    
    const uploadedFiles = [];
    
    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
        // Extract filename
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (!filenameMatch) continue;
        
        const filename = filenameMatch[1];
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}_${filename}`;
        
        // Extract file data
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        const fileData = part.substring(dataStart, dataEnd);
        
        // For Netlify, we'll store files in the /tmp directory and return base64 data
        // In production, you'd want to use a real storage service like AWS S3
        const tempDir = '/tmp';
        const filePath = path.join(tempDir, uniqueFilename);
        
        try {
          fs.writeFileSync(filePath, Buffer.from(fileData, 'binary'));
        } catch (err) {
          // If we can't write to /tmp, we'll just use base64 data
          console.log('Could not write to temp directory, using base64');
        }
        
        // Create a data URL for the image (this will be stored in localStorage for now)
        const mimeType = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp'
        };
        
        const base64Data = Buffer.from(fileData, 'binary').toString('base64');
        const dataUrl = `data:${mimeTypes[mimeType] || 'image/jpeg'};base64,${base64Data}`;
        
        uploadedFiles.push({
          id: timestamp.toString(),
          name: filename,
          src: dataUrl, // Using data URL for now
          size: fileData.length,
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
