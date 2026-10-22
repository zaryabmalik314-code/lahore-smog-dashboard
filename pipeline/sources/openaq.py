import requests
from config import OPENAQ_API_KEY, LAHORE_BBOX


BASE_URL = "https://api.openaq.org/v3"
HEADERS = {"X-API-Key": OPENAQ_API_KEY} if OPENAQ_API_KEY else {}


def fetch_lahore_locations() -> list[dict]:
    params = {
        "coordinates": f"{(LAHORE_BBOX['lat_min'] + LAHORE_BBOX['lat_max'])/2},{(LAHORE_BBOX['lon_min'] + LAHORE_BBOX['lon_max'])/2}",
        "radius": 25000,
        "limit": 50,
    }
    resp = requests.get(f"{BASE_URL}/locations", headers=HEADERS, params=params, timeout=15)
    if resp.status_code != 200:
        return []
    return resp.json().get("results", [])


def fetch_sensor_latest(sensor_id: int) -> dict | None:
    resp = requests.get(f"{BASE_URL}/sensors/{sensor_id}", headers=HEADERS, timeout=15)
    if resp.status_code != 200:
        return None
    return resp.json().get("results", [None])[0]


def fetch_sensor_history(sensor_id: int, limit: int = 100) -> list[dict]:
    resp = requests.get(
        f"{BASE_URL}/sensors/{sensor_id}/hours",
        headers=HEADERS,
        params={"limit": limit},
        timeout=15,
    )
    if resp.status_code != 200:
        return []
    return resp.json().get("results", [])
