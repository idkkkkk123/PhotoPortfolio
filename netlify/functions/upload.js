exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const uploadedFiles = [];
    
    for (const fileData of body.files) {
      uploadedFiles.push({
        id: fileData.id,
        name: fileData.name,
        src: fileData.dataUrl,
        size: fileData.size,
        type: fileData.type,
        uploadedAt: new Date().toISOString()
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, files: uploadedFiles })
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
