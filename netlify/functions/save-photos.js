const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const photos = JSON.parse(event.body);
    
    // GitHub API configuration
    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = 'idkkkkk123';
    const repoName = 'PhotoPortfolio';
    const filePath = 'data/gallery.json';
    
    if (!githubToken) {
      console.log('No GitHub token found, using localStorage fallback');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, message: 'No GitHub token configured' })
      };
    }
    
    // Get current file content
    const currentFile = await getFileContent(githubToken, repoOwner, repoName, filePath);
    let currentSha = currentFile ? currentFile.sha : null;
    
    // Prepare file content
    const fileContent = JSON.stringify(photos, null, 2);
    const contentBase64 = Buffer.from(fileContent).toString('base64');
    
    // Create or update file
    const result = await updateFile(githubToken, repoOwner, repoName, filePath, contentBase64, currentSha);
    
    if (result.success) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          message: 'Photos saved to GitHub successfully',
          count: photos.length,
          sha: result.sha
        })
      };
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Save error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

function getFileContent(token, owner, repo, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${owner}/${repo}/contents/${path}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'PhotoPortfolio-App'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        } else if (res.statusCode === 404) {
          resolve(null); // File doesn't exist
        } else {
          resolve(null);
        }
      });
    });
    
    req.on('error', () => resolve(null));
    req.end();
  });
}

function updateFile(token, owner, repo, path, content, sha) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      message: `Update gallery photos - ${new Date().toISOString()}`,
      content: content,
      sha: sha
    });
    
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${owner}/${repo}/contents/${path}`,
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'PhotoPortfolio-App'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            resolve({ success: true, sha: result.content.sha });
          } catch (e) {
            resolve({ success: false, error: 'Invalid response' });
          }
        } else {
          resolve({ success: false, error: `GitHub API error: ${res.statusCode}` });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    req.write(body);
    req.end();
  });
}
