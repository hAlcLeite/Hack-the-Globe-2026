export const WILDFIRE_INCIDENT = {
  id: "okanagan-ridge-2026",
  name: "Okanagan Ridge Fire",
  location: "British Columbia, Canada",
  // Kelowna area, BC
  center: [-119.496, 49.888] as [number, number],
  status: "Out of Control",
  containment: 18, // percent
  size: 12450, // hectares
  started: "2026-03-18",
  severity: "High",
  threat: "Multiple communities at risk — Kelowna perimeter, West Kelowna, Lake Country",
  wind: { speed: 28, direction: "SW" },
  humidity: 14,
  temperature: 29,
  spread: {
    current: 1500, // meters radius
    oneHour: 3200,
    threeHour: 5800,
  },
  progression: "Active head fire moving NE at ~320 m/hr. Spotting occurring up to 2 km ahead.",
};

export const BC_NATIONAL_MARKER: [number, number] = [-119.496, 49.888];

export const CANADA_VIEW = {
  longitude: -96.0,
  latitude: 60.0,
  zoom: 3.2,
  pitch: 0,
  bearing: 0,
};

export const PROVINCE_VIEW = {
  longitude: -119.496,
  latitude: 49.888,
  zoom: 8.5,
  pitch: 35,
  bearing: -10,
};

export const INCIDENT_VIEW = {
  longitude: -119.496,
  latitude: 49.888,
  zoom: 11.5,
  pitch: 60,
  bearing: -20,
};

export const FIRST_RESPONDERS = [
  {
    id: "fr-1",
    name: "Ground Crew Alpha",
    type: "ground-crew" as const,
    count: 20,
    status: "standby" as const,
    icon: "users",
  },
  {
    id: "fr-2",
    name: "Ground Crew Bravo",
    type: "ground-crew" as const,
    count: 15,
    status: "standby" as const,
    icon: "users",
  },
  {
    id: "fr-3",
    name: "Strike Team Delta",
    type: "ground-crew" as const,
    count: 25,
    status: "standby" as const,
    icon: "users",
  },
];

export const ACTION_ASSETS = [
  {
    id: "aa-1",
    name: "Bombardier 415",
    type: "air-tanker" as const,
    status: "ready" as const,
    icon: "plane",
  },
  {
    id: "aa-2",
    name: "Bell 412 Helicopter",
    type: "helicopter" as const,
    status: "ready" as const,
    icon: "helicopter",
  },
  {
    id: "aa-3",
    name: "D9 Bulldozer Unit",
    type: "heavy-equipment" as const,
    status: "standby" as const,
    icon: "truck",
  },
];

export const AI_SUGGESTIONS = [
  {
    priority: "CRITICAL",
    title: "Anchor containment line at Okanagan Lake shoreline",
    detail:
      "High-probability hold zone. Water acts as natural firebreak. Deploy Strike Team Delta + D9 Bulldozer immediately.",
    confidence: 89,
    timeWindow: "Deploy within 45 min",
  },
  {
    priority: "HIGH",
    title: "Pre-position air tanker for eastern flank suppression",
    detail:
      "Wind shift forecast at 14:30. Bombardier 415 must be staged at Kelowna Airport by 13:45 for rapid deployment.",
    confidence: 76,
    timeWindow: "2-3 hr window",
  },
  {
    priority: "HIGH",
    title: "Establish trigger line on McCulloch Road",
    detail:
      "If fire reaches McCulloch Rd, initiate evacuation order for Zone 3. Bell 412 on standby for aerial observation.",
    confidence: 82,
    timeWindow: "Monitor — 1 hr",
  },
  {
    priority: "MEDIUM",
    title: "Backfire opportunity on south ridge",
    detail:
      "Favorable RH window until 16:00. Ground Crew Alpha can execute burnout from existing road network.",
    confidence: 61,
    timeWindow: "Optional — 3 hr",
  },
];

export const MISSION_LOG = [
  { time: "12:14", message: "Satellite update: perimeter +340 ha in last 6h" },
  { time: "11:52", message: "CWFIS FWI: Extreme (38). Spotting risk elevated." },
  { time: "11:30", message: "Ground Crew Bravo deployed to south flank" },
  { time: "10:47", message: "Evacuation order issued for Zone 2 (Lakeview Heights)" },
  { time: "09:15", message: "Incident declared Out of Control" },
];

export const LIVE_FEEDS = [
  {
    id: "feed-1",
    title: "North Perimeter — Camera 4",
    location: "McCulloch Rd & Highway 33",
    status: "LIVE",
    intensity: "Extreme",
    placeholder: "🔴",
  },
  {
    id: "feed-2",
    title: "Aerial — Bell 412",
    location: "Eastern Flank, 2.1 km NE",
    status: "LIVE",
    intensity: "High",
    placeholder: "🟠",
  },
  {
    id: "feed-3",
    title: "South Flank — Ground Unit",
    location: "Lakeshore Rd Checkpoint",
    status: "LIVE",
    intensity: "Moderate",
    placeholder: "🟡",
  },
  {
    id: "feed-4",
    title: "FIRMS Satellite — VIIRS",
    location: "Okanagan Ridge",
    status: "60s DELAY",
    intensity: "Extreme",
    placeholder: "🛰",
  },
];
