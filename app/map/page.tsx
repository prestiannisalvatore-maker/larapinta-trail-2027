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
        <p className="kicker">Camps from 12 April 2027</p>
        <h1 className="section-title" style={{ marginTop: 6 }}>
          Trail map
        </h1>
        <p className="small">
          Numbered pins are each night’s camp or hotel. S is the Telegraph Station start. 12 on the
          western end is the Mt Sonder summit. This is a planning map: it needs mobile data for the
          satellite pictures. It can show your GPS position if you tap Show my location, but it is
          not a reliable offline trail navigator. Download the camp GPX into Organic Maps, Gaia or
          Avenza and carry the NT Parks paper maps.
        </p>
      </div>
      <TrailMap />
    </main>
  );
}
