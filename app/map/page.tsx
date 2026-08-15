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
        <p className="kicker">Same offline method as the Australind map</p>
        <h1 className="section-title" style={{ marginTop: 6 }}>
          Trail map
        </h1>
        <p className="small">
          On Wi-Fi, tap <strong>Save offline map</strong>. That stores the Larapinta corridor, camp
          pins and the trail line on this phone, like the Australind app. After that,{" "}
          <strong>Show my location</strong> follows you with GPS even when there is no mobile
          signal. Add this site to your home screen before you leave Alice.
        </p>
      </div>
      <TrailMap />
    </main>
  );
}
