"use client";

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
        <p className="kicker">OpenStreetMap relation 3066363</p>
        <h1 className="section-title" style={{ marginTop: 6 }}>
          Trail GPS
        </h1>
        <p className="small">
          Satellite map with the Larapinta alignment and your daily camps. Use it for planning — carry
          paper NT Parks section maps on the walk.
        </p>
      </div>
      <TrailMap />
    </main>
  );
}
