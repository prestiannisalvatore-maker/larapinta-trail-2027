/** Prefetch CARTO raster tiles along the Larapinta corridor, same method as the Australind app. */

export const OFFLINE_CACHE = "larapinta-tiles-v1";
export const SHELL_CACHE = "larapinta-shell-v1";
export const STATUS_KEY = "larapinta-offline-status-v1";

const TRAIL_BOUNDS = {
  west: 132.38,
  south: -23.82,
  east: 133.95,
  north: -23.52,
};

const CARTO_HOSTS = [
  "https://a.basemaps.cartocdn.com/light_all",
  "https://b.basemaps.cartocdn.com/light_all",
  "https://c.basemaps.cartocdn.com/light_all",
];

export type RouteCoord = [number, number];

export type OfflineStatus = {
  shellCached: boolean;
  routeCached: boolean;
  tileCount: number;
  preparedAt: string | null;
};

export type PrepareProgress = {
  done: number;
  total: number;
  phase: string;
};

function lon2tile(lon: number, z: number) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function lat2tile(lat: number, z: number) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}

function clampTile(n: number, z: number) {
  const max = 2 ** z - 1;
  return Math.max(0, Math.min(max, n));
}

export function readOfflineStatus(): OfflineStatus {
  if (typeof window === "undefined") {
    return { shellCached: false, routeCached: false, tileCount: 0, preparedAt: null };
  }
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (!raw) return { shellCached: false, routeCached: false, tileCount: 0, preparedAt: null };
    return JSON.parse(raw) as OfflineStatus;
  } catch {
    return { shellCached: false, routeCached: false, tileCount: 0, preparedAt: null };
  }
}

export function writeOfflineStatus(status: OfflineStatus) {
  localStorage.setItem(STATUS_KEY, JSON.stringify(status));
}

export function isOfflineReady(status: OfflineStatus) {
  return status.routeCached && status.tileCount > 80;
}

export function flattenTrailCoords(geojson: unknown): RouteCoord[] {
  const coords: RouteCoord[] = [];

  function walk(value: unknown) {
    if (!value || typeof value !== "object") return;
    const obj = value as { type?: string; coordinates?: unknown; features?: unknown[]; geometry?: unknown };
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

function thinCoords(coords: RouteCoord[], everyKmApprox = 4): RouteCoord[] {
  if (coords.length < 2) return coords;
  const out: RouteCoord[] = [coords[0]];
  let last = coords[0];
  const stepDeg = everyKmApprox / 111;
  for (const point of coords) {
    if (Math.abs(point[1] - last[1]) + Math.abs(point[0] - last[0]) >= stepDeg) {
      out.push(point);
      last = point;
    }
  }
  out.push(coords[coords.length - 1]);
  return out;
}

function tilesAlongCorridor(coords: RouteCoord[], zMin: number, zMax: number, pad = 1) {
  const set = new Set<string>();
  const thinned = thinCoords(coords);
  const tiles: Array<{ z: number; x: number; y: number }> = [];

  for (let z = zMin; z <= zMax; z++) {
    if (z <= 6) {
      const x0 = clampTile(lon2tile(TRAIL_BOUNDS.west, z) - pad, z);
      const x1 = clampTile(lon2tile(TRAIL_BOUNDS.east, z) + pad, z);
      const y0 = clampTile(lat2tile(TRAIL_BOUNDS.north, z) - pad, z);
      const y1 = clampTile(lat2tile(TRAIL_BOUNDS.south, z) + pad, z);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          const key = `${z}/${x}/${y}`;
          if (!set.has(key)) {
            set.add(key);
            tiles.push({ z, x, y });
          }
        }
      }
      continue;
    }

    for (const [lon, lat] of thinned) {
      if (lon < TRAIL_BOUNDS.west || lon > TRAIL_BOUNDS.east) continue;
      if (lat < TRAIL_BOUNDS.south || lat > TRAIL_BOUNDS.north) continue;
      const cx = lon2tile(lon, z);
      const cy = lat2tile(lat, z);
      for (let dx = -pad; dx <= pad; dx++) {
        for (let dy = -pad; dy <= pad; dy++) {
          const x = clampTile(cx + dx, z);
          const y = clampTile(cy + dy, z);
          const key = `${z}/${x}/${y}`;
          if (!set.has(key)) {
            set.add(key);
            tiles.push({ z, x, y });
          }
        }
      }
    }
  }

  return tiles;
}

export async function countCachedTiles() {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    return (await cache.keys()).length;
  } catch {
    return 0;
  }
}

export async function prepareOfflineTiles(onProgress?: (progress: PrepareProgress) => void): Promise<OfflineStatus> {
  const trailRes = await fetch("/data/trail.geojson");
  if (!trailRes.ok) throw new Error("Could not load the trail file.");
  const trailJson = await trailRes.json();
  const coords = flattenTrailCoords(trailJson);
  if (coords.length < 10) throw new Error("Trail GPS is missing.");

  const cache = await caches.open(OFFLINE_CACHE);
  const urls = new Set<string>(["/data/trail.geojson", "/data/camps.gpx"]);

  for (const tile of tilesAlongCorridor(coords, 5, 12, 1)) {
    const host = CARTO_HOSTS[(tile.x + tile.y) % CARTO_HOSTS.length];
    urls.add(`${host}/${tile.z}/${tile.x}/${tile.y}.png`);
  }

  const list = [...urls];
  let done = 0;
  const concurrency = 10;
  onProgress?.({ done: 0, total: urls.size, phase: "tiles" });

  async function worker() {
    while (list.length) {
      const url = list.shift();
      if (!url) break;
      try {
        const existing = await cache.match(url);
        if (!existing) {
          const res = await fetch(url, { mode: "cors", credentials: "omit" });
          if (res.ok) await cache.put(url, res.clone());
        }
      } catch {
        /* keep going — a few missed tiles are fine */
      }
      done += 1;
      onProgress?.({ done, total: urls.size, phase: "tiles" });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  let shellCached = false;
  try {
    const shell = await caches.open(SHELL_CACHE);
    const shellUrls = ["/", "/map", "/itinerary", "/costs", "/gear", "/logistics", "/manifest.json"];
    let shellOk = 0;
    for (const url of shellUrls) {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) {
          await shell.put(url, res.clone());
          shellOk += 1;
        }
      } catch {
        /* skip */
      }
    }
    shellCached = shellOk > 0;
  } catch {
    shellCached = false;
  }

  const status: OfflineStatus = {
    shellCached,
    routeCached: true,
    tileCount: Math.max(done, await countCachedTiles()),
    preparedAt: new Date().toISOString(),
  };
  writeOfflineStatus(status);
  return status;
}
