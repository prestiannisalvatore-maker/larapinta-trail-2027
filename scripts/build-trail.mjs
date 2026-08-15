import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/cache");
const SECTION_IDS = [
  3958653, 3958654, 3958656, 3958657, 3958658, 3958659, 3959484, 3959485, 3959486, 3959487, 3959488, 3959489,
];
const OFFICIAL_KM = {
  1: 24.7,
  2: 26.2,
  3: 13.6,
  4: 17.9,
  5: 14.9,
  6: 28.9,
  7: 12.8,
  8: 13.8,
  9: 28.9,
  10: 8.9,
  11: 26.3,
  12: 15.8,
};

function haversineM(a, b) {
  const r = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

function lengthM(coords) {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) sum += haversineM(coords[i - 1], coords[i]);
  return sum;
}

function interpolate(a, b, stepM = 10) {
  const dist = haversineM(a, b);
  if (dist <= stepM) return [b];
  const n = Math.ceil(dist / stepM);
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

function wayLine(member) {
  const geom = member.geometry || [];
  return geom.map((p) => [p.lon, p.lat]);
}

function chainSection(rel, maxJoinM = 80) {
  const unused = rel.members
    .filter((m) => m.type === "way")
    .map(wayLine)
    .filter((line) => line.length >= 2)
    .map((line) => line.slice());
  if (!unused.length) return [];

  const path = unused.shift();
  while (unused.length) {
    const tip = path[path.length - 1];
    let best = -1;
    let bestD = Infinity;
    let reverse = false;
    for (let i = 0; i < unused.length; i++) {
      const line = unused[i];
      const d0 = haversineM(tip, line[0]);
      const d1 = haversineM(tip, line[line.length - 1]);
      if (d0 < bestD) {
        bestD = d0;
        best = i;
        reverse = false;
      }
      if (d1 < bestD) {
        bestD = d1;
        best = i;
        reverse = true;
      }
    }
    if (best < 0 || bestD > maxJoinM) break;
    let line = unused.splice(best, 1)[0];
    if (reverse) line = line.reverse();
    if (bestD > 3) path.push(...interpolate(tip, line[0]));
    path.push(...line.slice(1));
  }
  return path;
}

async function loadSections() {
  const cachePath = join(cacheDir, "sections.json");
  try {
    if (!process.argv.includes("--refresh")) {
      return JSON.parse(await readFile(cachePath, "utf8"));
    }
  } catch {
    /* fetch */
  }
  const ids = SECTION_IDS.join(",");
  const body = `[out:json][timeout:180];relation(id:${ids});out geom;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(body)}`,
  });
  if (!res.ok) throw new Error(`Overpass failed: ${res.status}`);
  const json = await res.json();
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, JSON.stringify(json));
  return json;
}

const data = await loadSections();
const rels = new Map(data.elements.filter((e) => e.type === "relation").map((e) => [e.id, e]));

const sections = [];
const full = [];

for (let i = 0; i < SECTION_IDS.length; i++) {
  const rel = rels.get(SECTION_IDS[i]);
  if (!rel) throw new Error(`Missing section relation ${SECTION_IDS[i]}`);
  const coords = chainSection(rel);
  const km = lengthM(coords) / 1000;
  const n = i + 1;
  const official = OFFICIAL_KM[n];
  const compare = n === 12 ? official / 2 : official;
  sections.push({
    id: n,
    osmId: rel.id,
    name: rel.tags?.name,
    km: Number(km.toFixed(2)),
    officialKm: official,
    points: coords.length,
    start: coords[0],
    end: coords[coords.length - 1],
  });
  console.log(
    `Section ${n}: ${km.toFixed(2)} km (NT Parks ${official}${n === 12 ? " return" : ""}, Δ ${(km - compare).toFixed(2)}) · ${coords.length} pts`,
  );
  if (!coords.length) continue;
  if (!full.length) {
    full.push(...coords);
    continue;
  }
  const gap = haversineM(full[full.length - 1], coords[0]);
  if (gap > 3) {
    console.log(`  connector ${gap.toFixed(0)} m (Standley/Ormiston-style gap — interpolated)`);
    full.push(...interpolate(full[full.length - 1], coords[0]));
  }
  full.push(...coords.slice(1));
}

const totalKm = lengthM(full) / 1000;
console.log(`Walking line: ${totalKm.toFixed(2)} km, ${full.length} vertices`);

const geojson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Larapinta Trail",
        source: "OpenStreetMap section relations 3958653–3959489 (parent 3066363)",
        license: "ODbL",
        generatedAt: new Date().toISOString(),
        distanceKm: Number(totalKm.toFixed(2)),
        note: "Ordered east-to-west through-walk plus Section 12 to the Mt Sonder cairn. Alternate/excursion members omitted.",
      },
      geometry: {
        type: "LineString",
        coordinates: full.map((p) => [Number(p[0].toFixed(7)), Number(p[1].toFixed(7))]),
      },
    },
  ],
};

await writeFile(join(root, "public/data/trail.geojson"), JSON.stringify(geojson));

const gpxPts = full
  .map((p) => `    <trkpt lat="${p[1].toFixed(7)}" lon="${p[0].toFixed(7)}"></trkpt>`)
  .join("\n");
const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Larapinta Trail 2027" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Larapinta Trail east to west plus Mt Sonder</name>
    <trkseg>
${gpxPts}
    </trkseg>
  </trk>
</gpx>
`;
await writeFile(join(root, "public/data/trail.gpx"), gpx);

await writeFile(
  join(root, "public/data/trail-meta.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "OpenStreetMap hiking relations, member order, ODbL",
      totalKm: Number(totalKm.toFixed(2)),
      vertices: full.length,
      sections,
    },
    null,
    2,
  ),
);

console.log("Wrote public/data/trail.geojson, trail.gpx, trail-meta.json");
