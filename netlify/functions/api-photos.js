const { getDb, initDb } = require('./db');
const { getUserFromEvent, respond, corsHeaders, unauthorized } = require('./auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    await initDb();
    const sql = getDb();
    const user = getUserFromEvent(event);
    if (!user) return unauthorized();

    const path = event.path.replace(/^\/\.netlify\/functions\/api-photos\/?/, '');

    // GET / — list all photos for user
    if (event.httpMethod === 'GET' && !path) {
      const photos = await sql`
        SELECT id, name, src, size, fit_mode, date, created_at
        FROM photos WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;
      return respond(200, { photos });
    }

    // POST / — create photo(s)
    if (event.httpMethod === 'POST' && !path) {
      const body = JSON.parse(event.body);
      const photos = Array.isArray(body.photos) ? body.photos : [body];
      const created = [];

      for (const p of photos) {
        if (!p.src) continue;
        const id = p.id || (Date.now().toString() + Math.random().toString(36).substr(2, 9));
        const result = await sql`
          INSERT INTO photos (id, user_id, name, src, size, fit_mode, date)
          VALUES (${id}, ${user.id}, ${p.name || 'Untitled'}, ${p.src}, ${p.size || 0}, ${p.fitMode || 'contain'}, ${p.date || new Date().toISOString()})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, src = EXCLUDED.src, size = EXCLUDED.size,
            fit_mode = EXCLUDED.fit_mode
          RETURNING id, name, src, size, fit_mode, date, created_at
        `;
        created.push(result[0]);
      }

      return respond(201, { photos: created });
    }

    // DELETE /:id — delete a photo
    if (event.httpMethod === 'DELETE' && path) {
      const photoId = path;
      await sql`DELETE FROM photos WHERE id = ${photoId} AND user_id = ${user.id}`;
      return respond(200, { success: true });
    }

    return respond(404, { error: 'Not found' });
  } catch (err) {
    console.error('Photos error:', err);
    return respond(500, { error: 'Server error. Please try again.' });
  }
};
