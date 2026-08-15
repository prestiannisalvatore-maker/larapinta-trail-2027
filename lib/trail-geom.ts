import { days, getWaypoint, waypoints, type DayPlan } from "@/lib/data";

export type RouteCoord = [number, number];

export type DaySegmentDef = {
  id: string;
  fromId: string;
  toId: string;
  outAndBack?: boolean;
};

export const daySegments: DaySegmentDef[] = [
  { id: "1", fromId: "telegraph", toId: "wallaby" },
  { id: "2", fromId: "wallaby", toId: "simpsons" },
  { id: "3", fromId: "simpsons", toId: "mulga" },
  { id: "4", fromId: "mulga", toId: "jay" },
  { id: "5", fromId: "jay", toId: "standley" },
  { id: "7", fromId: "standley", toId: "brinkley" },
  { id: "8", fromId: "brinkley", toId: "junction45" },
  { id: "9", fromId: "junction45", toId: "hugh" },
  { id: "10", fromId: "hugh", toId: "rocky-gully" },
  { id: "11", fromId: "rocky-gully", toId: "ellery" },
  { id: "12", fromId: "ellery", toId: "serpentine" },
  { id: "13", fromId: "serpentine", toId: "chalet" },
  { id: "14", fromId: "chalet", toId: "waterfall" },
  { id: "15", fromId: "waterfall", toId: "ormiston" },
  { id: "17", fromId: "ormiston", toId: "finke" },
  { id: "18", fromId: "finke", toId: "rocky-bar" },
  { id: "19", fromId: "rocky-bar", toId: "redbank" },
  { id: "20", fromId: "redbank", toId: "sonder", outAndBack: true },
];

export function haversineM(a: RouteCoord, b: RouteCoord) {
  const r = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function flattenTrailCoords(geojson: unknown): RouteCoord[] {
  const coords: RouteCoord[] = [];

  function walk(value: unknown) {
    if (!value || typeof value !== "object") return;
    const obj = value as {
      type?: string;
      coordinates?: unknown;
      features?: unknown[];
      geometry?: unknown;
    };
    if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
      obj.features.forEach(walk);
      return;
    }
    if (obj.type === "Feature") {
      walk(obj.geometry);
      return;
    }
    if (obj.type === "LineString" && Array.isArray(obj.coordinates)) {
      for (const pair of obj.coordinates as number[][]) {
        if (pair.length >= 2) coords.push([pair[0], pair[1]]);
      }
      return;
    }
    if (obj.type === "MultiLineString" && Array.isArray(obj.coordinates)) {
      for (const line of obj.coordinates as number[][][]) {
        for (const pair of line) {
          if (pair.length >= 2) coords.push([pair[0], pair[1]]);
        }
      }
    }
  }

  walk(geojson);
  return coords;
}

export function nearestIndex(coords: RouteCoord[], lon: number, lat: number) {
  const target: RouteCoord = [lon, lat];
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineM(coords[i], target);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function nearestDistanceM(coords: RouteCoord[], lat: number, lon: number) {
  if (coords.length < 1) return Infinity;
  const i = nearestIndex(coords, lon, lat);
  return haversineM(coords[i], [lon, lat]);
}

export function extractSegment(coords: RouteCoord[], fromId: string, toId: string, outAndBack = false) {
  const from = getWaypoint(fromId) ?? waypoints.find((w) => w.id === fromId);
  const to = getWaypoint(toId) ?? waypoints.find((w) => w.id === toId);
  if (!from || !to || coords.length < 2) return [];

  const a = nearestIndex(coords, from.lng, from.lat);
  const b = nearestIndex(coords, to.lng, to.lat);
  const slice = a <= b ? coords.slice(a, b + 1) : coords.slice(b, a + 1).reverse();
  if (!outAndBack) return slice;
  return [...slice, ...[...slice].reverse().slice(1)];
}

export function segmentForDay(day: DayPlan, coords: RouteCoord[]) {
  const def = daySegments.find((item) => item.id === day.id);
  if (!def) return [];
  return extractSegment(coords, def.fromId, def.toId, def.outAndBack);
}

export function walkingDays() {
  return days.filter((day) => daySegments.some((seg) => seg.id === day.id));
}
