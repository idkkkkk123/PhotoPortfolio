# Photo Showcase (Netlify + GitHub + Admin)

This project is a simple photography showcase:

Public pages (read-only):
- `index.html`
- `gallery.html`
- `albums.html`
- `portfolio.html`
- Lightbox viewer + download (inside those pages)

Private admin (read/write):
- `admin/` (Netlify CMS)

## How your friend adds content (no code)

1. Deploy/connect the site to Netlify from GitHub.
2. Enable **Netlify Identity** + allow your friend to log in.
3. Open the admin UI at `https://<your-site>/admin/`.
4. Use these tabs:
   - **Gallery Photos**: add photos for `gallery.html` (use the `date` field for sorting)
   - **Albums**: create albums and add photos to each album (album covers are auto-generated from the first 4 photos)
   - **Portfolio**: add your featured items and set `order` for reordering
5. Upload images using the image upload fields (drag/drop supported by the CMS).
6. Netlify CMS commits changes back to GitHub and Netlify redeploys.

## Data files (edited by the CMS)

- `photos/gallery.json` (gallery grid)
- `photos/albums.json` (album list + album photos)
- `photos/portfolio.json` (portfolio grid + ordering)
- Uploaded images go into: `photos/uploads/`

## Deployment (GitHub + Netlify)

- Push to GitHub.
- Connect the repo to Netlify.
- Netlify builds and serves the static site from the repo.
- After every CMS save, Netlify redeploys automatically.

