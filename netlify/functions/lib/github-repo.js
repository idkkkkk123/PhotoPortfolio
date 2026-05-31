const https = require('https');

const REPO_OWNER = 'idkkkkk123';
const REPO_NAME = 'PhotoPortfolio';

function githubRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getFile(token, path) {
  const { statusCode, data } = await githubRequest({
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    method: 'GET',
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': 'PhotoPortfolio-App',
      Accept: 'application/vnd.github.v3+json'
    }
  });
  if (statusCode === 200) {
    return JSON.parse(data);
  }
  if (statusCode === 404) return null;
  throw new Error(`GitHub GET ${path}: ${statusCode}`);
}

async function putFile(token, path, content, message, sha, isBinary) {
  const contentB64 = isBinary
    ? (Buffer.isBuffer(content) ? content : Buffer.from(content)).toString('base64')
    : Buffer.from(String(content), 'utf8').toString('base64');
  const body = JSON.stringify({
    message: message || `Update ${path}`,
    content: contentB64,
    sha: sha || undefined
  });
  const { statusCode, data } = await githubRequest({
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': 'PhotoPortfolio-App',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (statusCode === 200 || statusCode === 201) {
    return JSON.parse(data);
  }
  throw new Error(`GitHub PUT ${path}: ${statusCode} ${data}`);
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function getToken() {
  return process.env.GITHUB_TOKEN || '';
}

module.exports = { getFile, putFile, corsHeaders, getToken, REPO_OWNER, REPO_NAME };
