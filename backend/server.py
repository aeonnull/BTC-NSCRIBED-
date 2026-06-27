import os
import uuid
import logging
import jwt
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Request, Depends, HTTPException, Header, UploadFile, File
from fastapi.responses import RedirectResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId
from pydantic import BaseModel, Field
from authlib.integrations.httpx_client import AsyncOAuth1Client

from art import art_uri, build_demo_works

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="uploads")

APP_BASE_URL = os.environ.get('APP_BASE_URL', '').rstrip('/')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
SESSION_SECRET = os.environ.get('SESSION_SECRET', 'dev-session')
TWITTER_API_KEY = os.environ.get('TWITTER_API_KEY', '')
TWITTER_API_SECRET = os.environ.get('TWITTER_API_SECRET', '')
HOLDER_VERIFY_URL = os.environ.get('HOLDER_VERIFY_URL', '').strip()
HOLDER_SHARED_SECRET = os.environ.get('HOLDER_SHARED_SECRET', '')
REQUIRE_HOLDER = os.environ.get('REQUIRE_HOLDER', 'false').lower() in ('1', 'true', 'yes')

APP_NAME = "nscribed"
DEMO_REMOVE_THRESHOLD = 10  # demo profiles auto-clear once this many real users join

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)
api_router = APIRouter(prefix="/api")

# ---------- OAuth (Twitter / X) — DB-backed, no session/cookie dependency ----------
TW_REQUEST_TOKEN_URL = 'https://api.twitter.com/oauth/request_token'
TW_AUTHORIZE_URL = 'https://api.twitter.com/oauth/authenticate'
TW_ACCESS_TOKEN_URL = 'https://api.twitter.com/oauth/access_token'
TW_VERIFY_URL = 'https://api.twitter.com/1.1/account/verify_credentials.json'

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}


# ---------- Models ----------
class LinkItem(BaseModel):
    label: str
    url: str


class MarketItem(BaseModel):
    name: str
    url: str


class Work(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str = ""
    image: str = ""


class Collection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    chain: str = "Bitcoin"
    year: str = "2025"
    marketplace_name: str = ""
    marketplace_url: str = ""
    works: List[Work] = []


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    links: Optional[List[LinkItem]] = None
    marketplaces: Optional[List[MarketItem]] = None
    collections: Optional[List[Collection]] = None


# ---------- Helpers ----------
def make_token(user_id: str) -> str:
    payload = {'sub': user_id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload['sub']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def public_profile(u: dict) -> dict:
    return {
        "id": u["id"],
        "handle": u["handle"],
        "name": u.get("name", u["handle"]),
        "type": u.get("type", "artist"),
        "verified": u.get("verified", False),
        "bio": u.get("bio", ""),
        "avatar": u.get("avatar", ""),
        "links": u.get("links", []),
        "marketplaces": u.get("marketplaces", []),
        "collections": u.get("collections", []),
    }


# ---------- Auth routes ----------
@api_router.get("/auth/twitter/login")
async def twitter_login():
    if not TWITTER_API_KEY or not TWITTER_API_SECRET:
        raise HTTPException(status_code=503, detail="Twitter login not configured")
    callback = f"{APP_BASE_URL}/api/auth/twitter/callback"
    async with AsyncOAuth1Client(TWITTER_API_KEY, TWITTER_API_SECRET, redirect_uri=callback) as client:
        token = await client.fetch_request_token(TW_REQUEST_TOKEN_URL)
    await db.oauth_tmp.update_one(
        {"oauth_token": token["oauth_token"]},
        {"$set": {"oauth_token_secret": token["oauth_token_secret"],
                  "created_dt": datetime.now(timezone.utc),
                  "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return RedirectResponse(f"{TW_AUTHORIZE_URL}?oauth_token={token['oauth_token']}")


@api_router.get("/auth/twitter/callback")
async def twitter_callback(oauth_token: str = "", oauth_verifier: str = ""):
    tmp = await db.oauth_tmp.find_one({"oauth_token": oauth_token})
    if not tmp or not oauth_verifier:
        logger.error("Twitter callback missing request token or verifier")
        return RedirectResponse(f"{APP_BASE_URL}/?auth=error")
    try:
        async with AsyncOAuth1Client(
            TWITTER_API_KEY, TWITTER_API_SECRET,
            token=oauth_token, token_secret=tmp["oauth_token_secret"],
        ) as client:
            access = await client.fetch_access_token(TW_ACCESS_TOKEN_URL, verifier=oauth_verifier)
        async with AsyncOAuth1Client(
            TWITTER_API_KEY, TWITTER_API_SECRET,
            token=access["oauth_token"], token_secret=access["oauth_token_secret"],
        ) as client:
            resp = await client.get(TW_VERIFY_URL,
                                    params={"skip_status": "true", "include_email": "false"})
            data = resp.json()
    except Exception as e:
        logger.error(f"Twitter auth failed: {e}")
        return RedirectResponse(f"{APP_BASE_URL}/?auth=error")
    finally:
        await db.oauth_tmp.delete_one({"oauth_token": oauth_token})

    twitter_id = str(data.get("id_str") or data.get("id") or access.get("user_id", ""))
    handle = data.get("screen_name") or access.get("screen_name")
    name = data.get("name") or handle
    avatar = (data.get("profile_image_url_https") or "").replace("_normal", "")
    verified = bool(data.get("verified", False))

    existing = await db.users.find_one({"twitter_id": twitter_id})
    if existing:
        update = {"name": name, "handle": handle}
        if not existing.get("avatar"):
            update["avatar"] = avatar
        await db.users.update_one({"twitter_id": twitter_id}, {"$set": update})
        user_id = existing["id"]
    else:
        user_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id, "twitter_id": twitter_id, "handle": handle,
            "name": name, "avatar": avatar, "verified": verified,
            "type": "artist", "bio": "", "links": [], "marketplaces": [],
            "collections": [], "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Auto-remove demo/example profiles once enough real users have joined.
    real_count = await db.users.count_documents({"demo": {"$ne": True}})
    if real_count >= DEMO_REMOVE_THRESHOLD:
        await db.users.delete_many({"demo": True})

    jwt_token = make_token(user_id)
    return RedirectResponse(f"{APP_BASE_URL}/auth/callback?token={jwt_token}")


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    data = public_profile(user)
    data["holder"] = bool(user.get("holder", False))
    data["holder_verified_at"] = user.get("holder_verified_at")
    return data


# ---------- Holder verification (connects to external verifier app) ----------
def make_state_token(user_id: str) -> str:
    payload = {"sub": user_id, "typ": "holder_state",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@api_router.get("/holder/status")
async def holder_status(user: dict = Depends(get_current_user)):
    return {"holder": bool(user.get("holder", False)),
            "holder_verified_at": user.get("holder_verified_at"),
            "configured": bool(HOLDER_VERIFY_URL)}


@api_router.post("/holder/start")
async def holder_start(user: dict = Depends(get_current_user)):
    """Hand the user off to the external holder-verification app (friend's app).
    We pass a short-lived signed `state` token + a `return_url` to come back to."""
    if not HOLDER_VERIFY_URL:
        raise HTTPException(status_code=503, detail="Holder verification not configured yet")
    state = make_state_token(user["id"])
    return_url = f"{APP_BASE_URL}/api/holder/callback"
    sep = "&" if "?" in HOLDER_VERIFY_URL else "?"
    redirect_url = (f"{HOLDER_VERIFY_URL}{sep}state={state}"
                    f"&return_url={return_url}&handle={user.get('handle','')}")
    return {"redirect_url": redirect_url}


@api_router.get("/holder/callback")
async def holder_callback(state: str = "", result: str = "", secret: str = "",
                          wallet: str = ""):
    """Called/redirected to by the external verifier app once it has checked the
    wallet + Ordinals holdings. Expected contract (adjustable to the friend's app):
      GET /api/holder/callback?state=<token>&result=verified&secret=<shared>&wallet=<addr>
    """
    target = f"{APP_BASE_URL}/access"
    if HOLDER_SHARED_SECRET and secret != HOLDER_SHARED_SECRET:
        return RedirectResponse(f"{target}?holder=error")
    try:
        payload = jwt.decode(state, JWT_SECRET, algorithms=["HS256"])
        assert payload.get("typ") == "holder_state"
        user_id = payload["sub"]
    except Exception:
        return RedirectResponse(f"{target}?holder=error")

    verified = result.lower() in ("verified", "true", "ok", "1")
    update = {"holder": verified}
    if verified:
        update["holder_verified_at"] = datetime.now(timezone.utc).isoformat()
        if wallet:
            update["holder_wallet"] = wallet
    await db.users.update_one({"id": user_id}, {"$set": update})
    return RedirectResponse(f"{target}?holder={'ok' if verified else 'failed'}")


# ---------- Upload / files (stored in MongoDB GridFS — self-contained) ----------
@api_router.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png")
    content_type = file.content_type or MIME_TYPES.get(ext, "image/png")
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 8MB)")
    file_id = await fs_bucket.upload_from_stream(
        f"{user['id']}/{uuid.uuid4()}.{ext}",
        data,
        metadata={"content_type": content_type, "owner": user["id"],
                  "original_filename": file.filename,
                  "created_at": datetime.now(timezone.utc).isoformat()},
    )
    sid = str(file_id)
    return {"path": sid, "url": f"{APP_BASE_URL}/api/files/{sid}"}


@api_router.get("/files/{file_id}")
async def download(file_id: str):
    try:
        oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        stream = await fs_bucket.open_download_stream(oid)
        data = await stream.read()
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    content_type = (stream.metadata or {}).get("content_type", "application/octet-stream")
    return Response(content=data, media_type=content_type,
                    headers={"Cache-Control": "public, max-age=31536000"})


# ---------- Profile routes ----------
@api_router.get("/profiles")
async def list_profiles():
    artist_docs = await db.users.find({"type": "artist"}, {"_id": 0}).to_list(500)
    collector_docs = await db.users.find({"type": "collector"}, {"_id": 0}).to_list(500)
    return {
        "artists": [public_profile(u) for u in artist_docs],
        "collectors": [public_profile(u) for u in collector_docs],
    }


@api_router.get("/profiles/{handle}")
async def get_profile(handle: str):
    u = await db.users.find_one({"handle": handle}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Profile not found")
    return public_profile(u)


@api_router.put("/profiles/me")
async def update_my_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    # Membership gate: when enabled, only verified holders may create/edit a profile.
    if REQUIRE_HOLDER and not user.get("holder", False):
        raise HTTPException(status_code=403, detail="Holder verification required to create or edit a profile")
    update = {}
    if payload.name is not None:
        update["name"] = payload.name
    if payload.type in ("artist", "collector"):
        update["type"] = payload.type
    if payload.bio is not None:
        update["bio"] = payload.bio
    if payload.avatar is not None:
        update["avatar"] = payload.avatar
    if payload.links is not None:
        update["links"] = [l.model_dump() for l in payload.links]
    if payload.marketplaces is not None:
        update["marketplaces"] = [m.model_dump() for m in payload.marketplaces]
    if payload.collections is not None:
        update["collections"] = [c.model_dump() for c in payload.collections]
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_profile(fresh)


# ---------- Seed demo data ----------
DEMO = [
    {"handle": "btc_mio", "name": "MIO", "type": "artist", "verified": True,
     "bio": "Inscribing minimal black-on-white characters since block 767,430. Hand-drawn, one of one, mostly chaos.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "Discord", "url": "https://discord.com"}],
     "marketplaces": [{"name": "OpenSea", "url": "https://opensea.io"}, {"name": "Gamma", "url": "https://gamma.io"}],
     "cols": [("chaos", "Chaos", "Bitcoin", "2024", 8, "Gamma", "https://gamma.io"),
              ("punk", "Punk Royale", "Bitcoin", "2023", 6, "OpenSea", "https://opensea.io"),
              ("nodes", "Nodebirds", "Bitcoin", "2024", 9, "", "")]},
    {"handle": "void_ord", "name": "VOID", "type": "artist", "verified": True,
     "bio": "Generative noise, on-chain. Layers, rarity, exclusion rules — exported straight to inscription.",
     "links": [{"label": "Website", "url": "https://example.com"}],
     "marketplaces": [{"name": "Gamma", "url": "https://gamma.io"}],
     "cols": [("static", "Static Gods", "Bitcoin", "2025", 8, "Gamma", "https://gamma.io"),
              ("field", "Field Notes", "Bitcoin", "2024", 6, "", "")]},
    {"handle": "sable_btc", "name": "SABLE", "type": "artist", "verified": False,
     "bio": "Pixel portraiture. Slow drops, no roadmap.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "Discord", "url": "https://discord.com"}],
     "marketplaces": [{"name": "Ordinals Wallet", "url": "https://ordinalswallet.com"}],
     "cols": [("idols", "Idols", "Bitcoin", "2025", 9, "Ordinals Wallet", "https://ordinalswallet.com")]},
    {"handle": "runeandco", "name": "RUNE&CO", "type": "artist", "verified": True,
     "bio": "A studio inscribing type and glyphs. Everything is a manifest.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "X", "url": "https://x.com"}],
     "marketplaces": [{"name": "Gamma", "url": "https://gamma.io"}],
     "cols": [("glyphs", "Glyphset", "Bitcoin", "2024", 8, "", "https://gamma.io")]},
    {"handle": "kane_eth", "name": "0xKANE", "type": "collector", "verified": True,
     "bio": "Collecting on-chain art across Bitcoin and Ethereum. Curating, not flexing the whole wallet.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "Discord", "url": "https://discord.com"}],
     "marketplaces": [{"name": "OpenSea", "url": "https://opensea.io"}],
     "cols": [("vault", "The Vault", "Mixed", "2021-25", 8, "OpenSea", "https://opensea.io")]},
    {"handle": "degenjane", "name": "DEGENJANE", "type": "collector", "verified": False,
     "bio": "Early to Ordinals. Working with a few studios. Mostly here for the art.",
     "links": [{"label": "Website", "url": "https://example.com"}],
     "marketplaces": [{"name": "Gamma", "url": "https://gamma.io"}],
     "cols": [("picks", "Jane Picks", "Bitcoin", "2023-25", 6, "", "")]},
    {"handle": "ord_whale", "name": "ORDWHALE", "type": "collector", "verified": True,
     "bio": "Long-term holder. Builder of tools for the space. Profile over plumbing.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "Tools", "url": "https://example.com"}, {"label": "Discord", "url": "https://discord.com"}],
     "marketplaces": [{"name": "Ordinals Wallet", "url": "https://ordinalswallet.com"}, {"name": "OpenSea", "url": "https://opensea.io"}],
     "cols": [("deep", "Deep Holdings", "Mixed", "2021-25", 8, "", "https://ordinalswallet.com")]},
]


@app.on_event("startup")
async def startup():
    try:
        await db.oauth_tmp.create_index("created_dt", expireAfterSeconds=900)
    except Exception as e:
        logger.warning(f"oauth_tmp TTL index: {e}")
    count = await db.users.count_documents({})
    if count == 0:
        for d in DEMO:
            cols = []
            for cid, cname, chain, year, n, mname, murl in d["cols"]:
                cols.append({
                    "id": cid, "name": cname, "chain": chain, "year": year,
                    "marketplace_name": mname, "marketplace_url": murl,
                    "works": build_demo_works(d["handle"] + cid, n),
                })
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "twitter_id": f"demo-{d['handle']}", "demo": True,
                "handle": d["handle"], "name": d["name"], "type": d["type"],
                "verified": d["verified"], "bio": d["bio"],
                "avatar": art_uri(d["handle"] + "-av"),
                "links": d["links"], "marketplaces": d["marketplaces"],
                "collections": cols, "created_at": datetime.now(timezone.utc).isoformat(),
            })
        logger.info("Seeded demo profiles")


@api_router.get("/")
async def root():
    return {"message": "nscribed API"}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ---------- Serve the built React frontend (single-service deploy, e.g. Railway) ----------
FRONTEND_BUILD = ROOT_DIR.parent / "frontend" / "build"
if FRONTEND_BUILD.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD / "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = FRONTEND_BUILD / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(FRONTEND_BUILD / "index.html"))
