"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import { days, getWaypoint } from "@/lib/data";
import "leaflet/dist/leaflet.css";

export default function TrailMap() {
  const [trail, setTrail] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    fetch("/data/trail.geojson")
      .then((res) => res.json())
      .then(setTrail)
      .catch(() => setTrail(null));
  }, []);

  const camps = days
    .map((day) => {
      const point = getWaypoint(day.waypointId);
      return point ? { day, point } : null;
    })
    .filter((item): item is { day: (typeof days)[number]; point: NonNullable<ReturnType<typeof getWaypoint>> } => Boolean(item));

  return (
    <div className="map-shell">
      <MapContainer
        center={[-23.68, 133.15]}
        zoom={9}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='Tiles © Esri — trail © OpenStreetMap'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {trail ? (
          <GeoJSON
            data={trail}
            style={{ color: "#f0a05a", weight: 3, opacity: 0.95 }}
          />
        ) : null}
        {camps.map(({ day, point }) => (
          <CircleMarker
            key={`${day.id}-${point.id}`}
            center={[point.lat, point.lng]}
            radius={day.kind === "summit" ? 9 : 6}
            pathOptions={{
              color: "#140c08",
              weight: 1,
              fillColor: day.kind === "rest" ? "#7ea08a" : day.kind === "summit" ? "#f0a05a" : "#d46a2c",
              fillOpacity: 0.95,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              {day.dayLabel}: {point.name}
            </Tooltip>
            <Popup>
              <strong>
                {day.dayLabel} · {day.title}
              </strong>
              <br />
              {point.name}
              <br />
              {day.km > 0 ? `${day.km} km` : day.hours}
              <br />
              <a href={`/itinerary/${day.id}`}>Open day</a>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
