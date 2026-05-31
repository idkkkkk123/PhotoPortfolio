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

### 2. Enable Identity (fixes “Failed to load settings from /.netlify/identity”)

This error means **Identity is turned off** on Netlify. The admin login cannot work until you enable it.

1. Go to [https://app.netlify.com](https://app.netlify.com) and log in.
2. Click your site **`photoportfolioweb`** (or whatever the site is named).
3. In the left sidebar, open **Identity** (under “Extensions” or “Site configuration”, depending on Netlify’s UI).
4. Click **Enable Identity** (or **Set up Identity**).
5. Under **Registration preferences**, choose **Invite only** — visitors cannot sign themselves up; only people you invite can log in.

**Check it worked:** open  
https://photoportfolioweb.netlify.app/.netlify/identity  
in a browser. You should **not** get a 404. A **401** message is normal and means Identity is enabled.

### 3. Enable Git Gateway (CMS → GitHub)

1. Still under **Identity**, open the **Services** tab (or **Enable services**).
2. Find **Git Gateway** and click **Enable**.

Without Git Gateway, login may work but **Publish** in the admin will fail.

### 4. Give someone a login (invite flow)

You do **not** create passwords in the code. You invite people by email in Netlify:

**For yourself (first time):**

1. **Identity** → **Invite users** (or **Add users**).
2. Enter **your** email address → send invite.
3. Open that email → click **Accept the invite**.
4. You land on the site with `#invite_token=...` in the URL. A popup opens to **choose your password** (Netlify does **not** email a password — you create it here).
5. After that, go to the admin URL and use **that email + the password you just chose**.

**If invite opens a “Log in” screen instead of “Sign up”:** hard-refresh the homepage, or open  
`https://photoportfolioweb.netlify.app/#invite_token=...`  
(copy the full link from your email). The site should open **Sign up** / set password, not ask for an existing password.

**For your friend (photographer):**

1. **Identity** → **Invite users**.
2. Enter **their** email (the one they actually use).
3. They receive **“You’ve been invited to photoportfolioweb”** (or similar).
4. They click the link in the email → create their password (one time).
5. They open:  
   https://photoportfolioweb.netlify.app/admin-bbpews098ge8ht4ez4xdeg/  
   → **Log in** with that email + password.

They never need a GitHub account. Only the Netlify invite + password.

**Optional:** Under Identity → **Settings** → **Emails**, you can customize invite text.

| Role | Can open admin? | Can change public site? |
|------|-----------------|-------------------------|
| You (site owner) | Yes, after invite | Yes, after Git Gateway |
| Invited friend | Yes, with their invite | Yes |
| Random visitor | No | No (view only) |

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

## Health check (everything wired correctly)

| Check | URL / action | Good sign |
|--------|----------------|-----------|
| Repo public | [raw gallery.json](https://raw.githubusercontent.com/idkkkkk123/PhotoPortfolio/main/photos/gallery.json) | JSON opens, not 404 |
| Netlify data | `/photos/gallery.json` on your site | Same JSON |
| Identity | `/.netlify/identity` | **401** or **200**, not **404** |
| Admin | `/admin-bbpews098ge8ht4ez4xdeg/` | “Editor ready” → Log in → CMS |
| Gallery | `gallery.html` | Shows photos after CMS **Publish** |
| Home portfolio | `index.html` (scroll down) | Same portfolio items as admin |
| Second device | Open gallery on phone | Same photos as laptop |

**Only upload here:** `/admin-bbpews098ge8ht4ez4xdeg/` (Netlify CMS). Do not use old `upload.html` paths.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Admin shows old “Admin Panel” home page, not CMS | Deploy this repo version; folder `admin-bbpews098ge8ht4ez4xdeg/` must exist on GitHub. |
| “Failed to load config.yml” | Open the exact admin URL above; `config.yml` must sit next to `index.html` in that folder. |
| “Failed to load settings from /.netlify/identity” | **Enable Identity** on the Netlify site (step 2 above). If Identity is already on, hard-refresh admin (Ctrl+F5). |
| Admin says Identity off but you enabled it | False alarm from an old check — redeploy latest `main`; 401 on `/.netlify/identity` means Identity **is** on. |
| Login works but Publish fails | Enable **Git Gateway**; confirm repo branch is `main`. |
| Friend never got invite | Resend from **Identity → Invite users**; check spam folder. |
| Changes never appear on site | Click **Publish** in CMS; wait for deploy; check `photos/gallery.json` on GitHub. |
| Images broken on site | `src` should start with `/photos/uploads/` (CMS sets this automatically). |

---

## Changing the site URL

If you rename the Netlify site, update `site_url` and `display_url` in:

- `admin-bbpews098ge8ht4ez4xdeg/config.yml`
- `admin/config.yml`
