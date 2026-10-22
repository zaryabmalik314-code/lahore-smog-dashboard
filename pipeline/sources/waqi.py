import requests
from datetime import datetime, timezone
from config import WAQI_TOKEN, LAHORE_STATIONS_WAQI


def fetch_station(station_id: str) -> dict | None:
    url = f"https://api.waqi.info/feed/{station_id}/?token={WAQI_TOKEN}"
    resp = requests.get(url, timeout=15)
    data = resp.json()
    if data.get("status") != "ok":
        return None
    return data["data"]


def parse_reading(raw: dict, station_ext_id: str) -> dict:
    iaqi = raw.get("iaqi", {})
    time_info = raw.get("time", {})
    recorded_at = time_info.get("iso", datetime.now(timezone.utc).isoformat())

    return {
        "external_id": station_ext_id,
        "name": raw.get("city", {}).get("name", "Unknown"),
        "latitude": raw.get("city", {}).get("geo", [31.5, 74.3])[0],
        "longitude": raw.get("city", {}).get("geo", [31.5, 74.3])[1],
        "aqi": raw.get("aqi"),
        "pm25": iaqi.get("pm25", {}).get("v"),
        "pm10": iaqi.get("pm10", {}).get("v"),
        "no2": iaqi.get("no2", {}).get("v"),
        "so2": iaqi.get("so2", {}).get("v"),
        "co": iaqi.get("co", {}).get("v"),
        "o3": iaqi.get("o3", {}).get("v"),
        "temperature": iaqi.get("t", {}).get("v"),
        "humidity": iaqi.get("h", {}).get("v"),
        "wind_speed": iaqi.get("w", {}).get("v"),
        "recorded_at": recorded_at,
    }


def fetch_all_lahore() -> list[dict]:
    readings = []
    for station in LAHORE_STATIONS_WAQI:
        raw = fetch_station(station["id"])
        if raw:
            reading = parse_reading(raw, station["id"])
            reading["name"] = station["name"]
            readings.append(reading)
    return readings
