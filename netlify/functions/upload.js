const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');

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
    const uploadedFiles = await parseMultipartFormData(event);
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No files provided' }) };
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', 'photos', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const resultFiles = [];
    
    // Process each uploaded file
    for (const file of uploadedFiles) {
      const filename = file.filename || `upload-${Date.now()}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Write file to uploads directory
      fs.writeFileSync(filepath, file.content, 'binary');
      
      // Return file info for gallery/album storage
      resultFiles.push({
        name: filename,
        originalName: file.originalFilename || filename,
        path: `/photos/uploads/${filename}`,
        size: file.content.length,
        type: file.contentType || 'image/jpeg'
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        files: resultFiles,
        message: `Successfully uploaded ${resultFiles.length} files`
      })
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Parse multipart form data using Busboy
async function parseMultipartFormData(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'];
    const body = Buffer.from(event.body, 'base64');
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(new Error('Expected multipart form data'));
      return;
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } });
    const files = [];
    
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const fileData = [];
      file.on('data', (data) => {
        fileData.push(data);
      });
      
      file.on('end', () => {
        files.push({
          filename: filename,
          originalFilename: filename,
          content: Buffer.concat(fileData),
          contentType: mimetype
        });
      });
    });
    
    busboy.on('finish', () => {
      resolve({ files });
    });
    
    busboy.on('error', (error) => {
      reject(error);
    });
    
    busboy.end(body);
  });
}
