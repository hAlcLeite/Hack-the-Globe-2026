// Fire perimeter simulator
// Generates wind-biased, irregular polygon perimeters instead of circles.
// Acts as a drop-in until the real backend sends GeoJSON snapshots.

const LAT_SCALE = 111320; // meters per degree latitude (constant)

function lngScale(lat: number): number {
  return LAT_SCALE * Math.cos((lat * Math.PI) / 180);
}

// Convert lng/lat → local [east, north] in meters relative to a center point
function toMeters(
  lng: number,
  lat: number,
  center: [number, number]
): [number, number] {
  return [
    (lng - center[0]) * lngScale(center[1]),
    (lat - center[1]) * LAT_SCALE,
  ];
}

// Convert local [east, north] meters back to lng/lat
function fromMeters(
  east: number,
  north: number,
  center: [number, number]
): [number, number] {
  return [
    center[0] + east / lngScale(center[1]),
    center[1] + north / LAT_SCALE,
  ];
}

function dot(a: [number, number], b: [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}

function normalize(v: [number, number]): [number, number] {
  const len = Math.sqrt(v[0] ** 2 + v[1] ** 2);
  return len === 0 ? [0, 0] : [v[0] / len, v[1] / len];
}

function centroid2d(pts: [number, number][]): [number, number] {
  const s = pts.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]] as [number, number],
    [0, 0] as [number, number]
  );
  return [s[0] / pts.length, s[1] / pts.length];
}

// Wind unit vector pointing the direction wind is GOING (away from source).
// Meteorological convention: directionDeg is where wind comes FROM.
// NW (315°) → wind travels SE (135°).
function windVector(fromDirDeg: number): [number, number] {
  const toDeg = (fromDirDeg + 180) % 360;
  const rad = (toDeg * Math.PI) / 180;
  // bearing: 0° = N, 90° = E → [east, north] = [sin, cos]
  return [Math.sin(rad), Math.cos(rad)];
}

// Seeded LCG pseudo-random (returns 0..1)
function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Polygon ring operations ──────────────────────────────────────────────────

// Remove closing point if polygon is closed (last === first)
function openRing(coords: [number, number][]): [number, number][] {
  const n = coords.length;
  if (n > 1) {
    const first = coords[0];
    const last = coords[n - 1];
    if (first[0] === last[0] && first[1] === last[1]) return coords.slice(0, -1);
  }
  return coords;
}

function closeRing(coords: [number, number][]): [number, number][] {
  return [...coords, coords[0]];
}

// ─── Core geometry functions ─────────────────────────────────────────────────

/**
 * Generate an irregular initial perimeter polygon (not a circle).
 * Elongated downwind and perturbed to look organic.
 */
export function generateInitialPerimeter(
  center: [number, number],
  radiusMeters: number,
  numPoints = 64,
  seed = 42
): [number, number][] {
  const rand = makePrng(seed);
  const wind = windVector(315); // NW wind → SE elongation (matches Cariboo data)

  const pts: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    // angle in standard math coordinates (CCW from east)
    const angle = (i * 2 * Math.PI) / numPoints;
    const dir: [number, number] = [Math.cos(angle), Math.sin(angle)];

    // Elongate in the downwind direction (wind alignment 0..1)
    const windAlign = Math.max(0, dot(dir, wind));
    const elongation = 1.0 + 0.55 * windAlign;

    // Multi-harmonic noise for organic shape
    const noise =
      1.0 +
      0.18 * Math.sin(3 * angle + rand() * Math.PI * 2) +
      0.10 * Math.sin(7 * angle + rand() * Math.PI * 2) +
      0.06 * Math.sin(13 * angle + rand() * Math.PI * 2) +
      0.04 * (rand() - 0.5);

    const r = radiusMeters * elongation * noise;
    pts.push(fromMeters(dir[0] * r, dir[1] * r, center));
  }
  return closeRing(pts);
}

/**
 * Spread a perimeter outward with wind-biased asymmetry.
 * One pass (O(n)) — no iteration loop needed.
 *
 * @param baseSpreadM  Total base spread in meters (isotropic component)
 * @param addNoise     Whether to add organic noise (false for clean forecasts)
 */
export function spreadPerimeter(
  perimeterCoords: [number, number][],
  center: [number, number],
  windFromDirDeg: number,
  windSpeedKph: number,
  baseSpreadM: number,
  addNoise = true
): [number, number][] {
  const wind = windVector(windFromDirDeg);
  const open = openRing(perimeterCoords);
  const mPts = open.map(([lng, lat]) => toMeters(lng, lat, center));
  const ctr = centroid2d(mPts);

  const newMPts = mPts.map((pt) => {
    // Outward direction from polygon centroid
    const outward = normalize([pt[0] - ctr[0], pt[1] - ctr[1]]);

    // alignment ∈ [0, 1]: 1 = fully downwind, 0 = upwind/crosswind
    const alignment = Math.max(0, dot(outward, wind));

    // Wind boost: downwind points spread much faster
    const speedBonus = alignment * windSpeedKph * 0.35;

    // Upwind points barely move (0.15× base), downwind points race ahead (2×)
    const spreadFactor = 0.15 + 1.85 * alignment;

    const noiseM = addNoise
      ? (Math.random() - 0.5) * 0.25 * baseSpreadM
      : 0;

    const totalSpread = baseSpreadM * spreadFactor + speedBonus + noiseM;

    return [
      pt[0] + outward[0] * totalSpread,
      pt[1] + outward[1] * totalSpread,
    ] as [number, number];
  });

  return closeRing(newMPts.map(([e, n]) => fromMeters(e, n, center)));
}

/**
 * Generate hotspot point cloud near the active fire front (downwind half).
 */
export function generateHotspots(
  perimeterCoords: [number, number][],
  center: [number, number],
  windFromDirDeg: number,
  count = 18
): [number, number][] {
  const wind = windVector(windFromDirDeg);
  const open = openRing(perimeterCoords);
  const mPts = open.map(([lng, lat]) => toMeters(lng, lat, center));
  const ctr = centroid2d(mPts);

  // Only use points on the downwind 2/3 of the perimeter
  const candidates = mPts.filter((pt) => {
    const outward = normalize([pt[0] - ctr[0], pt[1] - ctr[1]]);
    return dot(outward, wind) > -0.3;
  });

  if (candidates.length === 0) return [];

  const hotspots: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const base = candidates[Math.floor(Math.random() * candidates.length)];
    // Place slightly inside the perimeter (50–300m inward)
    const inward = normalize([ctr[0] - base[0], ctr[1] - base[1]]);
    const depth = 50 + Math.random() * 250;
    const jx = (Math.random() - 0.5) * 120;
    const jy = (Math.random() - 0.5) * 120;
    hotspots.push(
      fromMeters(
        base[0] + inward[0] * depth + jx,
        base[1] + inward[1] * depth + jy,
        center
      )
    );
  }
  return hotspots;
}

// ─── GeoJSON builders ────────────────────────────────────────────────────────

function polygonFC(coords: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Polygon" as const,
          coordinates: [coords],
        },
      },
    ],
  };
}

function pointsFC(coords: [number, number][], intensities: number[]) {
  return {
    type: "FeatureCollection" as const,
    features: coords.map((c, i) => ({
      type: "Feature" as const,
      properties: { intensity: intensities[i] ?? 0.5 },
      geometry: { type: "Point" as const, coordinates: c },
    })),
  };
}

// ─── Public snapshot types ───────────────────────────────────────────────────

export type FireGeoJSON = ReturnType<typeof polygonFC>;
export type HotspotsGeoJSON = ReturnType<typeof pointsFC>;

export interface FireSnapshot {
  timestamp: string;
  perimeter: FireGeoJSON;
  burnScar: FireGeoJSON;
  forecast1h: FireGeoJSON;
  forecast3h: FireGeoJSON;
  hotspots: HotspotsGeoJSON;
  wind: { directionDeg: number; speedKph: number };
  // Raw coords kept for efficient incremental updates (avoid re-parsing GeoJSON)
  _perimCoords: [number, number][];
  _burnCoords: [number, number][];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the opening fire snapshot from static incident data.
 * burnScarRadiusM should be smaller than currentRadiusM (the "already burned" core).
 */
export function buildInitialSnapshot(
  center: [number, number],
  windFromDirDeg: number,
  windSpeedKph: number,
  currentRadiusM: number,
  burnScarRadiusM: number
): FireSnapshot {
  const perimCoords = generateInitialPerimeter(center, currentRadiusM, 64, 42);
  const burnCoords = generateInitialPerimeter(center, burnScarRadiusM, 48, 99);

  // Forecasts: deterministic spread (no noise) for cleaner look
  const f1hCoords = spreadPerimeter(
    perimCoords,
    center,
    windFromDirDeg,
    windSpeedKph,
    600, // ~600m spread beyond current for 1h forecast
    false
  );
  const f3hCoords = spreadPerimeter(
    perimCoords,
    center,
    windFromDirDeg,
    windSpeedKph,
    1500, // ~1500m for 3h forecast
    false
  );

  const hotspotsXY = generateHotspots(perimCoords, center, windFromDirDeg, 20);
  const intensities = hotspotsXY.map(() => 0.4 + Math.random() * 0.6);

  return {
    timestamp: new Date().toISOString(),
    perimeter: polygonFC(perimCoords),
    burnScar: polygonFC(burnCoords),
    forecast1h: polygonFC(f1hCoords),
    forecast3h: polygonFC(f3hCoords),
    hotspots: pointsFC(hotspotsXY, intensities),
    wind: { directionDeg: windFromDirDeg, speedKph: windSpeedKph },
    _perimCoords: perimCoords,
    _burnCoords: burnCoords,
  };
}

/**
 * Apply real backend data (live weather + XGBoost spread radii) to the current snapshot.
 * Rebuilds the forecast layers using real distances while keeping the live perimeter
 * and burn scar untouched. Wind is updated so future ticks use the real direction.
 *
 * spread1hM / spread3hM are the XGBoost head-spread predictions.
 * We divide by ~2.0 to get the base isotropic component (head = ~2× base in our model).
 */
export function updateSnapshotWithRealData(
  snapshot: FireSnapshot,
  center: [number, number],
  windDirDeg: number,
  windSpeedKph: number,
  spread1hM: number,
  spread3hM: number
): FireSnapshot {
  // base = head-spread / 2 (because spreadFactor at the downwind head ≈ 2.0)
  const base1h = Math.max(100, spread1hM / 2.0);
  const base3h = Math.max(200, spread3hM / 2.0);

  const f1hCoords = spreadPerimeter(
    snapshot._perimCoords,
    center,
    windDirDeg,
    windSpeedKph,
    base1h,
    false
  );
  const f3hCoords = spreadPerimeter(
    snapshot._perimCoords,
    center,
    windDirDeg,
    windSpeedKph,
    base3h,
    false
  );

  return {
    ...snapshot,
    forecast1h: polygonFC(f1hCoords),
    forecast3h: polygonFC(f3hCoords),
    wind: { directionDeg: windDirDeg, speedKph: windSpeedKph },
  };
}

// How much the perimeter grows per simulation tick (meters, base isotropic component)
const TICK_BASE_SPREAD_M = 18;
// Burn scar grows at a fraction of the perimeter rate
const BURN_SCAR_SPREAD_FACTOR = 0.25;

/**
 * Advance the fire by one simulation tick.
 * Call every ~3 real seconds when in incident view.
 */
export function tickSnapshot(
  snapshot: FireSnapshot,
  center: [number, number]
): FireSnapshot {
  const { wind, _perimCoords, _burnCoords } = snapshot;

  const newPerimCoords = spreadPerimeter(
    _perimCoords,
    center,
    wind.directionDeg,
    wind.speedKph,
    TICK_BASE_SPREAD_M,
    true
  );

  const newBurnCoords = spreadPerimeter(
    _burnCoords,
    center,
    wind.directionDeg,
    wind.speedKph,
    TICK_BASE_SPREAD_M * BURN_SCAR_SPREAD_FACTOR,
    false
  );

  const f1hCoords = spreadPerimeter(
    newPerimCoords,
    center,
    wind.directionDeg,
    wind.speedKph,
    600,
    false
  );
  const f3hCoords = spreadPerimeter(
    newPerimCoords,
    center,
    wind.directionDeg,
    wind.speedKph,
    1500,
    false
  );

  const hotspotsXY = generateHotspots(newPerimCoords, center, wind.directionDeg, 20);
  const intensities = hotspotsXY.map(() => 0.4 + Math.random() * 0.6);

  return {
    timestamp: new Date().toISOString(),
    perimeter: polygonFC(newPerimCoords),
    burnScar: polygonFC(newBurnCoords),
    forecast1h: polygonFC(f1hCoords),
    forecast3h: polygonFC(f3hCoords),
    hotspots: pointsFC(hotspotsXY, intensities),
    wind,
    _perimCoords: newPerimCoords,
    _burnCoords: newBurnCoords,
  };
}
