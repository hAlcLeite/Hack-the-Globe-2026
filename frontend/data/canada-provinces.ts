// Interior province border lines + improved outer boundary for Canada
// Drawn as LineStrings so borders appear once (no fill overlap artifacts)

// Interior province/territory dividing lines
export const CANADA_PROVINCE_LINES_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    // ── Prairie province borders (perfectly straight N/S lines) ──
    {
      type: "Feature" as const,
      properties: { name: "BC/AB border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [[-120.0, 49.0], [-120.0, 60.0]],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "AB/SK border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [[-110.0, 49.0], [-110.0, 60.0]],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "SK/MB border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [[-101.4, 49.0], [-101.4, 60.0]],
      },
    },

    // ── 60th parallel: southern border of the three territories ──
    {
      type: "Feature" as const,
      properties: { name: "60th parallel west" },
      geometry: {
        type: "LineString" as const,
        coordinates: [[-141.0, 60.0], [-120.0, 60.0]],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "60th parallel east" },
      geometry: {
        type: "LineString" as const,
        coordinates: [[-101.4, 60.0], [-88.0, 60.0]],
      },
    },

    // ── Yukon / Northwest Territories border ──
    {
      type: "Feature" as const,
      properties: { name: "YK/NT border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-120.0, 60.0],
          [-120.0, 63.0],
          [-124.0, 63.5],
          [-132.0, 65.5],
          [-136.5, 68.5],
          [-141.0, 69.0],
        ],
      },
    },

    // ── Northwest Territories / Nunavut border (mainland) ──
    {
      type: "Feature" as const,
      properties: { name: "NT/NU border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-102.0, 60.0],
          [-102.0, 65.5],
          [-105.0, 68.5],
          [-108.0, 72.0],
          [-110.0, 74.0],
        ],
      },
    },

    // ── Manitoba / Ontario border ──
    {
      type: "Feature" as const,
      properties: { name: "MB/ON border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-95.2, 49.0],
          [-95.2, 52.5],
          [-93.0, 54.5],
          [-89.5, 57.0],
          [-88.0, 60.0],
        ],
      },
    },

    // ── Ontario / Quebec border ──
    {
      type: "Feature" as const,
      properties: { name: "ON/QC border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-74.7, 45.5],
          [-74.3, 47.0],
          [-77.0, 48.5],
          [-79.5, 51.5],
          [-79.5, 56.5],
        ],
      },
    },

    // ── Quebec / New Brunswick border ──
    {
      type: "Feature" as const,
      properties: { name: "QC/NB border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-67.0, 45.2],
          [-67.5, 46.5],
          [-64.5, 47.5],
        ],
      },
    },

    // ── Quebec / Newfoundland (Labrador) border ──
    {
      type: "Feature" as const,
      properties: { name: "QC/NL border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-64.5, 51.5],
          [-60.3, 51.5],
          [-57.0, 53.0],
          [-57.0, 55.0],
          [-60.5, 56.0],
          [-64.0, 58.0],
          [-68.0, 59.0],
          [-72.0, 62.0],
          [-79.5, 62.6],
        ],
      },
    },

    // ── New Brunswick / Nova Scotia ──
    {
      type: "Feature" as const,
      properties: { name: "NB/NS border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-64.5, 45.8],
          [-64.0, 45.4],
          [-63.5, 45.6],
        ],
      },
    },
  ],
};

// Improved outer Canada boundary (mainland + Labrador coast, simplified)
export const CANADA_OUTLINE_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Canada" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            // Start at southern BC coast, go east along 49th parallel
            [-124.0, 48.3],
            [-123.1, 49.0],
            [-110.0, 49.0],
            [-100.0, 49.0],
            [-95.2, 49.0],
            // Great Lakes / St. Lawrence region (simplified)
            [-84.5, 46.5],
            [-83.0, 42.5],
            [-79.0, 43.1],
            [-76.5, 44.5],
            [-74.7, 45.0],
            [-72.0, 45.0],
            [-70.0, 44.5],
            // Atlantic provinces
            [-67.0, 45.2],
            [-65.8, 43.9],
            [-66.5, 43.5],
            [-60.5, 43.9],
            [-59.9, 43.9],
            [-64.5, 47.5],
            [-60.5, 47.0],
            [-52.7, 47.6],
            // Labrador coast going north
            [-53.5, 50.0],
            [-56.0, 52.0],
            [-58.0, 53.5],
            [-60.5, 56.0],
            [-64.0, 58.0],
            [-65.5, 60.3],
            // Hudson Strait / northern Quebec
            [-69.0, 62.0],
            [-72.0, 62.0],
            [-79.5, 62.6],
            // Hudson Bay west coast going south then north again
            [-79.5, 56.5],
            [-82.0, 52.5],
            [-79.5, 51.5],
            // Northern Ontario/Quebec up to Hudson Bay
            [-87.0, 56.0],
            [-88.0, 60.0],
            // Northern territories: NWT/NU
            [-88.0, 63.0],
            [-95.0, 68.0],
            [-102.0, 72.0],
            [-110.0, 74.0],
            // Arctic coast (simplified)
            [-120.0, 74.0],
            [-128.0, 70.0],
            [-133.0, 69.5],
            [-137.0, 68.0],
            [-141.0, 66.0],
            // Alaska border down to 60th parallel
            [-141.0, 60.0],
            // BC coast going south
            [-136.5, 59.0],
            [-133.0, 56.5],
            [-130.5, 54.5],
            [-126.0, 50.5],
            [-124.0, 48.3],
          ],
        ],
      },
    },
  ],
};
