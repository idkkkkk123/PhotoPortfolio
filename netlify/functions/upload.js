const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the multipart form data
    const body = event.body;
    const contentType = event.headers['content-type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return { statusCode: 400, body: 'Content-Type must be multipart/form-data' };
    }

    // For now, we'll use a simple approach with base64 encoded files
    const parsedBody = JSON.parse(event.body);
    
    if (!parsedBody.files || !Array.isArray(parsedBody.files)) {
      return { statusCode: 400, body: 'No files provided' };
    }

    const uploadedFiles = [];
    
    for (const file of parsedBody.files) {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}_${randomString}_${file.name}`;
      const filePath = path.join('/tmp', filename);
      
      // Decode base64 and save file
      const buffer = Buffer.from(file.data, 'base64');
      fs.writeFileSync(filePath, buffer);
      
      // Read the file back to get the data URL for display
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = file.type || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      uploadedFiles.push({
        id: timestamp + '_' + randomString,
        name: file.name,
        src: dataUrl,
        size: file.size,
        type: mimeType,
        uploadedAt: new Date().toISOString()
      });
      
      // Clean up temp file
      fs.unlinkSync(filePath);
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
