"""Tests for the discovery (recent/top) and likes endpoints."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/recent ----------
class TestRecent:
    def test_recent_returns_works_array(self, session):
        r = session.get(f"{API}/recent?limit=8", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "works" in data and isinstance(data["works"], list)
        assert len(data["works"]) > 0, "expected demo works to be seeded"
        assert len(data["works"]) <= 8

    def test_recent_entry_shape(self, session):
        r = session.get(f"{API}/recent?limit=8", timeout=30)
        works = r.json()["works"]
        required = {"handle", "name", "type", "cid", "work_id",
                    "title", "image", "uploaded_at", "like_key", "likes"}
        for w in works:
            missing = required - set(w.keys())
            assert not missing, f"missing keys {missing} in {w}"
            assert w["like_key"] == f"{w['handle']}:{w['cid']}:{w['work_id']}"
            assert isinstance(w["likes"], int) and w["likes"] >= 0

    def test_recent_at_most_two_per_handle(self, session):
        r = session.get(f"{API}/recent?limit=24", timeout=30)
        works = r.json()["works"]
        counts = {}
        for w in works:
            counts[w["handle"]] = counts.get(w["handle"], 0) + 1
        for h, n in counts.items():
            assert n <= 2, f"handle {h} appears {n} times (cap is 2)"

    def test_recent_limit_param(self, session):
        r = session.get(f"{API}/recent?limit=4", timeout=30)
        assert len(r.json()["works"]) <= 4


# ---------- /api/top ----------
class TestTop:
    def test_top_works_array(self, session):
        r = session.get(f"{API}/top?limit=8", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "works" in data and isinstance(data["works"], list)
        assert len(data["works"]) <= 8

    def test_top_sorted_by_likes_desc(self, session):
        r = session.get(f"{API}/top?limit=24", timeout=30)
        works = r.json()["works"]
        likes_series = [w["likes"] for w in works]
        assert likes_series == sorted(likes_series, reverse=True)

    def test_top_reflects_likes(self, session):
        # Take one work, like it many times, then verify it bubbles up.
        r = session.get(f"{API}/recent?limit=8", timeout=30)
        work = r.json()["works"][0]
        key = work["like_key"]
        # add 5 likes
        for _ in range(5):
            session.post(f"{API}/likes", json={"key": key, "action": "like"})
        r = session.get(f"{API}/top?limit=24", timeout=30)
        works = r.json()["works"]
        # Find that key
        match = next((w for w in works if w["like_key"] == key), None)
        assert match is not None
        assert match["likes"] >= 5
        # cleanup
        for _ in range(5):
            session.post(f"{API}/likes", json={"key": key, "action": "unlike"})


# ---------- /api/likes ----------
class TestLikes:
    def test_like_increments(self, session):
        key = f"TEST_{uuid.uuid4().hex[:8]}:c:w"
        r = session.post(f"{API}/likes", json={"key": key, "action": "like"})
        assert r.status_code == 200
        data = r.json()
        assert data["key"] == key
        assert data["count"] == 1
        r2 = session.post(f"{API}/likes", json={"key": key, "action": "like"})
        assert r2.json()["count"] == 2

    def test_unlike_decrements_and_floors_at_zero(self, session):
        key = f"TEST_{uuid.uuid4().hex[:8]}:c:w"
        # one like, one unlike => 0
        session.post(f"{API}/likes", json={"key": key, "action": "like"})
        r = session.post(f"{API}/likes", json={"key": key, "action": "unlike"})
        assert r.json()["count"] == 0
        # unlike again should not go negative
        r2 = session.post(f"{API}/likes", json={"key": key, "action": "unlike"})
        assert r2.json()["count"] == 0

    def test_likes_missing_key_400(self, session):
        r = session.post(f"{API}/likes", json={"key": "", "action": "like"})
        assert r.status_code == 400

    def test_get_likes_returns_only_known_keys(self, session):
        k1 = f"TEST_{uuid.uuid4().hex[:8]}:c:w"
        k2 = f"TEST_{uuid.uuid4().hex[:8]}:c:w"
        unknown = f"TEST_{uuid.uuid4().hex[:8]}:c:w"
        session.post(f"{API}/likes", json={"key": k1, "action": "like"})
        session.post(f"{API}/likes", json={"key": k2, "action": "like"})
        session.post(f"{API}/likes", json={"key": k2, "action": "like"})

        r = session.get(f"{API}/likes", params={"keys": f"{k1},{k2},{unknown}"})
        assert r.status_code == 200
        counts = r.json()["counts"]
        assert counts.get(k1) == 1
        assert counts.get(k2) == 2
        assert unknown not in counts

    def test_get_likes_empty(self, session):
        r = session.get(f"{API}/likes")
        assert r.status_code == 200
        assert r.json() == {"counts": {}}
