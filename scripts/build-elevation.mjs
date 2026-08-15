import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");

const waypoints = {
  telegraph: [133.8850788, -23.6709454],
  wallaby: [133.795172, -23.6682758],
  simpsons: [133.7172081, -23.6802675],
  mulga: [133.612895, -23.664739],
  jay: [133.5378082, -23.6634442],
  standley: [133.470195, -23.7219433],
  brinkley: [133.3920491, -23.7106966],
  junction45: [133.3482565, -23.7180105],
  hugh: [133.2588977, -23.7030943],
  "rocky-gully": [133.1680932, -23.7588962],
  ellery: [133.0735127, -23.7796177],
  serpentine: [132.9802827, -23.7544009],
  chalet: [132.9102716, -23.7277051],
  waterfall: [132.8252209, -23.687168],
  ormiston: [132.7270227, -23.6331482],
  finke: [132.6788395, -23.6581917],
  "rocky-bar": [132.6027532, -23.6086526],
  redbank: [132.5187757, -23.5774963],
  sonder: [132.5796883, -23.5806423],
};

const segments = [
  { id: "1", title: "Onto the range", from: "telegraph", to: "wallaby" },
  { id: "2", title: "Finish Section 1", from: "wallaby", to: "simpsons" },
  { id: "3", title: "Spinifex ridgelines", from: "simpsons", to: "mulga" },
  { id: "4", title: "Into Jay Creek", from: "mulga", to: "jay" },
  { id: "5", title: "Standley Chasm", from: "jay", to: "standley" },
  { id: "7", title: "Brinkley Bluff", from: "standley", to: "brinkley" },
  { id: "8", title: "Birthday Waterhole", from: "brinkley", to: "junction45" },
  { id: "9", title: "Razorback to Hugh Gorge", from: "junction45", to: "hugh" },
  { id: "10", title: "Hugh Gorge to Rocky Gully", from: "hugh", to: "rocky-gully" },
  { id: "11", title: "Ellery Creek Big Hole", from: "rocky-gully", to: "ellery" },
  { id: "12", title: "Serpentine Gorge", from: "ellery", to: "serpentine" },
  { id: "13", title: "Serpentine Chalet Dam", from: "serpentine", to: "chalet" },
  { id: "14", title: "Section 9 dry camp", from: "chalet", to: "waterfall" },
  { id: "15", title: "Counts Point to Ormiston", from: "waterfall", to: "ormiston" },
  { id: "17", title: "Finke River", from: "ormiston", to: "finke" },
  { id: "18", title: "Rocky Bar Gap", from: "finke", to: "rocky-bar" },
  { id: "19", title: "Redbank Gorge", from: "rocky-bar", to: "redbank" },
  { id: "20", title: "Mt Sonder sunrise", from: "redbank", to: "sonder", outAndBack: true },
];

function flatten(geojson) {
  const coords = [];
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "FeatureCollection") value.features?.forEach(walk);
    else if (value.type === "Feature") walk(value.geometry);
    else if (value.type === "LineString") coords.push(...value.coordinates);
    else if (value.type === "MultiLineString") {
      for (const line of value.coordinates) coords.push(...line);
    }
  }
  walk(geojson);
  return coords;
}

function haversineKm(a, b) {
  const r = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

function nearest(coords, lon, lat) {
  let best = 0;
  let bestD = Infinity;
  const target = [lon, lat];
  for (let i = 0; i < coords.length; i++) {
    const d = haversineKm(coords[i], target);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function extract(coords, fromId, toId, outAndBack) {
  const from = waypoints[fromId];
  const to = waypoints[toId];
  const a = nearest(coords, from[0], from[1]);
  const b = nearest(coords, to[0], to[1]);
  const slice = a <= b ? coords.slice(a, b + 1) : coords.slice(b, a + 1).reverse();
  return outAndBack ? [...slice, ...[...slice].reverse().slice(1)] : slice;
}

function sample(coords, maxPoints = 80) {
  if (coords.length <= maxPoints) return coords;
  const out = [];
  const last = coords.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    out.push(coords[Math.round((i / (maxPoints - 1)) * last)]);
  }
  return out.filter((c, i, arr) => i === 0 || c[0] !== arr[i - 1][0] || c[1] !== arr[i - 1][1]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchElevations(points) {
  const elevations = [];
  for (let i = 0; i < points.length; i += 40) {
    const chunk = points.slice(i, i + 40);
    const lats = chunk.map((p) => p[1].toFixed(5)).join(",");
    const lons = chunk.map((p) => p[0].toFixed(5)).join(",");
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
    let lastError = null;
    for (let attempt = 0; attempt < 7; attempt++) {
      if (attempt > 0) await sleep(2500 * attempt);
      const res = await fetch(url, { headers: { "User-Agent": "larapinta-trail-2027-elevation" } });
      if (res.status === 429) {
        lastError = new Error("429");
        continue;
      }
      if (!res.ok) throw new Error(`Elevation request failed: ${res.status}`);
      const data = await res.json();
      if (!data.elevation) throw new Error("No elevation array");
      elevations.push(...data.elevation);
      lastError = null;
      break;
    }
    if (lastError) throw lastError;
    await sleep(900);
  }
  return elevations;
}

const trail = JSON.parse(await readFile(join(root, "public/data/trail.geojson"), "utf8"));
const coords = flatten(trail);
console.log(`Trail line ${coords.length} pts`);

const days = [];
for (const seg of segments) {
  const line = extract(coords, seg.from, seg.to, seg.outAndBack);
  const km = line.slice(1).reduce((sum, point, i) => sum + haversineKm(line[i], point), 0);
  console.log(`Day ${seg.id}: ${km.toFixed(2)} km, ${line.length} pts`);
  if (dry) continue;
  const sampled = sample(line);
  const elev = await fetchElevations(sampled);
  let distanceKm = 0;
  let gain = 0;
  let loss = 0;
  let minM = Infinity;
  let maxM = -Infinity;
  const samples = sampled.map((point, i) => {
    if (i > 0) {
      distanceKm += haversineKm(sampled[i - 1], point);
      const delta = elev[i] - elev[i - 1];
      if (delta > 0) gain += delta;
      else loss += -delta;
    }
    minM = Math.min(minM, elev[i]);
    maxM = Math.max(maxM, elev[i]);
    return {
      lon: point[0],
      lat: point[1],
      distanceKm: Number(distanceKm.toFixed(3)),
      elevationM: Math.round(elev[i]),
    };
  });
  days.push({
    id: seg.id,
    title: seg.title,
    distanceKm: Number(km.toFixed(2)),
    gainM: Math.round(gain),
    lossM: Math.round(loss),
    minM: Math.round(minM),
    maxM: Math.round(maxM),
    samples,
  });
  console.log(`  ↑${Math.round(gain)} / ↓${Math.round(loss)} m · ${Math.round(minM)}–${Math.round(maxM)} m`);
}

if (dry) process.exit(0);

await writeFile(
  join(root, "public/data/elevation.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: "Open-Meteo elevation API sampled on the OSM walking line",
    days,
  }),
);
console.log("Wrote public/data/elevation.json");
