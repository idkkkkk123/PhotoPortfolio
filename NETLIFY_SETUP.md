# Netlify CMS setup (admin ↔ public site)

This project links the **admin panel** and the **viewing website** through JSON files in GitHub. No database.

## How they stay in sync

```
Admin (Netlify CMS)
  → saves photos/gallery.json, albums.json, portfolio.json
  → uploads images to photos/uploads/
  → commits to GitHub (via Git Gateway)
Netlify rebuilds the site (about 1–2 minutes)
Public pages read those same files:
  gallery.html   → photos/gallery.json
  albums.html    → photos/albums.json
  portfolio.html → photos/portfolio.json
```

Visitors never log in. Only invited users can open the admin URL.

**Admin URL (use this one):**  
https://photoportfolioweb.netlify.app/admin-bbpews098ge8ht4ez4xdeg/

## One shared source for every device (not browser storage)

Photos are **not** stored in your phone or laptop browser anymore. They live in:

- `photos/gallery.json`, `photos/albums.json`, `photos/portfolio.json` on **GitHub** (your shared “database”)
- Image files in `photos/uploads/`

Every visitor loads those same files. The site clears old `localStorage` keys (`portfolioPhotos`, etc.) automatically.

**Only use the admin panel to add photos** — do not use `photo-uploader.html` (it redirected / removed).

## Fast updates (photos show in ~seconds, not after full deploy)

Public pages (`gallery.html`, `albums.html`, `portfolio.html`) load data from **GitHub first**, then fall back to the Netlify site. When you click **Publish** in CMS:

1. GitHub gets the new JSON and images in a few seconds.
2. The gallery page picks that up (auto-refresh every 15 seconds, or when you switch back to the tab).
3. Netlify still redeploys in the background for normal hosting.

**Requirement:** the GitHub repo must be **public** (so `raw.githubusercontent.com` can serve files). If the repo is private, set `SITE_CONTENT.github.enabled` to `false` in `common.js` — then updates only appear after each Netlify deploy.

**Quick test:** publish a photo in admin, open `gallery.html` in another tab, wait up to 15 seconds (or click away and back to the tab).

---

## One-time Netlify setup (do in order)

### 1. Connect GitHub

1. Push this repo to GitHub (branch name must be **`main`** — CMS config uses `branch: main`).
2. In [Netlify](https://app.netlify.com): **Add new site → Import an existing project → GitHub**.
3. Select the repo. Build settings:
   - **Build command:** leave empty
   - **Publish directory:** `.` (root)
4. Deploy once. Note your site URL (e.g. `https://photoportfolioweb.netlify.app`).

### 2. Enable Identity (login for admin only)

1. Netlify site → **Identity**.
2. **Enable Identity**.
3. **Registration preferences** → **Invite only** (so the public cannot create accounts).

### 3. Enable Git Gateway (CMS → GitHub)

1. **Identity** → **Services** → **Git Gateway** → **Enable**.

Without Git Gateway, the admin UI cannot save changes to your repo.

### 4. Invite your friend (or yourself)

1. **Identity** → **Invite users** → enter email.
2. They accept the invite from email, then set a password.

### 5. Confirm GitHub permissions

Netlify’s GitHub app must be allowed to **write** to the repo (CMS commits JSON and images).

---

## Using the admin panel

1. Open https://photoportfolioweb.netlify.app/admin-bbpews098ge8ht4ez4xdeg/
2. **Log in** with the invited Netlify Identity account.
3. Pick a collection:
   - **Gallery Photos** → appears on `gallery.html`
   - **Albums** → appears on `albums.html`
   - **Portfolio** → appears on `portfolio.html`
4. Add a photo → use the **Image** field (upload). Fill **Name**, **Date**, etc.
5. Click **Publish** (top). Wait for Netlify **Deploys** to show **Published** (usually 1–2 min).
6. Open the public page (hard refresh: Ctrl+F5) and confirm the photo appears.

---

## Verify the link works

After publishing one test photo in **Gallery Photos**:

| Check | URL | Expected |
|--------|-----|----------|
| Raw data | https://photoportfolioweb.netlify.app/photos/gallery.json | JSON with your photo’s `src` (e.g. `/photos/uploads/...`) |
| Gallery page | https://photoportfolioweb.netlify.app/gallery.html | Photo visible in the grid |

If `gallery.json` returns **404**, the latest code was not deployed — push to GitHub and trigger a deploy.

If JSON has photos but the gallery is empty, hard-refresh the page or check the browser console for errors.

---

## Do not use for production uploads

- **`photo-uploader.html`** — only saves to this browser’s localStorage; it does **not** update the live site.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Admin shows old “Admin Panel” home page, not CMS | Deploy this repo version; folder `admin-bbpews098ge8ht4ez4xdeg/` must exist on GitHub. |
| “Failed to load config.yml” | Open the exact admin URL above; `config.yml` must sit next to `index.html` in that folder. |
| Login works but Publish fails | Enable **Git Gateway**; confirm repo branch is `main`. |
| Changes never appear on site | Click **Publish** in CMS; wait for deploy; check `photos/gallery.json` on GitHub. |
| Images broken on site | `src` should start with `/photos/uploads/` (CMS sets this automatically). |

---

## Changing the site URL

If you rename the Netlify site, update `site_url` and `display_url` in:

- `admin-bbpews098ge8ht4ez4xdeg/config.yml`
- `admin/config.yml`
