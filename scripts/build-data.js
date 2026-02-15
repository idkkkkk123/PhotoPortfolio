/**
 * Static site data builder.
 * Run this when you add or remove images:  node scripts/build-data.js
 * Scans images/ and albums/* and writes data/gallery.json and data/albums.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');
const ALBUMS_DIR = path.join(ROOT, 'albums');
const DATA_DIR = path.join(ROOT, 'data');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

function toWebPath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getImagesInDir(dir, basePath) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (IMAGE_EXT.has(ext)) {
        const relative = path.relative(ROOT, path.join(dir, e.name));
        out.push({ src: toWebPath(relative), name: e.name });
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Gallery: all images in images/
function buildGallery() {
  const images = getImagesInDir(IMAGES_DIR, ROOT);
  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, 'gallery.json'),
    JSON.stringify({ images }, null, 2),
    'utf8'
  );
  console.log('Gallery: %d images → data/gallery.json', images.length);
}

// Albums: each subfolder of albums/ is one album
function buildAlbums() {
  const albums = [];
  if (!fs.existsSync(ALBUMS_DIR)) {
    ensureDir(DATA_DIR);
    fs.writeFileSync(path.join(DATA_DIR, 'albums.json'), JSON.stringify({ albums: [] }, null, 2), 'utf8');
    console.log('Albums: 0 albums → data/albums.json');
    return;
  }

  const dirs = fs.readdirSync(ALBUMS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const d of dirs) {
    const albumPath = path.join(ALBUMS_DIR, d.name);
    const images = getImagesInDir(albumPath, ROOT).map(img => img.src);
    const name = d.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    albums.push({ id: d.name, name, images });
  }

  ensureDir(DATA_DIR);
  fs.writeFileSync(
    path.join(DATA_DIR, 'albums.json'),
    JSON.stringify({ albums }, null, 2),
    'utf8'
  );
  console.log('Albums: %d albums → data/albums.json', albums.length);
}

ensureDir(IMAGES_DIR);
ensureDir(ALBUMS_DIR);
buildGallery();
buildAlbums();
