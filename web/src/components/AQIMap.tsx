"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AQI_COLORS, AQI_LABELS, type Station } from "@/lib/types";

interface AQIMapProps {
  stations: Station[];
}

function createMarkerIcon(aqi: number | null, category: string): L.DivIcon {
  const color = AQI_COLORS[category as keyof typeof AQI_COLORS] || "#71717a";
  return L.divIcon({
    className: "",
    html: `<div style="
      background: ${color};
      color: white;
      font-weight: 700;
      font-size: 13px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid ${color}40;
      box-shadow: 0 2px 8px ${color}60;
      font-family: system-ui;
    ">${aqi ?? "?"}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

export default function AQIMap({ stations }: AQIMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([31.52, 74.35], 12);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    stations.forEach((station) => {
      const marker = L.marker([station.latitude, station.longitude], {
        icon: createMarkerIcon(station.aqi, station.category),
      });

      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 180px;">
          <strong style="font-size: 14px;">${station.name}</strong>
          <div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
            <span style="color: #888;">AQI</span><span style="font-weight: 600; color: ${AQI_COLORS[station.category]}">${station.aqi ?? "—"}</span>
            <span style="color: #888;">PM2.5</span><span>${station.pm25 ?? "—"} µg/m³</span>
            <span style="color: #888;">PM10</span><span>${station.pm10 ?? "—"} µg/m³</span>
            <span style="color: #888;">Temp</span><span>${station.temperature ?? "—"}°C</span>
            <span style="color: #888;">Humidity</span><span>${station.humidity ?? "—"}%</span>
            <span style="color: #888;">Wind</span><span>${station.wind_speed ?? "—"} m/s</span>
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: ${AQI_COLORS[station.category]}; font-weight: 600;">
            ${AQI_LABELS[station.category]}
          </div>
        </div>
      `);

      marker.addTo(map);
    });
  }, [stations]);

  return <div ref={mapRef} className="w-full h-[420px] rounded-xl" />;
}
