// Interior province border lines + simplified outer boundary for Canada.
// Internal borders are drawn as LineStrings so borders appear once.

// Interior province/territory dividing lines
export const CANADA_PROVINCE_LINES_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
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
    {
      type: "Feature" as const,
      properties: { name: "Alaska border" },
      geometry: {
        type: "LineString" as const,
        coordinates: [[-141.0, 60.0], [-141.0, 69.0]],
      },
    },
  ],
};

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
            [-124.3, 48.3],
            [-123.1, 49.0],
            [-110.0, 49.0],
            [-100.0, 49.0],
            [-95.2, 49.0],
            [-84.5, 46.5],
            [-83.0, 42.5],
            [-79.0, 43.1],
            [-76.5, 44.5],
            [-74.7, 45.0],
            [-72.0, 45.0],
            [-70.0, 44.5],
            [-67.0, 45.2],
            [-65.8, 43.9],
            [-66.5, 43.5],
            [-60.5, 43.9],
            [-59.9, 43.9],
            [-64.5, 47.5],
            [-60.5, 47.0],
            [-52.7, 47.6],
            [-53.5, 50.0],
            [-56.0, 52.0],
            [-58.0, 53.5],
            [-60.5, 56.0],
            [-64.0, 58.0],
            [-65.5, 60.3],
            [-69.0, 62.0],
            [-72.0, 62.0],
            [-79.5, 62.6],
            [-79.5, 56.5],
            [-82.0, 52.5],
            [-79.5, 51.5],
            [-87.0, 56.0],
            [-88.0, 60.0],
            [-88.0, 63.0],
            [-95.0, 68.0],
            [-102.0, 72.0],
            [-110.0, 74.0],
            [-120.0, 74.0],
            [-128.0, 70.0],
            [-133.0, 69.5],
            [-137.0, 68.0],
            [-141.0, 66.0],
            [-141.0, 60.0],
            [-136.5, 59.0],
            [-133.0, 56.5],
            [-130.5, 54.5],
            [-126.0, 50.5],
            [-124.3, 48.3],
          ],
        ],
      },
    },
  ],
};

export const CANADA_PROVINCE_LABELS_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    { type: "Feature" as const, properties: { name: "Yukon" }, geometry: { type: "Point" as const, coordinates: [-135.2, 63.9] } },
    { type: "Feature" as const, properties: { name: "Northwest Territories" }, geometry: { type: "Point" as const, coordinates: [-121.0, 64.8] } },
    { type: "Feature" as const, properties: { name: "Nunavut" }, geometry: { type: "Point" as const, coordinates: [-94.0, 66.2] } },
    { type: "Feature" as const, properties: { name: "British Columbia" }, geometry: { type: "Point" as const, coordinates: [-124.1, 54.7] } },
    { type: "Feature" as const, properties: { name: "Alberta" }, geometry: { type: "Point" as const, coordinates: [-114.8, 54.5] } },
    { type: "Feature" as const, properties: { name: "Saskatchewan" }, geometry: { type: "Point" as const, coordinates: [-106.0, 54.8] } },
    { type: "Feature" as const, properties: { name: "Manitoba" }, geometry: { type: "Point" as const, coordinates: [-98.8, 55.2] } },
    { type: "Feature" as const, properties: { name: "Ontario" }, geometry: { type: "Point" as const, coordinates: [-85.5, 50.8] } },
    { type: "Feature" as const, properties: { name: "Quebec" }, geometry: { type: "Point" as const, coordinates: [-71.5, 52.4] } },
    { type: "Feature" as const, properties: { name: "New Brunswick" }, geometry: { type: "Point" as const, coordinates: [-66.2, 46.6] } },
    { type: "Feature" as const, properties: { name: "Nova Scotia" }, geometry: { type: "Point" as const, coordinates: [-62.9, 45.2] } },
    { type: "Feature" as const, properties: { name: "Prince Edward Island" }, geometry: { type: "Point" as const, coordinates: [-63.3, 46.4] } },
    { type: "Feature" as const, properties: { name: "Newfoundland and Labrador" }, geometry: { type: "Point" as const, coordinates: [-58.7, 53.5] } },
  ],
};
