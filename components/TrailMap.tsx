"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { getWaypoint } from "@/lib/data";
import { dateForDay, formatShortDate, overnightPins } from "@/lib/dates";
import {
  isOfflineReady,
  prepareOfflineTiles,
  readOfflineStatus,
  type OfflineStatus,
  type PrepareProgress,
} from "@/lib/offline-tiles";
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

function LocateUser({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!enabled) {
      map.stopLocate();
      setPosition(null);
      return;
    }

    map.locate({ watch: true, enableHighAccuracy: true, setView: false, maxZoom: 12 });

    function onFound(event: L.LocationEvent) {
      setPosition([event.latlng.lat, event.latlng.lng]);
      map.setView(event.latlng, Math.max(map.getZoom(), 12));
    }

    map.on("locationfound", onFound);
    return () => {
      map.off("locationfound", onFound);
      map.stopLocate();
    };
  }, [enabled, map]);

  if (!position) return null;
  return (
    <Marker position={position} icon={userIcon()} zIndexOffset={500}>
      <Popup>You are here. Phone GPS works without mobile signal once the offline map is saved.</Popup>
    </Marker>
  );
}

export default function TrailMap() {
  const [trail, setTrail] = useState<GeoJsonObject | null>(null);
  const [tracking, setTracking] = useState(false);
  const [offline, setOffline] = useState<OfflineStatus | null>(null);
  const [prep, setPrep] = useState<PrepareProgress | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const pins = useMemo(() => overnightPins(), []);
  const start = getWaypoint("telegraph");
  const sonder = getWaypoint("sonder");
  const ready = offline ? isOfflineReady(offline) : false;

  useEffect(() => {
    setOffline(readOfflineStatus());
    fetch("/data/trail.geojson")
      .then((res) => res.json())
      .then(setTrail)
      .catch(() => setTrail(null));
  }, []);

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
        <a className="btn ghost" href="/data/camps.gpx" download>
          Camp GPX
        </a>
      </div>
      {ready ? (
        <p className="offline-flag">Offline map ready · {offline?.tileCount} tiles</p>
      ) : null}
      {prepError ? <p className="offline-flag offline-flag-warn">{prepError}</p> : null}
      <MapContainer
        center={[-23.68, 133.15]}
        zoom={9}
        maxZoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          subdomains={["a", "b", "c"]}
        />
        {trail ? <GeoJSON data={trail} style={{ color: "#d46a2c", weight: 4, opacity: 0.95 }} /> : null}
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
        <LocateUser enabled={tracking} />
      </MapContainer>
    </div>
  );
}
