# Visual Stories — Deployment Guide

## Prerequisites
- A [Netlify](https://netlify.com) account
- A [Neon](https://neon.tech) PostgreSQL database

## Environment Variables (Netlify Dashboard)

Set these in **Netlify > Site Settings > Environment Variables**:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require` |
| `JWT_SECRET` | Secret key for signing auth tokens (use a long random string) | `my-super-secret-key-change-this-in-production` |

## Deployment Steps

1. **Push to GitHub** — Connect your repo to Netlify
2. **Set environment variables** in Netlify dashboard (see above)
3. **Deploy** — Netlify will automatically:
   - Publish the static files from the root directory
   - Deploy serverless functions from `netlify/functions/`
   - The database tables are auto-created on first API call

## Architecture

- **Frontend**: Static HTML/CSS/JS (no build step needed)
- **Backend**: Netlify Functions (serverless) in `netlify/functions/`
- **Database**: Neon PostgreSQL
- **Auth**: JWT tokens stored in localStorage, verified server-side

## API Endpoints

| Endpoint | Methods | Description |
|---|---|---|
| `/.netlify/functions/api-auth/signup` | POST | Create account |
| `/.netlify/functions/api-auth/login` | POST | Log in |
| `/.netlify/functions/api-auth/me` | GET | Verify session |
| `/.netlify/functions/api-photos` | GET, POST | List/create photos |
| `/.netlify/functions/api-photos/:id` | DELETE | Delete photo |
| `/.netlify/functions/api-albums` | GET, POST | List/create albums |
| `/.netlify/functions/api-albums/:id` | PUT, DELETE | Rename/delete album |
| `/.netlify/functions/api-albums/:id/photos` | POST | Add photos to album |
| `/.netlify/functions/api-albums/:id/photos/:photoId` | DELETE | Remove photo from album |
| `/.netlify/functions/api-displays` | GET, POST | List/create displays |
| `/.netlify/functions/api-displays/:id` | GET, DELETE | Get/delete display |
| `/.netlify/functions/api-portfolio` | GET, POST | List/create portfolio items |
| `/.netlify/functions/api-portfolio/:id` | DELETE | Delete portfolio item |

## Important Notes

- Photos are stored as base64 data URLs in the database. For large photo libraries, consider migrating to a cloud storage service (e.g., Cloudinary, S3).
- Netlify Functions have a 6MB request body limit. Very large images may need to be compressed before upload.
- The `JWT_SECRET` should be a strong, unique random string in production.
