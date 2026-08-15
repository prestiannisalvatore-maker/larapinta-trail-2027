import { flattenTrailCoords, type RouteCoord } from "@/lib/trail-geom";

/** Prefetch OpenTopoMap terrain tiles along the Larapinta corridor. */

export const OFFLINE_CACHE = "larapinta-tiles-v3";
export const SHELL_CACHE = "larapinta-shell-v3";
export const STATUS_KEY = "larapinta-offline-status-v3";

const TRAIL_BOUNDS = {
  west: 132.38,
  south: -23.82,
  east: 133.95,
  north: -23.52,
};

const TOPO_HOSTS = [
  "https://a.tile.opentopomap.org",
  "https://b.tile.opentopomap.org",
  "https://c.tile.opentopomap.org",
];

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

function thinCoords(coords: RouteCoord[], everyM: number): RouteCoord[] {
  if (coords.length < 2) return coords;
  const out: RouteCoord[] = [coords[0]];
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    acc += Math.hypot(
      (coords[i][0] - coords[i - 1][0]) * 111320 * Math.cos((coords[i][1] * Math.PI) / 180),
      (coords[i][1] - coords[i - 1][1]) * 110540,
    );
    if (acc >= everyM) {
      out.push(coords[i]);
      acc = 0;
    }
  }
  out.push(coords[coords.length - 1]);
  return out;
}

function tilesAlongCorridor(coords: RouteCoord[], zMin: number, zMax: number) {
  const set = new Set<string>();
  const tiles: Array<{ z: number; x: number; y: number }> = [];

  for (let z = zMin; z <= zMax; z++) {
    const pad = z >= 15 ? 1 : z >= 13 ? 1 : 1;
    const sampleM = z >= 15 ? 220 : z >= 13 ? 500 : 4000;
    const thinned = z <= 6 ? coords.slice(0, 1) : thinCoords(coords, sampleM);

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
  const urls = new Set<string>(["/data/trail.geojson", "/data/trail.gpx", "/data/camps.gpx", "/data/elevation.json"]);

  for (const tile of tilesAlongCorridor(coords, 5, 15)) {
    const host = TOPO_HOSTS[(tile.x + tile.y) % TOPO_HOSTS.length];
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
          const isTile = url.includes("tile.opentopomap.org");
          const res = await fetch(url, { mode: isTile ? "no-cors" : "cors", credentials: "omit" });
          if (res.ok || res.type === "opaque") await cache.put(url, res.clone());
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
