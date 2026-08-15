"use client";

import { useEffect, useState } from "react";
import { elevationForDay, loadElevationPack } from "@/lib/elevation";

export default function DayElevMeta({ dayId }: { dayId: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadElevationPack()
      .then((pack) => {
        if (cancelled) return;
        const profile = elevationForDay(pack, dayId);
        if (profile) setLabel(`↑ ${profile.gainM} m · ↓ ${profile.lossM} m`);
      })
      .catch(() => {
        if (!cancelled) setLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dayId]);

  if (!label) return null;
  return <div className="meta">{label}</div>;
}
