"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Circle, useMap, ZoomControl, ScaleControl } from "react-leaflet";
import type { Feature, GeoJsonObject, LineString } from "geojson";
import L from "leaflet";
import ElevationProfile from "@/components/ElevationProfile";
import { getWaypoint } from "@/lib/data";
import { dateForDay, formatShortDate, overnightPins } from "@/lib/dates";
import {
  isOfflineReady,
  prepareOfflineTiles,
  readOfflineStatus,
  type OfflineStatus,
  type PrepareProgress,
} from "@/lib/offline-tiles";
import { daySegments, extractSegment, flattenTrailCoords, nearestDistanceM, walkingDays, type RouteCoord } from "@/lib/trail-geom";
import "leaflet/dist/leaflet.css";

function campIcon(label: string, name: string, kind: string) {
  return L.divIcon({
    className: "camp-marker",
    html: `<div class="camp-pin camp-pin-${kind}"><span class="camp-pin-dot">${label}</span><span class="camp-pin-label">${name}</span></div>`,
    iconSize: [160, 44],
    iconAnchor: [18, 18],
  });
}

function startIcon() {
  return L.divIcon({
    className: "camp-marker",
    html: `<div class="camp-pin camp-pin-start"><span class="camp-pin-dot">S</span><span class="camp-pin-label">Telegraph Station start</span></div>`,
    iconSize: [200, 44],
    iconAnchor: [18, 18],
  });
}

function userIcon() {
  return L.divIcon({
    className: "camp-marker",
    html: `<div class="you-pin" aria-label="Your location"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function LocateUser({
  enabled,
  trailCoords,
  onFix,
}: {
  enabled: boolean;
  trailCoords: RouteCoord[];
  onFix: (fix: { lat: number; lng: number; accuracy: number; offTrailM: number } | null) => void;
}) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) {
      map.stopLocate();
      setPosition(null);
      onFix(null);
      return;
    }

    map.locate({ watch: true, enableHighAccuracy: true, setView: false, maxZoom: 16 });

    function onFound(event: L.LocationEvent) {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;
      setPosition([lat, lng]);
      setAccuracy(event.accuracy);
      const offTrailM = nearestDistanceM(trailCoords, lat, lng);
      onFix({ lat, lng, accuracy: event.accuracy, offTrailM });
      if (first.current) {
        map.setView(event.latlng, Math.max(map.getZoom(), 16));
        first.current = false;
      } else {
        map.panTo(event.latlng);
      }
    }

    map.on("locationfound", onFound);
    return () => {
      map.off("locationfound", onFound);
      map.stopLocate();
    };
  }, [enabled, map, trailCoords, onFix]);

  if (!position) return null;
  return (
    <>
      <Circle
        center={position}
        radius={Math.max(accuracy, 4)}
        pathOptions={{ color: "#3d8bfd", weight: 1, fillOpacity: 0.12 }}
      />
      <Marker position={position} icon={userIcon()} zIndexOffset={500}>
        <Popup>
          You are here.
          <br />
          Phone GPS ±{Math.round(accuracy)} m
        </Popup>
      </Marker>
    </>
  );
}

function FitCoords({ coords }: { coords: RouteCoord[] }) {
  const map = useMap();
  const key = coords.length ? `${coords[0].join(",")}-${coords[coords.length - 1].join(",")}-${coords.length}` : "empty";

  useEffect(() => {
    if (coords.length < 2) return;
    const bounds = L.latLngBounds(coords.map(([lon, lat]) => [lat, lon] as [number, number]));
    map.fitBounds(bounds, {
      paddingTopLeft: [24, 128],
      paddingBottomRight: [48, 168],
      maxZoom: 13,
      animate: true,
    });
  }, [key, coords, map]);

  return null;
}

function lineFeature(coords: RouteCoord[]): Feature<LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords },
  };
}

export default function TrailMap() {
  const search = useSearchParams();
  const walkDays = useMemo(() => walkingDays(), []);
  const requested = search.get("day");
  const [selectedDay, setSelectedDay] = useState(requested && walkDays.some((d) => d.id === requested) ? requested : walkDays[0]?.id ?? "1");
  const [trail, setTrail] = useState<GeoJsonObject | null>(null);
  const [trailCoords, setTrailCoords] = useState<RouteCoord[]>([]);
  const [tracking, setTracking] = useState(false);
  const [offline, setOffline] = useState<OfflineStatus | null>(null);
  const [prep, setPrep] = useState<PrepareProgress | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [gpsFix, setGpsFix] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    offTrailM: number;
  } | null>(null);
  const pins = useMemo(() => overnightPins(), []);
  const start = getWaypoint("telegraph");
  const sonder = getWaypoint("sonder");
  const ready = offline ? isOfflineReady(offline) : false;
  const selected = walkDays.find((day) => day.id === selectedDay);

  useEffect(() => {
    if (requested && walkDays.some((d) => d.id === requested)) setSelectedDay(requested);
  }, [requested, walkDays]);

  useEffect(() => {
    setOffline(readOfflineStatus());
    fetch("/data/trail.geojson")
      .then((res) => res.json())
      .then((json) => {
        setTrail(json);
        setTrailCoords(flattenTrailCoords(json));
      })
      .catch(() => setTrail(null));
  }, []);

  const dayLine = useMemo(() => {
    if (!selected || trailCoords.length < 2) return null;
    const def = daySegments.find((item) => item.id === selected.id);
    if (!def) return null;
    const coords = extractSegment(trailCoords, def.fromId, def.toId, def.outAndBack);
    return coords.length >= 2 ? { coords, geo: lineFeature(coords) } : null;
  }, [selected, trailCoords]);

  async function saveOffline() {
    setPrepError(null);
    setPrep({ done: 0, total: 1, phase: "tiles" });
    try {
      const status = await prepareOfflineTiles(setPrep);
      setOffline(status);
    } catch (error) {
      setPrepError(error instanceof Error ? error.message : "Could not save the offline map.");
    } finally {
      setPrep(null);
    }
  }

  return (
    <div className="map-shell">
      <div className="map-tools">
        <button type="button" className="btn" onClick={() => setTracking((value) => !value)}>
          {tracking ? "Stop GPS" : "Show my location"}
        </button>
        <button type="button" className="btn ghost" onClick={saveOffline} disabled={Boolean(prep)}>
          {prep
            ? `Saving ${prep.done}/${prep.total}`
            : ready
              ? "Refresh offline map"
              : "Save offline map"}
        </button>
        <a className="btn ghost" href="/data/trail.gpx" download>
          Trail GPX
        </a>
        <a className="btn ghost" href="/data/camps.gpx" download>
          Camp GPX
        </a>
        <div className="day-chips" role="tablist" aria-label="Walking days">
          {walkDays.map((day) => (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={day.id === selectedDay}
              className={`day-chip${day.id === selectedDay ? " active" : ""}`}
              onClick={() => setSelectedDay(day.id)}
            >
              {day.dayLabel.replace("Day ", "D")}
            </button>
          ))}
        </div>
        {ready ? (
          <p className="offline-inline">Offline walking map ready · {offline?.tileCount} tiles · zoom to 15</p>
        ) : null}
        {gpsFix ? (
          <p className={`offline-inline${gpsFix.offTrailM > 40 ? " offline-inline-warn" : ""}`}>
            GPS ±{Math.round(gpsFix.accuracy)} m
            {Number.isFinite(gpsFix.offTrailM)
              ? gpsFix.offTrailM < 8
                ? " · on the mapped trail"
                : ` · ${Math.round(gpsFix.offTrailM)} m from the trail line`
              : ""}
          </p>
        ) : null}
        {prepError ? <p className="offline-inline offline-inline-warn">{prepError}</p> : null}
      </div>
      <MapContainer
        center={[-23.68, 133.15]}
        zoom={9}
        maxZoom={17}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <ZoomControl position="topright" />
        <ScaleControl imperial={false} position="bottomright" />
        <TileLayer
          attribution='&copy; OpenStreetMap, SRTM | &copy; OpenTopoMap (CC-BY-SA)'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          subdomains={["a", "b", "c"]}
          maxZoom={17}
        />
        {trail ? (
          <GeoJSON key="full-trail" data={trail} style={{ color: "#7a3d22", weight: 3, opacity: 0.45 }} />
        ) : null}
        {dayLine ? (
          <GeoJSON
            key={`day-${selectedDay}`}
            data={dayLine.geo}
            style={{ color: "#f0a05a", weight: 6, opacity: 1 }}
          />
        ) : null}
        {dayLine ? <FitCoords coords={dayLine.coords} /> : trailCoords.length > 1 ? <FitCoords coords={trailCoords} /> : null}
        {start ? (
          <Marker position={[start.lat, start.lng]} icon={startIcon()}>
            <Popup>
              <strong>Monday 12 April 2027</strong>
              <br />
              Official start: Alice Springs Telegraph Station
            </Popup>
          </Marker>
        ) : null}
        {sonder ? (
          <Marker
            position={[sonder.lat, sonder.lng]}
            icon={campIcon("MS", "Mt Sonder summit", "summit")}
          >
            <Popup>
              <strong>Saturday 1 May 2027</strong>
              <br />
              Mt Sonder sunrise, then transfer to Alice
            </Popup>
          </Marker>
        ) : null}
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={campIcon(pin.pinLabel, pin.name, pin.kind)}
            zIndexOffset={200}
          >
            <Popup>
              <strong>{pin.name}</strong>
              <br />
              {pin.nights.map((night) => (
                <span key={night.id}>
                  {formatShortDate(dateForDay(night))} · {night.dayLabel} · {night.camp}
                  <br />
                </span>
              ))}
              <a href={`/itinerary/${pin.nights[0].id}`}>Open this night</a>
            </Popup>
          </Marker>
        ))}
        <LocateUser enabled={tracking} trailCoords={trailCoords} onFix={setGpsFix} />
      </MapContainer>
      {selected ? (
        <div className="map-elev">
          <p className="map-elev-title">
            {selected.dayLabel} · {selected.title}
          </p>
          <ElevationProfile dayId={selected.id} compact />
        </div>
      ) : null}
    </div>
  );
}
