import { useEffect, useRef, useState } from 'react';
import {
  config,
  Map as MapLibreMap,
  NavigationControl,
  GeolocateControl,
  Marker,
  Popup,
  type GeoJSONSource,
  type StyleSpecification,
} from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Ensure MapLibre Web Worker loads reliably in both Vite dev pre-bundling and production builds
config.WORKER_URL = maplibreWorkerUrl;

export type ModernMapStyle = 'standar' | 'gelap' | 'satelit';

export interface MapCircleItem {
  id: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  label?: string;
  color?: string;
}

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  color?: string;
  variant?: 'staff' | 'area' | 'pin';
  pulse?: boolean;
}

interface ModernMapProps {
  center: [number, number]; // [lat, lng]
  zoom?: number;
  pitch?: number;
  defaultStyle?: ModernMapStyle;
  circles?: MapCircleItem[];
  markers?: MapMarkerItem[];
  interactivePin?: {
    lat: number;
    lng: number;
    label?: string;
    onChange: (lat: number, lng: number) => void;
  };
  followCenter?: boolean;
  showControls?: boolean;
  showStyleSwitcher?: boolean;
  className?: string;
}

const STYLE_URLS: Record<'standar' | 'gelap', string> = {
  standar: 'https://tiles.openfreemap.org/styles/liberty',
  gelap: 'https://tiles.openfreemap.org/styles/dark',
};

// 100% Free Satellite Hybrid (Esri World Imagery + Road & Place Labels, zero API key required)
const SATELLITE_HYBRID_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    'esri-transportation': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    'esri-places': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'esri-imagery-layer', type: 'raster', source: 'esri-imagery' },
    {
      id: 'esri-transportation-layer',
      type: 'raster',
      source: 'esri-transportation',
      paint: { 'raster-opacity': 0.85 },
    },
    { id: 'esri-places-layer', type: 'raster', source: 'esri-places' },
  ],
};

function getStyleSpec(mode: ModernMapStyle): string | StyleSpecification {
  return mode === 'satelit' ? SATELLITE_HYBRID_STYLE : STYLE_URLS[mode];
}

function createGeodesicCircleCoords(
  lat: number,
  lng: number,
  radiusMeters: number,
  steps = 64
): [number, number][] {
  const coords: [number, number][] = [];
  const earthRadius = 6371008.8;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angularDist = Math.max(10, radiusMeters) / earthRadius;

  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDist) +
        Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearing)
    );
    const pLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDist) * Math.cos(latRad),
        Math.cos(angularDist) - Math.sin(latRad) * Math.sin(pLat)
      );
    coords.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }
  return coords;
}

function buildCirclesGeoJSON(circles: MapCircleItem[]) {
  return {
    type: 'FeatureCollection' as const,
    features: circles
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && Number.isFinite(c.radiusMeters))
      .map((c) => ({
        type: 'Feature' as const,
        properties: { id: c.id, color: c.color || '#1ed760' },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [createGeodesicCircleCoords(c.lat, c.lng, c.radiusMeters)],
        },
      })),
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createMarkerElement(item: MapMarkerItem): HTMLElement {
  const color = item.color || '#1ed760';
  const wrapper = document.createElement('div');
  wrapper.style.cursor = 'pointer';

  if (item.variant === 'area') {
    wrapper.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#121212;border:2px solid ${color};box-shadow:0 4px 12px rgba(0,0,0,0.45);">
        <div style="width:9px;height:9px;border-radius:9999px;background:${color};"></div>
      </div>
    `;
    return wrapper;
  }

  if (item.variant === 'pin') {
    wrapper.innerHTML = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translateY(-50%);">
        <div style="width:28px;height:28px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:${color};border:3px solid #ffffff;box-shadow:0 6px 16px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;">
          <div style="width:8px;height:8px;border-radius:9999px;background:#121212;transform:rotate(45deg);"></div>
        </div>
      </div>
    `;
    return wrapper;
  }

  // Staff live marker with subtle pulse ring
  wrapper.innerHTML = `
    <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      ${
        item.pulse
          ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:0.32;animation:siapPing 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>`
          : ''
      }
      <span style="position:relative;width:14px;height:14px;border-radius:9999px;background:${color};border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></span>
    </div>
  `;
  return wrapper;
}

export function ModernMap({
  center,
  zoom = 15.5,
  pitch = 30,
  defaultStyle = 'standar',
  circles = [],
  markers = [],
  interactivePin,
  followCenter = false,
  showControls = true,
  showStyleSwitcher = true,
  className = '',
}: ModernMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pinMarkerRef = useRef<Marker | null>(null);
  const interactivePinRef = useRef(interactivePin);
  interactivePinRef.current = interactivePin;

  const circlesRef = useRef(circles);
  circlesRef.current = circles;

  const [mapStyle, setMapStyle] = useState<ModernMapStyle>(defaultStyle);
  const appliedStyleRef = useRef<ModernMapStyle>(defaultStyle);

  const safeLat = Number.isFinite(center[0]) ? center[0] : -6.2088;
  const safeLng = Number.isFinite(center[1]) ? center[1] : 106.8456;

  // Safely attach or update GeoJSON geofence circles on the active MapLibre style
  const syncCirclesLayer = (map: MapLibreMap, items: MapCircleItem[]) => {
    try {
      if (!map.getStyle() || !map.isStyleLoaded()) return;
      const data = buildCirclesGeoJSON(items);
      const existing = map.getSource('siap-geofences') as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
        return;
      }
      map.addSource('siap-geofences', { type: 'geojson', data });
      if (!map.getLayer('siap-geofences-fill')) {
        map.addLayer({
          id: 'siap-geofences-fill',
          type: 'fill',
          source: 'siap-geofences',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.16,
          },
        });
      }
      if (!map.getLayer('siap-geofences-stroke')) {
        map.addLayer({
          id: 'siap-geofences-stroke',
          type: 'line',
          source: 'siap-geofences',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2.5,
            'line-opacity': 0.9,
          },
        });
      }
    } catch {
      // Ignore transient style swap window; style.load will re-invoke
    }
  };

  // Initialize MapLibre instance
  useEffect(() => {
    if (!containerRef.current) return;

    appliedStyleRef.current = mapStyle;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: getStyleSpec(mapStyle),
      center: [safeLng, safeLat],
      zoom,
      pitch: mapStyle === 'satelit' ? 0 : pitch,
      bearing: 0,
      attributionControl: false,
    });

    mapRef.current = map;

    if (showControls) {
      map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(
        new GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }),
        'top-right'
      );
    }

    map.on('style.load', () => {
      syncCirclesLayer(map, circlesRef.current);
    });

    // Prevent unhandled tile/abort errors from crashing UI
    map.on('error', () => {});

    map.on('click', (e) => {
      if (interactivePinRef.current) {
        interactivePinRef.current.onChange(
          Number(e.lngLat.lat.toFixed(6)),
          Number(e.lngLat.lng.toFixed(6))
        );
      }
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    const t1 = setTimeout(() => map.resize(), 120);

    return () => {
      clearTimeout(t1);
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch basemap style cleanly only when user actively changes mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyleRef.current === mapStyle) return;
    appliedStyleRef.current = mapStyle;
    try {
      // diff: false avoids MapLibre v5 style-diff crashes when swapping vector <-> raster styles
      map.setStyle(getStyleSpec(mapStyle), { diff: false });
      map.easeTo({ pitch: mapStyle === 'satelit' ? 0 : pitch, duration: 350 });
    } catch {
      // Fallback: ignore if mid-unmount
    }
  }, [mapStyle, pitch]);

  // Smooth pan/center when coordinate primitives change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followCenter) return;
    if (Number.isFinite(safeLat) && Number.isFinite(safeLng)) {
      map.easeTo({ center: [safeLng, safeLat], duration: 450 });
    }
  }, [safeLat, safeLng, followCenter]);

  // Update GeoJSON circles whenever data updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncCirclesLayer(map, circles);
  }, [circles]);

  // Update Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((item) => {
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
      const el = createMarkerElement(item);
      const popupHtml = `
        <div style="font-family:Inter,sans-serif;padding:2px 4px;">
          <div style="font-weight:700;font-size:13px;color:#111827;">${escapeHtml(item.title)}</div>
          ${item.subtitle ? `<div style="font-size:11px;color:#4b5563;margin-top:2px;">${escapeHtml(item.subtitle)}</div>` : ''}
        </div>
      `;
      const popup = new Popup({ offset: 14, closeButton: false }).setHTML(popupHtml);
      const marker = new Marker({ element: el })
        .setLngLat([item.lng, item.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [markers]);

  // Draggable interactive pin (for Area Tugas picker)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!interactivePin || !Number.isFinite(interactivePin.lat) || !Number.isFinite(interactivePin.lng)) {
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      return;
    }

    if (!pinMarkerRef.current) {
      const el = createMarkerElement({
        id: 'picker-pin',
        lat: interactivePin.lat,
        lng: interactivePin.lng,
        title: interactivePin.label || 'Lokasi Terpilih',
        color: '#1ed760',
        variant: 'pin',
      });
      const pin = new Marker({ element: el, draggable: true })
        .setLngLat([interactivePin.lng, interactivePin.lat])
        .addTo(map);

      pin.on('dragend', () => {
        const pos = pin.getLngLat();
        interactivePinRef.current?.onChange(
          Number(pos.lat.toFixed(6)),
          Number(pos.lng.toFixed(6))
        );
      });

      pinMarkerRef.current = pin;
    } else {
      pinMarkerRef.current.setLngLat([interactivePin.lng, interactivePin.lat]);
    }
  }, [interactivePin]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={containerRef} className="w-full h-full" />

      {showStyleSwitcher && (
        <div
          className="absolute bottom-3 right-3 z-10 flex items-center p-1 rounded-full gap-1 shadow-lg"
          style={{
            background: 'rgba(24, 24, 24, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {(
            [
              { id: 'standar', label: 'Google Style' },
              { id: 'gelap', label: 'Gelap' },
              { id: 'satelit', label: 'Satelit' },
            ] as const
          ).map((opt) => {
            const active = mapStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMapStyle(opt.id);
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                style={{
                  background: active ? '#1ed760' : 'transparent',
                  color: active ? '#000000' : '#d4d4d4',
                  letterSpacing: '0.3px',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
