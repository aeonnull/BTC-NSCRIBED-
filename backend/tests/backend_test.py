"""nscribed backend test suite (pytest).

Covers: public profiles, auth-gated edit, ownership, uploads + public file fetch,
holder gate (unconfigured), /auth/me.
"""
import io
import os
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

TESTARTIST_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiI4ODUxNjlhMy02ZDZjLTRmOWUtOTM1My03N2MxMTcyMzUxMTEiLCJleHAiOjE3ODUxODUyODF9."
    "fWOwHUT7VrSb3txYryImF-ZZAuFkKBDrvcAXNjwWPm0"
)
TESTARTIST_ID = "885169a3-6d6c-4f9e-9353-77c117235111"


@pytest.fixture(scope="session")
def auth_headers():
    return {"Authorization": f"Bearer {TESTARTIST_TOKEN}"}


def _make_png_bytes() -> bytes:
    """Create a tiny valid 1x1 PNG (no Pillow dep)."""
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00" + b"\xff\x00\x00"
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ---------------- Public viewing ----------------
class TestPublicProfiles:
    def test_list_profiles_no_auth(self):
        r = requests.get(f"{API}/profiles", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "artists" in data and "collectors" in data
        assert isinstance(data["artists"], list) and len(data["artists"]) >= 1
        assert isinstance(data["collectors"], list) and len(data["collectors"]) >= 1
        # holder must never appear in public list
        for u in data["artists"] + data["collectors"]:
            assert "holder" not in u, f"holder leaked in list for {u.get('handle')}"

    def test_get_profile_by_handle_no_auth(self):
        r = requests.get(f"{API}/profiles/btc_mio", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["handle"] == "btc_mio"
        assert "holder" not in data, "holder leaked in public profile"
        for f in ("name", "type", "bio", "avatar", "links", "marketplaces", "collections"):
            assert f in data

    def test_get_profile_not_found(self):
        r = requests.get(f"{API}/profiles/__does_not_exist__", timeout=30)
        assert r.status_code == 404


# ---------------- Auth required for edit ----------------
class TestEditAuthRequired:
    def test_put_me_no_token_401(self):
        r = requests.put(f"{API}/profiles/me", json={"bio": "x"}, timeout=30)
        assert r.status_code == 401

    def test_put_me_garbage_token_401(self):
        r = requests.put(f"{API}/profiles/me",
                         headers={"Authorization": "Bearer garbage.token.value"},
                         json={"bio": "x"}, timeout=30)
        assert r.status_code == 401


# ---------------- Ownership ----------------
class TestOwnership:
    def test_edit_only_self(self, auth_headers):
        # snapshot demo user before
        before = requests.get(f"{API}/profiles/btc_mio", timeout=30).json()
        new_bio = "TEST_bio updated by testartist suite"
        payload = {
            "name": "TEST Artist",
            "bio": new_bio,
            "type": "artist",
            "marketplaces": [{"name": "OpenSea", "url": "https://opensea.io"}],
            "collections": [],
        }
        r = requests.put(f"{API}/profiles/me", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["handle"] == "testartist"
        assert body["bio"] == new_bio
        assert body["name"] == "TEST Artist"

        # verify with public GET
        pub = requests.get(f"{API}/profiles/testartist", timeout=30).json()
        assert pub["bio"] == new_bio
        assert "holder" not in pub

        # demo profile of btc_mio must be unchanged
        after = requests.get(f"{API}/profiles/btc_mio", timeout=30).json()
        assert after["bio"] == before["bio"]
        assert after["name"] == before["name"]

    def test_no_endpoint_to_edit_other_handles(self, auth_headers):
        # there is no PUT /profiles/{handle}
        r = requests.put(f"{API}/profiles/btc_mio", headers=auth_headers,
                         json={"bio": "hax"}, timeout=30)
        assert r.status_code in (404, 405)


# ---------------- Upload + public file fetch ----------------
class TestUpload:
    uploaded_url = None
    uploaded_path = None

    def test_upload_no_token_401(self):
        r = requests.post(f"{API}/upload",
                          files={"file": ("a.png", _make_png_bytes(), "image/png")},
                          timeout=60)
        assert r.status_code == 401

    def test_upload_non_image_rejected(self, auth_headers):
        r = requests.post(f"{API}/upload", headers=auth_headers,
                          files={"file": ("a.txt", b"hello world", "text/plain")},
                          timeout=60)
        assert r.status_code == 400

    def test_upload_png_ok_and_public_fetch(self, auth_headers):
        png = _make_png_bytes()
        r = requests.post(f"{API}/upload", headers=auth_headers,
                          files={"file": ("a.png", png, "image/png")},
                          timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and "url" in body
        assert TESTARTIST_ID in body["path"]
        TestUpload.uploaded_url = body["url"]
        TestUpload.uploaded_path = body["path"]

        # fetch without auth must succeed
        g = requests.get(body["url"], timeout=60)
        assert g.status_code == 200
        ct = g.headers.get("content-type", "")
        assert ct.startswith("image/"), f"unexpected content-type {ct}"


# ---------------- Holder gate ----------------
class TestHolder:
    def test_status_no_token_401(self):
        r = requests.get(f"{API}/holder/status", timeout=30)
        assert r.status_code == 401

    def test_status_with_token(self, auth_headers):
        r = requests.get(f"{API}/holder/status", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data.get("configured") is False
        assert data.get("holder") is False

    def test_start_503_when_not_configured(self, auth_headers):
        r = requests.post(f"{API}/holder/start", headers=auth_headers, timeout=30)
        assert r.status_code == 503


# ---------------- /auth/me ----------------
class TestAuthMe:
    def test_me_no_token_401(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == TESTARTIST_ID
        assert data["handle"] == "testartist"
        assert "holder" in data
        assert isinstance(data["holder"], bool)
