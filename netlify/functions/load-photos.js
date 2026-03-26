const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // GitHub API configuration
    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = 'idkkkkk123';
    const repoName = 'PhotoPortfolio';
    const filePath = 'data/gallery.json';
    
    if (!githubToken) {
      console.log('No GitHub token found, returning empty array');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, photos: [] })
      };
    }
    
    // Get file content from GitHub
    const fileData = await getFileContent(githubToken, repoOwner, repoName, filePath);
    
    if (fileData && fileData.content) {
      // Decode base64 content
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      const photos = JSON.parse(content);
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          photos: photos,
          sha: fileData.sha
        })
      };
    } else {
      // File doesn't exist or is empty
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, photos: [] })
      };
    }
    
  } catch (error) {
    console.error('Load error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        photos: []
      })
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
          console.log('GitHub API response:', res.statusCode, data);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('GitHub API request error:', error);
      resolve(null);
    });
    
    req.end();
  });
}
