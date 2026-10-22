import os
from dotenv import load_dotenv

load_dotenv()

WAQI_TOKEN = os.getenv("WAQI_TOKEN", "")
OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/smog_dashboard")

LAHORE_STATIONS_WAQI = [
    {"id": "@11765", "name": "US Embassy Lahore"},
    {"id": "@-74005", "name": "Lahore Cantonment"},
    {"id": "@-538468", "name": "Naila Road"},
    {"id": "@-576577", "name": "Egerton Road"},
    {"id": "@-582631", "name": "Wagha Border"},
    {"id": "@-577588", "name": "Lathepur"},
]

LAHORE_BBOX = {
    "lat_min": 31.3,
    "lat_max": 31.7,
    "lon_min": 74.1,
    "lon_max": 74.5,
}

AQI_THRESHOLDS = {
    "good": (0, 50),
    "moderate": (51, 100),
    "unhealthy_sensitive": (101, 150),
    "unhealthy": (151, 200),
    "very_unhealthy": (201, 300),
    "hazardous": (301, 500),
}
