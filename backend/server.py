import os
import uuid
import logging
import jwt
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Request, Depends, HTTPException, Header
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from authlib.integrations.starlette_client import OAuth

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

APP_BASE_URL = os.environ.get('APP_BASE_URL', '').rstrip('/')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
SESSION_SECRET = os.environ.get('SESSION_SECRET', 'dev-session')
TWITTER_API_KEY = os.environ.get('TWITTER_API_KEY', '')
TWITTER_API_SECRET = os.environ.get('TWITTER_API_SECRET', '')

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)
api_router = APIRouter(prefix="/api")

# ---------- OAuth (Twitter / X) ----------
oauth = OAuth()
oauth.register(
    name='twitter',
    client_id=TWITTER_API_KEY,
    client_secret=TWITTER_API_SECRET,
    request_token_url='https://api.twitter.com/oauth/request_token',
    access_token_url='https://api.twitter.com/oauth/access_token',
    authorize_url='https://api.twitter.com/oauth/authenticate',
    api_base_url='https://api.twitter.com/1.1/',
)


# ---------- Models ----------
class LinkItem(BaseModel):
    label: str
    url: str


class MarketItem(BaseModel):
    name: str
    url: str


class Collection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    chain: str = "Bitcoin"
    year: str = "2025"
    pieces: int = 6
    marketplace_name: str = ""
    marketplace_url: str = ""


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None  # 'artist' | 'collector'
    bio: Optional[str] = None
    links: Optional[List[LinkItem]] = None
    marketplaces: Optional[List[MarketItem]] = None
    collections: Optional[List[Collection]] = None


# ---------- Helpers ----------
def make_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=30),
    }
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
async def twitter_login(request: Request):
    if not TWITTER_API_KEY or not TWITTER_API_SECRET:
        raise HTTPException(status_code=503, detail="Twitter login not configured")
    redirect_uri = f"{APP_BASE_URL}/api/auth/twitter/callback"
    return await oauth.twitter.authorize_redirect(request, redirect_uri)


@api_router.get("/auth/twitter/callback")
async def twitter_callback(request: Request):
    try:
        token = await oauth.twitter.authorize_access_token(request)
        resp = await oauth.twitter.get(
            'account/verify_credentials.json',
            params={'skip_status': 'true', 'include_email': 'false'},
            token=token,
        )
        data = resp.json()
    except Exception as e:
        logger.error(f"Twitter auth failed: {e}")
        return RedirectResponse(f"{APP_BASE_URL}/?auth=error")

    twitter_id = str(data.get("id_str") or data.get("id"))
    handle = data.get("screen_name")
    name = data.get("name") or handle
    avatar = (data.get("profile_image_url_https") or "").replace("_normal", "")
    verified = bool(data.get("verified", False))

    existing = await db.users.find_one({"twitter_id": twitter_id})
    if existing:
        await db.users.update_one(
            {"twitter_id": twitter_id},
            {"$set": {"name": name, "avatar": avatar, "handle": handle}},
        )
        user_id = existing["id"]
    else:
        user_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id,
            "twitter_id": twitter_id,
            "handle": handle,
            "name": name,
            "avatar": avatar,
            "verified": verified,
            "type": "artist",
            "bio": "",
            "links": [],
            "marketplaces": [],
            "collections": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    jwt_token = make_token(user_id)
    return RedirectResponse(f"{APP_BASE_URL}/auth/callback?token={jwt_token}")


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return public_profile(user)


# ---------- Profile routes ----------
@api_router.get("/profiles")
async def list_profiles():
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    artists = [public_profile(u) for u in users if u.get("type") == "artist"]
    collectors = [public_profile(u) for u in users if u.get("type") == "collector"]
    return {"artists": artists, "collectors": collectors}


@api_router.get("/profiles/{handle}")
async def get_profile(handle: str):
    u = await db.users.find_one({"handle": handle}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Profile not found")
    return public_profile(u)


@api_router.put("/profiles/me")
async def update_my_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {}
    if payload.name is not None:
        update["name"] = payload.name
    if payload.type in ("artist", "collector"):
        update["type"] = payload.type
    if payload.bio is not None:
        update["bio"] = payload.bio
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
     "collections": [
         {"id": "chaos", "name": "Chaos", "chain": "Bitcoin", "year": "2024", "pieces": 8, "marketplace_name": "Gamma", "marketplace_url": "https://gamma.io"},
         {"id": "punk", "name": "Punk Royale", "chain": "Bitcoin", "year": "2023", "pieces": 6, "marketplace_name": "OpenSea", "marketplace_url": "https://opensea.io"},
         {"id": "nodes", "name": "Nodebirds", "chain": "Bitcoin", "year": "2024", "pieces": 9, "marketplace_name": "", "marketplace_url": ""},
     ]},
    {"handle": "void_ord", "name": "VOID", "type": "artist", "verified": True,
     "bio": "Generative noise, on-chain. Layers, rarity, exclusion rules — exported straight to inscription.",
     "links": [{"label": "Website", "url": "https://example.com"}],
     "marketplaces": [{"name": "Gamma", "url": "https://gamma.io"}],
     "collections": [
         {"id": "static", "name": "Static Gods", "chain": "Bitcoin", "year": "2025", "pieces": 8, "marketplace_name": "Gamma", "marketplace_url": "https://gamma.io"},
         {"id": "field", "name": "Field Notes", "chain": "Bitcoin", "year": "2024", "pieces": 6, "marketplace_name": "", "marketplace_url": ""},
     ]},
    {"handle": "sable_btc", "name": "SABLE", "type": "artist", "verified": False,
     "bio": "Pixel portraiture. Slow drops, no roadmap.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "Discord", "url": "https://discord.com"}],
     "marketplaces": [{"name": "Ordinals Wallet", "url": "https://ordinalswallet.com"}],
     "collections": [
         {"id": "idols", "name": "Idols", "chain": "Bitcoin", "year": "2025", "pieces": 9, "marketplace_name": "Ordinals Wallet", "marketplace_url": "https://ordinalswallet.com"},
     ]},
    {"handle": "runeandco", "name": "RUNE&CO", "type": "artist", "verified": True,
     "bio": "A studio inscribing type and glyphs. Everything is a manifest.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "X", "url": "https://x.com"}],
     "marketplaces": [{"name": "Magic Eden", "url": "https://magiceden.io"}],
     "collections": [
         {"id": "glyphs", "name": "Glyphset", "chain": "Bitcoin", "year": "2024", "pieces": 8, "marketplace_name": "Magic Eden", "marketplace_url": "https://magiceden.io"},
     ]},
    {"handle": "kane_eth", "name": "0xKANE", "type": "collector", "verified": True,
     "bio": "Collecting on-chain art across Bitcoin and Ethereum. Curating, not flexing the whole wallet.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "Discord", "url": "https://discord.com"}],
     "marketplaces": [{"name": "OpenSea", "url": "https://opensea.io"}],
     "collections": [
         {"id": "vault", "name": "The Vault", "chain": "Mixed", "year": "2021-25", "pieces": 8, "marketplace_name": "OpenSea", "marketplace_url": "https://opensea.io"},
     ]},
    {"handle": "degenjane", "name": "DEGENJANE", "type": "collector", "verified": False,
     "bio": "Early to Ordinals. Working with a few studios. Mostly here for the art.",
     "links": [{"label": "Website", "url": "https://example.com"}],
     "marketplaces": [{"name": "Gamma", "url": "https://gamma.io"}],
     "collections": [
         {"id": "picks", "name": "Jane Picks", "chain": "Bitcoin", "year": "2023-25", "pieces": 6, "marketplace_name": "", "marketplace_url": ""},
     ]},
    {"handle": "ord_whale", "name": "ORDWHALE", "type": "collector", "verified": True,
     "bio": "Long-term holder. Builder of tools for the space. Profile over plumbing.",
     "links": [{"label": "Website", "url": "https://example.com"}, {"label": "Tools", "url": "https://example.com"}, {"label": "Discord", "url": "https://discord.com"}],
     "marketplaces": [{"name": "Magic Eden", "url": "https://magiceden.io"}, {"name": "OpenSea", "url": "https://opensea.io"}],
     "collections": [
         {"id": "deep", "name": "Deep Holdings", "chain": "Mixed", "year": "2021-25", "pieces": 8, "marketplace_name": "Magic Eden", "marketplace_url": "https://magiceden.io"},
     ]},
]


@app.on_event("startup")
async def seed_demo():
    count = await db.users.count_documents({})
    if count == 0:
        for d in DEMO:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "twitter_id": f"demo-{d['handle']}",
                "demo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                **d,
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
