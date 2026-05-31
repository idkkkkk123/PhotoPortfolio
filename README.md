# Photo Showcase (Netlify + GitHub + CMS)

Static photography site: visitors only view; admins edit content in Netlify CMS.

## Public site (read-only)

- `index.html` — home
- `gallery.html` — all photos
- `albums.html` — albums
- `portfolio.html` — featured work

## Admin (read/write)

- **https://photoportfolioweb.netlify.app/admin-bbpews098ge8ht4ez4xdeg/** — Netlify CMS (secret URL)
- `/admin/` redirects to the URL above

Full setup: **[NETLIFY_SETUP.md](./NETLIFY_SETUP.md)**

## Data files (edited by CMS, read by public pages)

| File | Admin collection | Public page |
|------|------------------|-------------|
| `photos/gallery.json` | Gallery Photos | `gallery.html` |
| `photos/albums.json` | Albums | `albums.html` |
| `photos/portfolio.json` | Portfolio | `portfolio.html` |
| `photos/uploads/*` | image uploads | image URLs in JSON |

After each **Publish** in CMS, Netlify redeploys; public pages load the updated JSON.

## Deploy

1. Push to GitHub (`main` branch).
2. Netlify imports the repo (publish directory: `.`).
3. Complete Identity + Git Gateway steps in `NETLIFY_SETUP.md`.
