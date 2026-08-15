"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { elevationForDay, loadElevationPack, type DayElevation } from "@/lib/elevation";

export default function ElevationProfile({
  dayId,
  compact = false,
}: {
  dayId: string;
  compact?: boolean;
}) {
  const [profile, setProfile] = useState<DayElevation | null | undefined>(undefined);
  const gradId = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;
    loadElevationPack()
      .then((pack) => {
        if (!cancelled) setProfile(elevationForDay(pack, dayId));
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dayId]);

  const path = useMemo(() => {
    if (!profile || profile.samples.length < 2) return null;
    const w = 320;
    const h = compact ? 72 : 96;
    const padX = 6;
    const padY = 10;
    const maxD = Math.max(profile.distanceKm, 0.001);
    const minE = profile.minM;
    const maxE = Math.max(profile.maxM, minE + 1);
    const range = maxE - minE;
    const pts = profile.samples.map((sample) => {
      const x = padX + (sample.distanceKm / maxD) * (w - padX * 2);
      const y = padY + (1 - (sample.elevationM - minE) / range) * (h - padY * 2);
      return [x, y] as const;
    });
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
    return { line, area, w, h, maxD, minE, maxE };
  }, [profile, compact]);

  if (profile === undefined) {
    return <p className="small">Loading elevation…</p>;
  }
  if (!profile) {
    return <p className="small">No walking this day — no elevation profile.</p>;
  }

  return (
    <div>
      <p className="meta">
        ↑ {profile.gainM} m · ↓ {profile.lossM} m · {profile.minM}–{profile.maxM} m · {profile.distanceKm} km
      </p>
      {path ? (
        <svg
          viewBox={`0 0 ${path.w} ${path.h}`}
          className="elev-svg"
          role="img"
          aria-label={`Elevation profile, gain ${profile.gainM} metres`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d46a2c" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#d46a2c" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path d={path.area} fill={`url(#${gradId})`} />
          <path
            d={path.line}
            fill="none"
            stroke="#f0a05a"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <text x="6" y="12" fill="#c4a888" fontSize="9">
            {path.maxE} m
          </text>
          <text x="6" y={path.h - 4} fill="#c4a888" fontSize="9">
            {path.minE} m
          </text>
          <text x={path.w - 6} y={path.h - 4} textAnchor="end" fill="#c4a888" fontSize="9">
            {path.maxD.toFixed(0)} km
          </text>
        </svg>
      ) : null}
    </div>
  );
}
