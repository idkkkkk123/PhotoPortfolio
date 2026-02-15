const bcrypt = require('bcryptjs');
const { getDb, initDb } = require('./db');
const { createToken, respond, corsHeaders } = require('./auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    await initDb();
    const sql = getDb();
    const path = event.path.replace(/^\/\.netlify\/functions\/api-auth\/?/, '');
    const body = event.body ? JSON.parse(event.body) : {};

    // POST /signup
    if (event.httpMethod === 'POST' && path === 'signup') {
      const { username, email, password } = body;

      if (!username || !email || !password) {
        return respond(400, { error: 'Username, email, and password are required.' });
      }
      if (username.length < 3) {
        return respond(400, { error: 'Username must be at least 3 characters.' });
      }
      if (password.length < 6) {
        return respond(400, { error: 'Password must be at least 6 characters.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return respond(400, { error: 'Invalid email address.' });
      }

      // Check if user exists
      const existing = await sql`
        SELECT id FROM users WHERE email = ${email.toLowerCase()} OR username = ${username.toLowerCase()}
      `;
      if (existing.length > 0) {
        return respond(409, { error: 'Username or email already taken.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (username, email, password_hash)
        VALUES (${username.toLowerCase()}, ${email.toLowerCase()}, ${passwordHash})
        RETURNING id, username, email, created_at
      `;

      const user = result[0];
      const token = createToken(user);

      return respond(201, {
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    }

    // POST /login
    if (event.httpMethod === 'POST' && path === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return respond(400, { error: 'Email and password are required.' });
      }

      const result = await sql`
        SELECT id, username, email, password_hash FROM users WHERE email = ${email.toLowerCase()}
      `;
      if (result.length === 0) {
        return respond(401, { error: 'Invalid email or password.' });
      }

      const user = result[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return respond(401, { error: 'Invalid email or password.' });
      }

      const token = createToken(user);

      return respond(200, {
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    }

    // GET /me — verify token and return user info
    if (event.httpMethod === 'GET' && path === 'me') {
      const authHeader = event.headers.authorization || '';
      const tokenStr = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!tokenStr) return respond(401, { error: 'No token provided.' });

      const { verifyToken } = require('./auth');
      const decoded = verifyToken(tokenStr);
      if (!decoded) return respond(401, { error: 'Invalid or expired token.' });

      const result = await sql`
        SELECT id, username, email, created_at FROM users WHERE id = ${decoded.id}
      `;
      if (result.length === 0) return respond(401, { error: 'User not found.' });

      return respond(200, { user: result[0] });
    }

    return respond(404, { error: 'Not found' });
  } catch (err) {
    console.error('Auth error:', err);
    return respond(500, { error: 'Server error. Please try again.' });
  }
};
