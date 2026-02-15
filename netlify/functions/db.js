const { neon } = require('@neondatabase/serverless');

let sql;
let _schemaReady = false;

function getDb() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

async function initDb() {
  // Only run schema creation once per cold start
  if (_schemaReady) return;

  const db = getDb();

  // Run all CREATE TABLE IF NOT EXISTS in a single batch
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS photos (
      id VARCHAR(100) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(500) DEFAULT 'Untitled',
      src TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      fit_mode VARCHAR(20) DEFAULT 'contain',
      date TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS albums (
      id VARCHAR(100) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(500) DEFAULT 'Untitled Folder',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_albums_user ON albums(user_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS album_photos (
      album_id VARCHAR(100) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      photo_id VARCHAR(100) NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      added_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (album_id, photo_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS displays (
      id VARCHAR(100) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(500) DEFAULT 'Untitled Collage',
      data JSONB NOT NULL DEFAULT '{}',
      exported_image TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      last_modified TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_displays_user ON displays(user_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS portfolio (
      id VARCHAR(100) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      display_id VARCHAR(100),
      title VARCHAR(500) DEFAULT 'Untitled',
      description TEXT DEFAULT '',
      thumbnail TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id)`;

  _schemaReady = true;
  return true;
}

module.exports = { getDb, initDb };
