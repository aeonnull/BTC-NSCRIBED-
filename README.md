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
| `REQUIRE_HOLDER` | Gate profile creation/editing to verified holders. Defaults to `true`; set to `false` to open it up |

Frontend (`frontend/.env`):

| Variable | Description |
|---|---|
| `REACT_APP_BACKEND_URL` | Base URL of the backend API |

## Deployment

Deployable on any host (VPS, Railway, etc.). After deploying, set `APP_BASE_URL` and
`REACT_APP_BACKEND_URL` to your live domain and register the production OAuth callback
`https://<your-domain>/api/auth/twitter/callback` in your X app settings.

---

© nscribed — by Blockheads
