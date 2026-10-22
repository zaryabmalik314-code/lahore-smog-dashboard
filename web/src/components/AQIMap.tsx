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
    html: `<div style="position:relative;">
      <div style="
        position:absolute; top:-6px; left:-6px;
        width:52px; height:52px; border-radius:50%;
        background:${color}15;
        animation: pulse-glow 3s infinite;
      "></div>
      <div style="
        position:relative;
        background: linear-gradient(135deg, ${color}, ${color}cc);
        color: white;
        font-weight: 700;
        font-size: 13px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid ${color}40;
        box-shadow: 0 4px 16px ${color}40, inset 0 1px 0 rgba(255,255,255,0.15);
        font-family: system-ui;
      ">${aqi ?? "?"}</div>
    </div>`,
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
    }).setView([31.55, 74.38], 12);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap',
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

      const color = AQI_COLORS[station.category];
      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 200px;">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #27272a;">${station.name}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="font-size: 28px; font-weight: 700; color: ${color}; line-height: 1;">${station.aqi ?? "—"}</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${color}20; color: ${color}; font-weight: 600; text-transform: uppercase;">${AQI_LABELS[station.category]}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
            <div style="padding: 4px 6px; background: #111; border-radius: 4px;">
              <span style="color: #666; display: block; font-size: 9px; text-transform: uppercase;">PM2.5</span>
              <span style="color: #ddd; font-weight: 600;">${station.pm25 ?? "—"} ug/m3</span>
            </div>
            <div style="padding: 4px 6px; background: #111; border-radius: 4px;">
              <span style="color: #666; display: block; font-size: 9px; text-transform: uppercase;">PM10</span>
              <span style="color: #ddd; font-weight: 600;">${station.pm10 ?? "—"} ug/m3</span>
            </div>
            <div style="padding: 4px 6px; background: #111; border-radius: 4px;">
              <span style="color: #666; display: block; font-size: 9px; text-transform: uppercase;">Temp</span>
              <span style="color: #ddd; font-weight: 600;">${station.temperature ?? "—"} C</span>
            </div>
            <div style="padding: 4px 6px; background: #111; border-radius: 4px;">
              <span style="color: #666; display: block; font-size: 9px; text-transform: uppercase;">Wind</span>
              <span style="color: #ddd; font-weight: 600;">${station.wind_speed ?? "—"} m/s</span>
            </div>
          </div>
        </div>
      `);

      marker.addTo(map);
    });
  }, [stations]);

  return <div ref={mapRef} className="w-full h-[450px] rounded-xl" />;
}
