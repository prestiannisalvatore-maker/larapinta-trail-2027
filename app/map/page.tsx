"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const TrailMap = dynamic(() => import("@/components/TrailMap"), {
  ssr: false,
  loading: () => (
    <div className="map-shell" style={{ display: "grid", placeItems: "center" }}>
      <p className="small">Loading GPS map…</p>
    </div>
  ),
});

export default function MapPage() {
  return (
    <main>
      <div className="wrap" style={{ paddingBottom: 8 }}>
        <p className="kicker">Surveyed walking line · GPS follow</p>
        <h1 className="section-title" style={{ marginTop: 6 }}>
          Trail map
        </h1>
        <p className="small">
          The orange line is the OpenStreetMap Larapinta, rebuilt from the 12 official section
          relations in walking order — including the real Mt Sonder track. Camps are OSM surveyed
          sites. Tap a day, then <strong>Show my location</strong>: the blue dot is your phone GPS
          (usually 3–10 m, worse in gorges) and the ring is its accuracy. Zoom in to walking scale.
          On Wi-Fi, <strong>Save offline map</strong> stores terrain to zoom 15 plus the GPS files.
          Download <strong>Trail GPX</strong> into Gaia or Avenza as a backup. Carry the NT Parks
          paper maps too.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="map-shell" style={{ display: "grid", placeItems: "center" }}>
            <p className="small">Loading GPS map…</p>
          </div>
        }
      >
        <TrailMap />
      </Suspense>
    </main>
  );
}
