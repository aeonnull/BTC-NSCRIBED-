# nscribed — by Blockheads

## Original problem statement
Visual "Link Tree" for crypto/Ordinals art. Twitter/X integration is fundamental.
Replace "Magic Eden" (no longer exists) with free-form "Marketplaces" where users enter
the marketplace name + a link. Source was a single static HTML file (provided by user).

## User choices (confirmed)
- Fullstack app (React + FastAPI + MongoDB)
- Real X/Twitter API login (OAuth 1.0a "Sign in with X")
- Marketplaces: user types name + link freely (multiple)
- Users create/edit their own profiles (auth via X login)
- Keep the generated SVG placeholder art

## Architecture
- Backend: FastAPI (/api prefix), MongoDB (motor). Authlib OAuth 1.0a + SessionMiddleware.
  JWT (pyjwt) issued after X login; 30-day token in localStorage on frontend.
- Frontend: React Router. Ported original design 1:1 into App.css. AuthContext in auth.js.
  Seeded generative art in lib/art.js.
- X app: "Nscribed" (app id 32438062). Keys in backend/.env. Callback:
  {APP_BASE_URL}/api/auth/twitter/callback (Web App / Confidential client).

## Key endpoints
- GET  /api/auth/twitter/login        -> 302 to X authorize
- GET  /api/auth/twitter/callback     -> creates/updates user, redirects /auth/callback?token=
- GET  /api/auth/me                   -> current user (Bearer JWT)
- GET  /api/profiles                  -> {artists[], collectors[]}
- GET  /api/profiles/{handle}         -> single public profile
- PUT  /api/profiles/me               -> update name/type/bio/links/marketplaces/collections

## Implemented (2026-06-27)
- Home (artists + collectors grid), Profile (links + marketplaces chips), Collection detail
  with manifest + works grid + lightbox. All matching original aesthetic.
- "Magic Eden" replaced by editable Marketplaces (profile-level list + per-collection name+link).
- Real X login redirect verified (302 to api.twitter.com). Protected endpoints + 401 gating verified.
- Edit dashboard: name, artist/collector toggle, bio, links, marketplaces, collections (pieces count).
- 7 demo profiles seeded on first startup.

## Backlog / Next
- P1: Confirm full X login round-trip with a real account (user to verify in browser).
- P1: Allow real image upload for avatar/works (currently generated art per user choice).
- P2: Profile slug sharing / copy-link button, search, About/Support pages.
- P2: Replace SESSION_SECRET/JWT_SECRET with longer (32+ byte) production secrets before deploy.
