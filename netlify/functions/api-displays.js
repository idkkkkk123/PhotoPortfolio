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

    const path = event.path.replace(/^\/\.netlify\/functions\/api-displays\/?/, '');
    const segments = path.split('/').filter(Boolean);

    // GET / — list all displays
    if (event.httpMethod === 'GET' && segments.length === 0) {
      const displays = await sql`
        SELECT id, name, data, exported_image, created_at, last_modified
        FROM displays WHERE user_id = ${user.id}
        ORDER BY last_modified DESC
      `;

      const result = displays.map(d => ({
        id: d.id,
        name: d.name,
        pages: d.data.pages || [],
        exportedImage: d.exported_image,
        createdDate: d.created_at,
        lastModified: d.last_modified
      }));

      return respond(200, { displays: result });
    }

    // GET /:id — get single display
    if (event.httpMethod === 'GET' && segments.length === 1) {
      const displayId = segments[0];
      const result = await sql`
        SELECT id, name, data, exported_image, created_at, last_modified
        FROM displays WHERE id = ${displayId} AND user_id = ${user.id}
      `;

      if (result.length === 0) return respond(404, { error: 'Display not found' });

      const d = result[0];
      return respond(200, {
        display: {
          id: d.id,
          name: d.name,
          pages: d.data.pages || [],
          exportedImage: d.exported_image,
          createdDate: d.created_at,
          lastModified: d.last_modified
        }
      });
    }

    // POST / — create or update display
    if (event.httpMethod === 'POST' && segments.length === 0) {
      const body = JSON.parse(event.body);
      const id = body.id || (Date.now().toString() + Math.random().toString(36).substr(2, 9));
      const name = body.name || 'Untitled Collage';
      const data = { pages: body.pages || [] };
      const exportedImage = body.exportedImage || null;

      await sql`
        INSERT INTO displays (id, user_id, name, data, exported_image)
        VALUES (${id}, ${user.id}, ${name}, ${JSON.stringify(data)}, ${exportedImage})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          data = EXCLUDED.data,
          exported_image = EXCLUDED.exported_image,
          last_modified = NOW()
      `;

      return respond(201, {
        display: { id, name, pages: data.pages, exportedImage, lastModified: new Date().toISOString() }
      });
    }

    // DELETE /:id — delete display
    if (event.httpMethod === 'DELETE' && segments.length === 1) {
      const displayId = segments[0];
      await sql`DELETE FROM displays WHERE id = ${displayId} AND user_id = ${user.id}`;
      return respond(200, { success: true });
    }

    return respond(404, { error: 'Not found' });
  } catch (err) {
    console.error('Displays error:', err);
    return respond(500, { error: 'Server error. Please try again.' });
  }
};
