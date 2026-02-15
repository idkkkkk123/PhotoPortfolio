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

    const path = getSubpath(event, 'api-albums');
    const segments = path.split('/').filter(Boolean);

    // GET / — list all albums with their photos
    if (event.httpMethod === 'GET' && segments.length === 0) {
      const albums = await sql`
        SELECT id, name, created_at, updated_at
        FROM albums WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;

      // Fetch photos for each album
      const result = [];
      for (const album of albums) {
        const photos = await sql`
          SELECT p.id, p.name, p.src
          FROM album_photos ap
          JOIN photos p ON p.id = ap.photo_id
          WHERE ap.album_id = ${album.id}
          ORDER BY ap.added_at DESC
        `;
        result.push({
          id: album.id,
          name: album.name,
          photos: photos,
          createdAt: album.created_at,
          updatedAt: album.updated_at
        });
      }

      return respond(200, { albums: result });
    }

    // POST / — create album
    if (event.httpMethod === 'POST' && segments.length === 0) {
      let body = {};
      try { body = event.body ? JSON.parse(event.body) : {}; } catch(e) { body = {}; }
      const id = body.id || (Date.now().toString() + Math.random().toString(36).substr(2, 9));
      const name = body.name || 'Untitled Folder';

      await sql`
        INSERT INTO albums (id, user_id, name)
        VALUES (${id}, ${user.id}, ${name})
      `;

      return respond(201, { album: { id, name, photos: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
    }

    // PUT /:id — rename album
    if (event.httpMethod === 'PUT' && segments.length === 1) {
      const albumId = segments[0];
      let body = {};
      try { body = event.body ? JSON.parse(event.body) : {}; } catch(e) { body = {}; }

      await sql`
        UPDATE albums SET name = ${body.name}, updated_at = NOW()
        WHERE id = ${albumId} AND user_id = ${user.id}
      `;

      return respond(200, { success: true });
    }

    // DELETE /:id — delete album
    if (event.httpMethod === 'DELETE' && segments.length === 1) {
      const albumId = segments[0];
      await sql`DELETE FROM albums WHERE id = ${albumId} AND user_id = ${user.id}`;
      return respond(200, { success: true });
    }

    // POST /:id/photos — add photos to album
    if (event.httpMethod === 'POST' && segments.length === 2 && segments[1] === 'photos') {
      const albumId = segments[0];
      let body = {};
      try { body = event.body ? JSON.parse(event.body) : {}; } catch(e) { body = {}; }
      const photoIds = body.photoIds || [];

      for (const photoId of photoIds) {
        await sql`
          INSERT INTO album_photos (album_id, photo_id)
          VALUES (${albumId}, ${photoId})
          ON CONFLICT DO NOTHING
        `;
      }

      return respond(200, { success: true });
    }

    // DELETE /:id/photos/:photoId — remove photo from album
    if (event.httpMethod === 'DELETE' && segments.length === 3 && segments[1] === 'photos') {
      const albumId = segments[0];
      const photoId = segments[2];

      await sql`
        DELETE FROM album_photos
        WHERE album_id = ${albumId} AND photo_id = ${photoId}
      `;

      return respond(200, { success: true });
    }

    return respond(404, { error: 'Not found' });
  } catch (err) {
    console.error('Albums error:', err);
    return respond(500, { error: 'Server error: ' + (err.message || 'Unknown') });
  }
};
