"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AQI_COLORS, AQI_INK, AQI_LABELS, SOURCE_TIER_LABELS, type Station } from "@/lib/types";

interface AQIMapProps {
  stations: Station[];
}

function createMarkerIcon(aqi: number | null, category: string): L.DivIcon {
  const color = AQI_COLORS[category as keyof typeof AQI_COLORS] || "#8b8b84";
  // Moderate's fill is too light to carry white text; switch to dark ink there.
  const textColor = category === "moderate" ? "#2a1f00" : "#ffffff";
  return L.divIcon({
    className: "",
    html: `<div style="
        background: ${color};
        color: ${textColor};
        font-weight: 700;
        font-size: 13px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.35);
        font-variant-numeric: tabular-nums;
        font-family: system-ui, sans-serif;
      ">${aqi ?? "?"}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function AQIMap({ stations }: AQIMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);

  /**
   * Frame every station rather than using a fixed zoom. At a narrow container
   * width a fixed zoom leaves the outlying stations — Wagha Border, Lathepur —
   * outside the viewport entirely.
   */
  const fitToStations = (map: L.Map) => {
    const b = boundsRef.current;
    if (!b || !b.isValid()) return;
    map.fitBounds(b, { padding: [36, 36], maxZoom: 13, animate: false });
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([31.55, 74.38], 12);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // OSM standard tiles need no API key. They are desaturated in CSS so the
    // basemap stays recessive and the AQI markers carry the only strong colour.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Leaflet caches the container size at init, so a panel that is still
    // settling (fonts, fade-in, responsive reflow) leaves it tiling only the
    // area it first measured. Re-measure whenever the box changes, then refit.
    //
    // The two steps must land in separate frames. Changing the view in the same
    // frame as invalidateSize cancels the tile fetch that invalidateSize just
    // started, which left the grid covering the old, narrower box and the rest
    // of the container blank.
    let frame = 0;
    const resync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
        frame = requestAnimationFrame(() => fitToStations(map));
      });
    };

    const observer = new ResizeObserver(resync);
    observer.observe(mapRef.current);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
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

      const ink = AQI_INK[station.category];
      const cell = (label: string, value: string) => `
        <div style="padding: 5px 7px; background: #f4f4f1; border: 1px solid #dcdcd6;">
          <span style="color: #6b7280; display: block; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600;">${label}</span>
          <span style="color: #16181d; font-weight: 600; font-variant-numeric: tabular-nums;">${value}</span>
        </div>`;

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 210px;">
          <div style="font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; font-weight: 600;">${SOURCE_TIER_LABELS[station.tier]} station</div>
          <div style="font-size: 14px; font-weight: 600; color: #16181d; margin-top: 2px; padding-bottom: 8px; border-bottom: 1px solid #dcdcd6;">${station.name.replace(/, Pakistan$/, "")}</div>
          <div style="display: flex; align-items: baseline; gap: 8px; margin: 10px 0;">
            <span style="font-size: 30px; font-weight: 700; color: ${ink}; line-height: 1; font-variant-numeric: tabular-nums;">${station.aqi ?? "—"}</span>
            <span style="font-size: 11px; color: ${ink}; font-weight: 600;">${AQI_LABELS[station.category]}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
            ${cell("PM2.5", station.pm25 != null ? `${station.pm25} µg/m³` : "no sensor")}
            ${cell("PM10", station.pm10 != null ? `${station.pm10} µg/m³` : "no sensor")}
          </div>
          <div style="margin-top: 8px; font-size: 10px; color: #6b7280;">${station.attribution}</div>
        </div>
      `);

      marker.addTo(map);
    });

    const coords = stations
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .map((s) => [s.latitude, s.longitude] as [number, number]);

    boundsRef.current = coords.length ? L.latLngBounds(coords) : null;
    fitToStations(map);
  }, [stations]);

  return <div ref={mapRef} className="w-full h-[420px]" />;
}
