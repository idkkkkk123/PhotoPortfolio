const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'visual-stories-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

function createToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getUserFromEvent(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  return verifyToken(token);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body)
  };
}

function unauthorized() {
  return respond(401, { error: 'Unauthorized. Please log in.' });
}

module.exports = { createToken, verifyToken, getUserFromEvent, corsHeaders, respond, unauthorized };
