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
        
        // Save file to uploads directory
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filePath = path.join(uploadsDir, uniqueFilename);
        fs.writeFileSync(filePath, Buffer.from(fileData, 'binary'));
        
        // Create public URL
        const publicUrl = `/uploads/${uniqueFilename}`;
        
        uploadedFiles.push({
          id: timestamp.toString(),
          name: filename,
          src: publicUrl,
          size: fileData.length,
          type: filename.split('.').pop().toLowerCase(),
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
