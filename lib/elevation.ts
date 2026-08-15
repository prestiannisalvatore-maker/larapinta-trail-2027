export type ElevationSample = {
  lat: number;
  lon: number;
  distanceKm: number;
  elevationM: number;
};

export type DayElevation = {
  id: string;
  title: string;
  distanceKm: number;
  gainM: number;
  lossM: number;
  minM: number;
  maxM: number;
  samples: ElevationSample[];
};

export type ElevationPack = {
  generatedAt: string;
  source: string;
  days: DayElevation[];
};

let pendingPack: Promise<ElevationPack> | null = null;

export async function loadElevationPack(): Promise<ElevationPack> {
  if (!pendingPack) {
    pendingPack = fetch("/data/elevation.json").then((res) => {
      if (!res.ok) throw new Error("Elevation file missing");
      return res.json();
    });
  }
  return pendingPack;
}

export function elevationForDay(pack: ElevationPack, dayId: string) {
  return pack.days.find((day) => day.id === dayId) ?? null;
}
