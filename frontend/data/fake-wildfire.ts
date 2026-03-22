// Fire location: Cariboo Plateau, BC interior — remote forested area, no major cities
// Williams Lake is ~70km south. Heavily forested Crown land with FSR roads.
export const WILDFIRE_INCIDENT = {
  id: "cariboo-plateau-2026",
  name: "Cariboo Plateau Fire",
  location: "Cariboo Plateau, British Columbia",
  center: [-122.15, 51.82] as [number, number],
  status: "Out of Control",
  containment: 12,
  size: 8740,
  started: "2026-03-18",
  severity: "High",
  threat: "Spreading south toward Likely FSR — road at risk of being cut off",
  wind: { speed: 24, direction: "NW" },
  humidity: 11,
  temperature: 27,
  spread: {
    current: 1500,
    oneHour: 3200,
    threeHour: 5800,
  },
  progression: "Head fire moving SE at ~280 m/hr. Torching in mature lodgepole pine.",
};

// Forest Service Road acting as natural firebreak / access corridor
// Runs roughly E-W about 5 km south of fire center — within 3hr spread zone
export const FIREBREAK_ROAD_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Likely FSR — potential anchor line" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-123.1, 51.775],
          [-122.8, 51.772],
          [-122.5, 51.768],
          [-122.2, 51.771],
          [-121.9, 51.776],
          [-121.6, 51.780],
        ] as [number, number][],
      },
    },
  ],
};

export const BC_NATIONAL_MARKER: [number, number] = [-122.15, 51.82];

export const CANADA_VIEW = {
  longitude: -96.0,
  latitude: 60.0,
  zoom: 3.2,
  pitch: 0,
  bearing: 0,
};

export const PROVINCE_VIEW = {
  longitude: -122.15,
  latitude: 51.82,
  zoom: 8.0,
  pitch: 30,
  bearing: 0,
};

export const INCIDENT_VIEW = {
  longitude: -122.15,
  latitude: 51.82,
  zoom: 11.5,
  pitch: 55,
  bearing: -15,
};

// Ground crews — expandable in UI
export const GROUND_CREW_TEAMS = [
  {
    id: "gc-1",
    name: "Alpha",
    type: "ground-crew" as const,
    count: 20,
    experience: "Expert",
    status: "standby" as const,
  },
  {
    id: "gc-2",
    name: "Bravo",
    type: "ground-crew" as const,
    count: 15,
    experience: "Intermediate",
    status: "standby" as const,
  },
  {
    id: "gc-3",
    name: "Charlie",
    type: "ground-crew" as const,
    count: 12,
    experience: "Advanced",
    status: "standby" as const,
  },
];

// Firefighting actions
export const FIRE_ACTIONS = [
  {
    id: "fa-planned-burn",
    name: "Planned Burn",
    type: "planned-burn" as const,
    description: "Draw a line — prescribed burn removes fuel ahead of fire front",
    status: "standby" as const,
  },
  {
    id: "fa-dozer",
    name: "Suppression Dozer",
    type: "dozer-line" as const,
    description: "Bulldozer cuts mineral soil containment line",
    status: "ready" as const,
  },
];

export const AI_SUGGESTIONS = [
  {
    priority: "CRITICAL",
    title: "Anchor containment on Likely FSR",
    detail:
      "Road corridor provides mineral soil break + vehicle access. Ground Crew Alpha + Dozer to establish line along road before 3hr spread reaches it.",
    confidence: 91,
    timeWindow: "Deploy within 30 min",
  },
  {
    priority: "HIGH",
    title: "Execute planned burn along road south flank",
    detail:
      "Burn fuel strip between road and fire front using favourable RH window. Draw burn line along FSR corridor to remove available fuel.",
    confidence: 79,
    timeWindow: "1–2 hr window",
  },
  {
    priority: "HIGH",
    title: "Position Bravo crew on eastern pinch point",
    detail:
      "Narrow fuel corridor on NE flank. Ground Crew Bravo can hold line at natural ridgeline break with minimal risk.",
    confidence: 74,
    timeWindow: "Act within 1 hr",
  },
  {
    priority: "MEDIUM",
    title: "Scout southern escape route via Likely FSR junction",
    detail:
      "If head fire accelerates, Charlie crew needs pre-planned escape. Identify safe zone at road junction before deployment.",
    confidence: 65,
    timeWindow: "Monitor — 3 hr",
  },
];

export const INFRASTRUCTURE_AT_RISK = [
  "Likely FSR — sole vehicle access corridor for 3 communities",
  "Quesnel Lake watershed — critical drinking water source",
  "Crown timber license blocks — mature lodgepole pine (~4,200 ha)",
  "BC Hydro transmission line — runs NE of fire perimeter",
  "Horsefly Bridge — only river crossing within 60 km",
];

export const CAMERA_FEEDS = [
  {
    id: "ne",
    label: "NE",
    title: "Northeast Perimeter",
    location: "Ridgeline Camera — 1.8 km NE",
    intensity: "Extreme",
    status: "LIVE",
  },
  {
    id: "nw",
    label: "NW",
    title: "Northwest Flank",
    location: "Crown Land Lookout",
    intensity: "High",
    status: "LIVE",
  },
  {
    id: "se",
    label: "SE",
    title: "Southeast — FSR Corridor",
    location: "Likely FSR Junction Cam",
    intensity: "Moderate",
    status: "LIVE",
  },
  {
    id: "sw",
    label: "SW",
    title: "Southwest Flank",
    location: "Horsefly Rd Checkpoint",
    intensity: "High",
    status: "LIVE",
  },
];
