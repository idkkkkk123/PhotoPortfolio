const { getDb, initDb } = require('./db');
const { getUserFromEvent, respond, corsHeaders, unauthorized } = require('./auth');

function getSubpath(event, functionName) {
  const raw = event.path || '';
  const pattern = new RegExp(`^/\\.netlify/functions/${functionName}/?`);
  return raw.replace(pattern, '').replace(/^\/+/, '');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    await initDb();
    const sql = getDb();
    const user = getUserFromEvent(event);
    if (!user) return unauthorized();

    const path = getSubpath(event, 'api-portfolio');
    const segments = path.split('/').filter(Boolean);

    // GET / — list all portfolio items
    if (event.httpMethod === 'GET' && segments.length === 0) {
      const items = await sql`
        SELECT id, display_id, title, description, thumbnail, created_at
        FROM portfolio WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;

      const result = items.map(i => ({
        id: i.id,
        displayId: i.display_id,
        title: i.title,
        description: i.description,
        thumbnail: i.thumbnail,
        createdAt: i.created_at
      }));

      return respond(200, { items: result });
    }

    // POST / — add portfolio item
    if (event.httpMethod === 'POST' && segments.length === 0) {
      let body = {};
      try { body = event.body ? JSON.parse(event.body) : {}; } catch(e) { body = {}; }
      const id = body.id || (Date.now().toString() + Math.random().toString(36).substr(2, 9));

      await sql`
        INSERT INTO portfolio (id, user_id, display_id, title, description, thumbnail)
        VALUES (${id}, ${user.id}, ${body.displayId || null}, ${body.title || 'Untitled'}, ${body.description || ''}, ${body.thumbnail || ''})
      `;

      return respond(201, {
        item: {
          id,
          displayId: body.displayId,
          title: body.title || 'Untitled',
          description: body.description || '',
          thumbnail: body.thumbnail,
          createdAt: new Date().toISOString()
        }
      });
    }

    // DELETE /:id — delete portfolio item
    if (event.httpMethod === 'DELETE' && segments.length === 1) {
      const itemId = segments[0];
      await sql`DELETE FROM portfolio WHERE id = ${itemId} AND user_id = ${user.id}`;
      return respond(200, { success: true });
    }

    return respond(404, { error: 'Not found' });
  } catch (err) {
    console.error('Portfolio error:', err);
    return respond(500, { error: 'Server error: ' + (err.message || 'Unknown') });
  }
};
