import requests

TOKEN = "8f2b5d94e2c171d58df4fd3de6d3be173df56037"

stations = [
    ("@11765", "US Embassy Lahore"),
    ("@576556", "Punjab University"),
    ("@74005", "Lahore Cantonment"),
    ("@541762", "College Road, Wapda Town"),
    ("@471607", "G.O.R. Lahore"),
    ("@541369", "IEEE, Punjab University"),
    ("@582631", "Wagha Border"),
]

print("Testing WAQI API with real token...\n")
for sid, name in stations:
    url = f"https://api.waqi.info/feed/{sid}/?token={TOKEN}"
    try:
        r = requests.get(url, timeout=15)
        d = r.json()
        if d.get("status") == "ok":
            data = d["data"]
            city = data.get("city", {})
            iaqi = data.get("iaqi", {})
            print(f"{name}:")
            print(f"  AQI: {data.get('aqi')}")
            print(f"  PM2.5: {iaqi.get('pm25', {}).get('v', 'N/A')}")
            print(f"  Station: {city.get('name')}")
            print(f"  Coords: {city.get('geo')}")
            print()
        else:
            print(f"{name}: ERROR - {d.get('data')}\n")
    except Exception as e:
        print(f"{name}: Exception - {e}\n")
