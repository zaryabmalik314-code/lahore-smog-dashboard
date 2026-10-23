"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AQI_COLORS, AQI_INK, AQI_LABELS, SOURCE_TIER_LABELS, type Station } from "@/lib/types";
import { idw, distanceToNearest, aqiRgb, type SamplePoint } from "@/lib/interpolate";

interface AQIMapProps {
  stations: Station[];
}

/** Painted in blocks of this many pixels — fine enough to read as smooth. */
const CELL = 6;
/** Beyond this many pixels from any station the surface fades out entirely. */
const FADE_START = 150;
const FADE_END = 320;

/**
 * The interpolated surface, drawn on a canvas pinned to the map pane.
 *
 * A pin map shows where the monitors are. This shows what the readings imply
 * about the air between them, which is the question actually being asked. It
 * is redrawn on every move because the projection changes with the view.
 */
function createSurfaceLayer(): L.Layer & { update: (s: Station[]) => void } {
  const Surface = L.Layer.extend({
    onAdd(
      this: L.Layer & { _canvas?: HTMLCanvasElement; _map: L.Map; redraw: () => void },
      map: L.Map
    ) {
      const canvas = L.DomUtil.create("canvas", "leaflet-zoom-animated") as HTMLCanvasElement;
      canvas.style.pointerEvents = "none";
      this._canvas = canvas;
      map.getPanes().overlayPane!.appendChild(canvas);
      map.on("moveend zoomend resize", () => this.redraw());
      this.redraw();
    },

    onRemove(this: L.Layer & { _canvas?: HTMLCanvasElement; _map: L.Map }) {
      this._canvas?.remove();
    },

    setStations(this: { _stations: Station[]; redraw: () => void }, stations: Station[]) {
      this._stations = stations;
      this.redraw();
    },

    redraw(this: {
      _canvas?: HTMLCanvasElement;
      _map?: L.Map;
      _stations?: Station[];
    }) {
      const map = this._map;
      const canvas = this._canvas;
      if (!map || !canvas) return;

      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, size.x, size.y);

      const usable = (this._stations || []).filter(
        (s) => !s.stale && typeof s.aqi === "number"
      );
      if (usable.length === 0) return;

      const samples: SamplePoint[] = usable.map((s) => {
        const p = map.latLngToContainerPoint([s.latitude, s.longitude]);
        return { x: p.x, y: p.y, value: s.aqi as number };
      });

      for (let y = 0; y < size.y; y += CELL) {
        for (let x = 0; x < size.x; x += CELL) {
          const cx = x + CELL / 2;
          const cy = y + CELL / 2;

          const near = distanceToNearest(cx, cy, samples);
          if (near > FADE_END) continue;

          const value = idw(cx, cy, samples);
          const [r, g, b] = aqiRgb(value);

          // Opacity falls with distance from the nearest station, so the
          // surface does not assert a reading where nothing supports one.
          const fade =
            near <= FADE_START ? 1 : 1 - (near - FADE_START) / (FADE_END - FADE_START);

          ctx.fillStyle = `rgba(${r},${g},${b},${(0.42 * fade).toFixed(3)})`;
          ctx.fillRect(x, y, CELL, CELL);
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layer = new (Surface as any)() as L.Layer & {
    setStations: (s: Station[]) => void;
  };
  return Object.assign(layer, { update: (s: Station[]) => layer.setStations(s) });
}


/** Key for the surface, pinned inside the map. */
function addLegend(map: L.Map) {
  const control = new L.Control({ position: "bottomleft" });
  control.onAdd = () => {
    const div = L.DomUtil.create("div");
    div.style.cssText =
      "background:var(--paper-raised);border:1px solid var(--panel-border);" +
      "border-radius:8px;padding:8px 10px;box-shadow:0 2px 10px rgba(0,0,0,0.35);" +
      "font-family:system-ui,sans-serif;";
    const bands = [
      ["Good", "var(--aqi-good)"],
      ["Moderate", "var(--aqi-moderate)"],
      ["Sensitive", "var(--aqi-unhealthy-sensitive)"],
      ["Unhealthy", "var(--aqi-unhealthy)"],
      ["Very unhealthy", "var(--aqi-very-unhealthy)"],
      ["Hazardous", "var(--aqi-hazardous)"],
    ];
    div.innerHTML =
      '<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;' +
      'color:var(--ink-3);margin-bottom:5px;">Interpolated index</div>' +
      '<div style="display:flex;gap:2px;margin-bottom:4px;">' +
      bands
        .map(
          ([, c]) =>
            `<span style="width:22px;height:6px;background:${c};display:block;"></span>`
        )
        .join("") +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;font-size:8px;color:var(--ink-3);">' +
      "<span>0</span><span>500</span></div>";
    return div;
  };
  control.addTo(map);
}

function createMarkerIcon(aqi: number | null, category: string): L.DivIcon {
  const color = AQI_COLORS[category as keyof typeof AQI_COLORS] || "var(--aqi-unknown)";
  // Which categories carry light or dark labels differs per theme — several
  // console-theme marks are bright — so the pairing is a token, not a guess.
  const key = (category in AQI_COLORS ? category : "unknown").replace(/_/g, "-");
  const textColor = `var(--on-aqi-${key})`;
  return L.divIcon({
    className: "",
    html: `<div style="
        background: ${color};
        color: ${textColor};
        font-weight: 700;
        font-size: 13px;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(255,255,255,0.92);
        box-shadow: 0 2px 8px rgba(0,0,0,0.45);
        font-variant-numeric: tabular-nums;
        font-family: system-ui, sans-serif;
      ">${aqi ?? "?"}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export default function AQIMap({ stations }: AQIMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  /** Set once the viewer pans or zooms; the map stops reframing itself after. */
  const userMovedRef = useRef(false);
  /** True while we are moving the map ourselves, so our own moves aren't
      mistaken for the viewer taking control. */
  const selfMovingRef = useRef(false);
  const surfaceRef = useRef<(L.Layer & { update: (s: Station[]) => void }) | null>(null);

  /**
   * Frame every station rather than using a fixed zoom. At a narrow container
   * width a fixed zoom leaves the outlying stations — Wagha Border, Lathepur —
   * outside the viewport entirely.
   *
   * Never reframes after the viewer has moved the map: being yanked back to
   * the default extent mid-inspection is worse than an imperfect framing.
   */
  const fitToStations = (map: L.Map, force = false) => {
    const b = boundsRef.current;
    if (!b || !b.isValid()) return;
    if (userMovedRef.current && !force) return;

    selfMovingRef.current = true;
    map.fitBounds(b, { padding: [36, 36], maxZoom: 13, animate: false });
    // fitBounds settles synchronously with animate:false, but release on the
    // next tick so any trailing move event is still attributed to us.
    setTimeout(() => {
      selfMovingRef.current = false;
    }, 0);
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

    // Interpolated surface sits between the basemap and the markers.
    const surface = createSurfaceLayer();
    surface.addTo(map);
    surfaceRef.current = surface;
    addLegend(map);

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

    // Any pan or zoom the viewer performs hands them control of the extent.
    const claim = () => {
      if (!selfMovingRef.current) userMovedRef.current = true;
    };
    map.on("dragstart", claim);
    map.on("zoomstart", claim);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      surfaceRef.current = null;
      map.off("dragstart", claim);
      map.off("zoomstart", claim);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // The dashboard re-renders every second for the clock, handing this component
  // a new array each time. Keying the rebuild on what the markers actually show
  // stops the layer being torn down and refitted once a second.
  const signature = stations
    .map((s) => `${s.id}:${s.latitude},${s.longitude}:${s.aqi}:${s.category}`)
    .join("|");

  // Only the positions decide whether a reframe is warranted; a changing
  // reading should never move the map.
  const positionSignature = stations
    .map((s) => `${s.id}:${s.latitude},${s.longitude}`)
    .join("|");

  // Memoised on the signature so the marker effect receives a stable value
  // without reading a ref during render.
  const stationsForMap = useMemo(
    () => stations,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  );

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    stationsForMap.forEach((station) => {
      const marker = L.marker([station.latitude, station.longitude], {
        icon: createMarkerIcon(station.aqi, station.category),
      });

      const ink = AQI_INK[station.category];
      const cell = (label: string, value: string) => `
        <div style="padding: 5px 7px; background: var(--paper-sunk); border: 1px solid var(--rule);">
          <span style="color: var(--ink-3); display: block; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600;">${label}</span>
          <span style="color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums;">${value}</span>
        </div>`;

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 210px;">
          <div style="font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); font-weight: 600;">${SOURCE_TIER_LABELS[station.tier]} station</div>
          <div style="font-size: 14px; font-weight: 600; color: var(--ink); margin-top: 2px; padding-bottom: 8px; border-bottom: 1px solid var(--rule);">${station.name.replace(/, Pakistan$/, "")}</div>
          <div style="display: flex; align-items: baseline; gap: 8px; margin: 10px 0;">
            <span style="font-size: 30px; font-weight: 700; color: ${ink}; line-height: 1; font-variant-numeric: tabular-nums;">${station.aqi ?? "—"}</span>
            <span style="font-size: 11px; color: ${ink}; font-weight: 600;">${AQI_LABELS[station.category]}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
            ${cell("PM2.5", station.pm25 != null ? `${station.pm25} µg/m³` : "no sensor")}
            ${cell("PM10", station.pm10 != null ? `${station.pm10} µg/m³` : "no sensor")}
          </div>
          <div style="margin-top: 8px; font-size: 10px; color: var(--ink-3);">${station.attribution}</div>
        </div>
      `);

      marker.addTo(map);
    });

    const coords = stationsForMap
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .map((s) => [s.latitude, s.longitude] as [number, number]);

    surfaceRef.current?.update(stationsForMap);

    boundsRef.current = coords.length ? L.latLngBounds(coords) : null;
  }, [stationsForMap]);

  // Reframe only when which points are on the map changes, and only while the
  // viewer has not taken control.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) fitToStations(map);
  }, [positionSignature]);

  return <div ref={mapRef} className="w-full h-[420px]" />;
}
