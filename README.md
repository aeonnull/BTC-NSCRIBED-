# nscribed

One link for all your digital art. A profile home for creators and collectors — show
everything you've made and everything you've collected, then share a single clean link
(e.g. `nscribed.xyz/yourhandle`) in your X bio.

## Features

- **Sign in with X** — authenticate with your X (Twitter) account; your handle, name and
  picture are pulled in automatically.
- **Your profile, your way** — bio, links, marketplaces (add any marketplace + link),
  and collections of work.
- **Image uploads** — upload a profile picture and an image for every artwork.
- **Clean shareable links** — every profile lives at `/<handle>`, with a one-tap copy button.
- **Public by default** — anyone can view a profile; only the owner can edit their own.
- **Holder access gate (optional)** — membership can be gated to verified holders via an
  external verification service.

## Tech stack

- **Frontend:** React (CRA + CRACO), React Router
- **Backend:** FastAPI (Python)
- **Database:** MongoDB (profiles + GridFS for uploaded images)
- **Auth:** X (Twitter) OAuth 1.0a, JWT sessions

## Project structure

```
backend/    FastAPI app (server.py), image storage via MongoDB GridFS
frontend/   React app (components, styles, assets)
```

## Local development

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend**
```bash
cd frontend
yarn install
yarn start
```

## Environment

Backend (`backend/.env`):

| Variable | Description |
|---|---|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | Database name |
| `APP_BASE_URL` | Public base URL of the app (used for OAuth callback + file URLs) |
| `JWT_SECRET` | Secret for signing session tokens |
| `SESSION_SECRET` | Secret for the OAuth session middleware |
| `TWITTER_API_KEY` / `TWITTER_API_SECRET` | X (Twitter) app credentials |
| `HOLDER_VERIFY_URL` | External holder-verification service URL (optional) |
| `HOLDER_SHARED_SECRET` | Shared secret for the verification callback (optional) |
| `REQUIRE_HOLDER` | `true` to gate profile editing to verified holders |

Frontend (`frontend/.env`):

| Variable | Description |
|---|---|
| `REACT_APP_BACKEND_URL` | Base URL of the backend API |

## Deployment

The app is host-agnostic. The included `Dockerfile` builds the React frontend and
serves it from the FastAPI backend in a single container, listening on `$PORT` (default
`8001`), so it runs on any Docker host — Railway, Render, Fly.io, a plain VPS, etc.

### Go live

1. **Database** — provision a MongoDB instance (e.g. MongoDB Atlas free tier) and note
   its connection string.
2. **Deploy the container** — point your host at this repo (it auto-detects the
   `Dockerfile`) or build/push it yourself:
   ```bash
   docker build -t nscribed .
   docker run -p 8001:8001 --env-file backend/.env nscribed
   ```
3. **Set environment variables** on the host (see the tables above). At minimum:
   `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `SESSION_SECRET`, `TWITTER_API_KEY`,
   `TWITTER_API_SECRET`, and `APP_BASE_URL` set to your live domain
   (e.g. `https://nscribed.xyz`).
4. **Frontend URL** — set `REACT_APP_BACKEND_URL` to the same public domain so the
   frontend calls the API on the live host. (If frontend and backend share one domain,
   as with this Dockerfile, you can leave it empty to use relative `/api` paths.)
5. **Register the OAuth callback** — in your X (Twitter) app settings add
   `https://<your-domain>/api/auth/twitter/callback`.

That's it — no Emergent account or platform-specific dependency is required.

---

© nscribed — by Blockheads
