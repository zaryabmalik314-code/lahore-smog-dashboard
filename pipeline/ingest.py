import os
import sys
import json
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from sources.waqi import fetch_all_lahore
from config import AQI_THRESHOLDS

DB_AVAILABLE = False
try:
    import psycopg2
    from config import DATABASE_URL
    DB_AVAILABLE = bool(DATABASE_URL and "localhost" not in DATABASE_URL)
except Exception:
    pass


def get_aqi_category(aqi: int) -> str:
    for category, (low, high) in AQI_THRESHOLDS.items():
        if low <= aqi <= high:
            return category
    return "hazardous" if aqi > 500 else "unknown"


def save_to_db(readings: list[dict]):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    for r in readings:
        cur.execute(
            """INSERT INTO stations (external_id, name, source, latitude, longitude)
               VALUES (%s, %s, 'waqi', %s, %s)
               ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name""",
            (r["external_id"], r["name"], r["latitude"], r["longitude"]),
        )
        cur.execute("SELECT id FROM stations WHERE external_id = %s", (r["external_id"],))
        station_id = cur.fetchone()[0]
        cur.execute(
            """INSERT INTO readings
               (station_id, aqi, pm25, pm10, no2, so2, co, o3, temperature, humidity, wind_speed, recorded_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (station_id, r["aqi"], r["pm25"], r["pm10"], r["no2"], r["so2"],
             r["co"], r["o3"], r["temperature"], r["humidity"], r["wind_speed"],
             r["recorded_at"]),
        )
    conn.commit()
    cur.close()
    conn.close()


def save_to_json(readings: list[dict], path: str = "data/latest.json"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    output = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "stations": [],
    }
    for r in readings:
        aqi = r.get("aqi")
        output["stations"].append({
            **r,
            "category": get_aqi_category(aqi) if isinstance(aqi, int) else "unknown",
        })
    with open(path, "w") as f:
        json.dump(output, f, indent=2, default=str)
    return path


def main():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Fetching Lahore AQI data...")
    readings = fetch_all_lahore()
    print(f"  Got {len(readings)} station readings")

    for r in readings:
        aqi = r.get("aqi", "N/A")
        cat = get_aqi_category(aqi) if isinstance(aqi, int) else "?"
        print(f"  {r['name']}: AQI {aqi} ({cat})")

    if DB_AVAILABLE:
        save_to_db(readings)
        print("  Saved to database")

    path = save_to_json(readings)
    print(f"  Saved to {path}")

    return readings


if __name__ == "__main__":
    main()
