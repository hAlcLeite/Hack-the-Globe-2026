/**
 * lib/api.ts — CanopyOS Backend API Client
 *
 * All calls go to the FastAPI backend running on localhost:8000.
 * Set NEXT_PUBLIC_API_URL in your .env.local to override for production.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FireEvent {
  fire_id: string;
  province: string;
  name: string;
  status: string;
  severity: "extreme" | "high" | "moderate" | "low";
  latitude: number;
  longitude: number;
  area_hectares: number | null;
  started_at: string;
  updated_at: string;
  source: string;
  // FIRMS-only fields
  frp_mw?: number;
  confidence?: string;
  satellite?: string;
}

export interface FiresResponse {
  count: number;
  fires: FireEvent[];
}

export interface LiveFiresResponse extends FiresResponse {
  source: string;
  coverage: string;
}

// ── API Functions ──────────────────────────────────────────────────────────────

/**
 * Fetch all fires from DynamoDB (seeded + real data).
 * GET /api/v1/fires
 */
export async function fetchFires(): Promise<FireEvent[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/fires`, {
      next: { revalidate: 60 }, // Cache for 60s in Next.js
    } as RequestInit & { next?: { revalidate?: number } });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: FiresResponse = await res.json();
    // DynamoDB items store fire data under a 'metadata' key — unwrap if needed
    return data.fires.map((f: FireEvent & { metadata?: FireEvent }) =>
      f.metadata ?? f
    );
  } catch (err) {
    console.error("[CanopyOS API] fetchFires failed:", err);
    return [];
  }
}

/**
 * Fetch real-time NASA FIRMS satellite hotspots over BC + AB.
 * GET /api/v1/fires/live
 */
export async function fetchLiveFires(): Promise<FireEvent[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/fires/live`, {
      cache: "no-store", // Always fresh — satellite data
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: LiveFiresResponse = await res.json();
    return data.fires;
  } catch (err) {
    console.error("[CanopyOS API] fetchLiveFires failed:", err);
    return [];
  }
}

/**
 * Fetch the full fire record (with burn grid + choke points) by ID.
 * GET /api/v1/fires/{fire_id}
 */
export async function fetchFireById(fireId: string): Promise<FireEvent | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/fires/${fireId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[CanopyOS API] fetchFireById(${fireId}) failed:`, err);
    return null;
  }
}
