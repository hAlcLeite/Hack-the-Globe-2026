import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fireData, weather, spreadMeters, deployedActions } = body;

  const prompt = `You are a Canadian wildfire incident commander AI advisor for the ${fireData.name} in ${fireData.location}.

Current situation:
- Fire center: lat ${fireData.center[1]}, lon ${fireData.center[0]}
- Size: ${fireData.size} ha, Containment: ${fireData.containment}%
- Wind: ${weather?.windSpeedKph ?? fireData.wind.speed} km/h from ${fireData.wind.direction} — head fire moving SE
- Temperature: ${weather?.tempC ?? fireData.temperature}°C, RH: ${weather?.rhPct ?? fireData.humidity}%
- 1h spread forecast: ${spreadMeters?.spread_1h_m ?? fireData.spread.oneHour} m radius SE of center
- 3h spread forecast: ${spreadMeters?.spread_3h_m ?? fireData.spread.threeHour} m radius SE of center
- Progression: ${fireData.progression}
- Threat: ${fireData.threat}
${deployedActions?.length > 0 ? `- Already deployed: ${deployedActions.join(", ")}` : "- No resources deployed yet"}

Known terrain reference points (use these for realistic coordinate placement):
- Likely FSR road anchor: lat 51.772, lon -122.15 (runs E-W ~5km south of fire center)
- Eastern pinch point / ridgeline: lat 51.80, lon -122.00
- Western flank / fuel break gap: lat 51.81, lon -122.35
- Optimal air tanker drop zone (SE head fire): lat 51.79, lon -122.10
- Quesnel Lake approach: lat 51.85, lon -121.85

Provide exactly 4 tactical containment recommendations. Each must include precise deployment coordinates within the fire area (lat/lon in BC interior, roughly 51.7–51.95 N, 122.4–121.8 W).

Return ONLY a JSON array where each item has:
- priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
- title: short action title (max 8 words)
- detail: tactical justification (1-2 concise sentences — why this location, what it protects)
- confidence: number 0-100
- timeWindow: urgency string
- resource_type: "ground-crew" | "dozer-line" | "air-tanker" | "planned-burn"
- lat: deployment latitude (number, e.g. 51.782)
- lon: deployment longitude (number, e.g. -122.13)

No markdown, no explanation, only the JSON array.`;

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt,
      maxOutputTokens: 4000,
    });

    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const recommendations = JSON.parse(clean);
    return NextResponse.json({ recommendations });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
