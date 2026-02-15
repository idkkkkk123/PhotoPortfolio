# Deployment — Static Photography Portfolio

This site is **fully static**. No database, no serverless functions, no environment variables.

## Netlify

1. Connect your Git repository to Netlify.
2. **Build command**: `node scripts/build-data.js` (optional; run locally if you prefer)
3. **Publish directory**: `.`
4. Deploy. No environment variables are required.

If you add new images and run the build script locally before pushing, the generated `data/gallery.json` and `data/albums.json` will be committed and deployed. Alternatively, you can add `node scripts/build-data.js` as the Netlify build command so data is regenerated on each deploy (requires `images/` and `albums/` to be in the repo).

## GitHub Pages

1. Push the repository to GitHub.
2. Enable GitHub Pages (Settings → Pages → source: main branch, / (root) or a docs folder).
3. Whenever you add or change photos, run locally:
   ```bash
   node scripts/build-data.js
   ```
   Then commit and push the updated `data/*.json` and new image files.

## Adding photos before deploy

- Put images in **images/** for the main gallery.
- Put images in **albums/&lt;name&gt;/** for albums (e.g. **albums/travel**, **albums/portraits**).
- Run **node scripts/build-data.js** to update **data/gallery.json** and **data/albums.json**.
- Commit and push (or trigger your host’s deploy).

No API keys, database URLs, or secrets are needed.
