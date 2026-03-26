# Photo Portfolio (Static + Netlify)

This project is now a portfolio-first static site (Home, Gallery, Albums, Portfolio).

## Current setup

- `Display` page removed.
- Public `Upload` page removed.
- Gallery and Portfolio read from `photos/manifest.json` (if present).
- Each image in Gallery can be downloaded from the lightbox.

## How to add photos (no database)

1. Put image files in `photos/` (for example: `photos/beach-sunset.jpg`).
2. Update `photos/manifest.json`:

```json
[
  {
    "id": "beach-001",
    "src": "photos/beach-sunset.jpg",
    "name": "Beach Sunset",
    "date": "2026-03-26T00:00:00.000Z",
    "featured": true,
    "description": "Golden hour shoreline portrait."
  }
]
```

3. Commit and deploy to Netlify.

## Notes for Netlify

- Netlify static hosting cannot accept file uploads directly to your repo at runtime without a backend/service.
- For a pure static workflow, upload photos by editing files in Git (manual or via local helper), then redeploy.
- If you want runtime uploads without managing Git manually, use a third-party backend/media service (for example: Cloudinary, Uploadcare, Firebase Storage, or Netlify Blobs/Functions with a custom upload flow).
