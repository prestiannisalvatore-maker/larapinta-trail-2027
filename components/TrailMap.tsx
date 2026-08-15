"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { getWaypoint } from "@/lib/data";
import { dateForDay, formatShortDate, overnightPins } from "@/lib/dates";
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

    map.locate({ watch: true, enableHighAccuracy: true, setView: false, maxZoom: 14 });

    function onFound(event: L.LocationEvent) {
      const next: [number, number] = [event.latlng.lat, event.latlng.lng];
      setPosition(next);
      map.setView(event.latlng, Math.max(map.getZoom(), 13));
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
      <Popup>You are here. This uses the phone GPS and needs a location permission. It is not a full offline trail map.</Popup>
    </Marker>
  );
}

export default function TrailMap() {
  const [trail, setTrail] = useState<GeoJsonObject | null>(null);
  const [tracking, setTracking] = useState(false);
  const pins = useMemo(() => overnightPins(), []);
  const start = getWaypoint("telegraph");
  const sonder = getWaypoint("sonder");

  useEffect(() => {
    fetch("/data/trail.geojson")
      .then((res) => res.json())
      .then(setTrail)
      .catch(() => setTrail(null));
  }, []);

  return (
    <div className="map-shell">
      <div className="map-tools">
        <button type="button" className="btn" onClick={() => setTracking((value) => !value)}>
          {tracking ? "Stop GPS" : "Show my location"}
        </button>
        <a className="btn ghost" href="/data/camps.gpx" download>
          Download camp GPX
        </a>
      </div>
      <MapContainer
        center={[-23.68, 133.15]}
        zoom={9}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="Tiles © Esri — trail © OpenStreetMap"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {trail ? <GeoJSON data={trail} style={{ color: "#f0a05a", weight: 4, opacity: 0.95 }} /> : null}
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
