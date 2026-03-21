"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Video, X, Satellite, Cloud, Thermometer, Wind, Eye, Radio } from "lucide-react";
import { useWildfireStore } from "@/stores/wildfire-store";
import { LIVE_FEEDS, WILDFIRE_INCIDENT } from "@/data/fake-wildfire";
import { cn } from "@/lib/utils";

const INTENSITY_COLORS: Record<string, string> = {
  Extreme: "text-red-400",
  High: "text-orange-400",
  Moderate: "text-amber-400",
  Low: "text-green-400",
};

function FeedCard({ feed }: { feed: (typeof LIVE_FEEDS)[0] }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-all cursor-pointer group">
      {/* Simulated video placeholder */}
      <div className="relative h-28 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden">
        {/* Simulated fire footage bg */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/60 via-red-950/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Fake "footage" noise pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 30% 70%, rgba(255,100,0,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 40%, rgba(255,60,0,0.3) 0%, transparent 40%)",
        }} />

        {/* Center icon */}
        <div className="relative text-2xl opacity-40 group-hover:opacity-60 transition-opacity">{feed.placeholder}</div>

        {/* Status badge */}
        <div className={cn(
          "absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border",
          feed.status === "LIVE"
            ? "bg-red-600/90 border-red-500 text-white flex items-center gap-1"
            : "bg-zinc-800/90 border-zinc-700 text-zinc-300"
        )}>
          {feed.status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
          {feed.status}
        </div>

        {/* Intensity badge */}
        <div className="absolute top-2 right-2">
          <span className={cn("text-[9px] font-semibold uppercase", INTENSITY_COLORS[feed.intensity] || "text-zinc-400")}>
            {feed.intensity}
          </span>
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-8 w-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center backdrop-blur-sm">
            <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent border-l-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Feed info */}
      <div className="p-2.5">
        <div className="text-[11px] font-medium text-zinc-200 truncate">{feed.title}</div>
        <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{feed.location}</div>
      </div>
    </div>
  );
}

function WeatherPanel() {
  return (
    <div className="border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-[10px] uppercase tracking-widest text-zinc-400">Current Conditions</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: <Thermometer className="h-3 w-3" />, label: "Temp", value: `${WILDFIRE_INCIDENT.temperature}°C`, color: "text-orange-400" },
          { icon: <Wind className="h-3 w-3" />, label: "Wind", value: `${WILDFIRE_INCIDENT.wind.speed} km/h`, color: "text-blue-400" },
          { icon: <Eye className="h-3 w-3" />, label: "RH", value: `${WILDFIRE_INCIDENT.humidity}%`, color: "text-sky-400" },
          { icon: <Radio className="h-3 w-3" />, label: "FWI", value: "EXTREME", color: "text-red-400" },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="bg-zinc-900/60 border border-zinc-800 p-2">
            <div className="flex items-center gap-1 text-zinc-500 mb-1">
              {icon}
              <span className="text-[9px] uppercase tracking-wider">{label}</span>
            </div>
            <div className={cn("text-xs font-bold", color)}>{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 p-2 border border-zinc-800 bg-zinc-900/60">
        <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Wind Direction</div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-300">{WILDFIRE_INCIDENT.wind.direction} — pushing fire NE</span>
          <span className="text-[10px] text-amber-400">⚠ Shift at 14:30</span>
        </div>
      </div>
    </div>
  );
}

function SatellitePanel() {
  return (
    <div className="border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Satellite className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-[10px] uppercase tracking-widest text-zinc-400">Satellite Intel</span>
      </div>
      <div className="space-y-2">
        {[
          { source: "FIRMS / VIIRS", lastUpdate: "~60s delay", hotspots: 847, coverage: 94 },
          { source: "GOES-West GOES-18", lastUpdate: "5 min cycle", hotspots: 812, coverage: 98 },
          { source: "WildFireSat", lastUpdate: "Daily pass", hotspots: null, coverage: 100 },
        ].map((sat) => (
          <div key={sat.source} className="flex items-center justify-between py-1.5 border-b border-zinc-800/60 last:border-0">
            <div>
              <div className="text-[11px] text-zinc-300">{sat.source}</div>
              <div className="text-[9px] text-zinc-600">{sat.lastUpdate}</div>
            </div>
            <div className="text-right">
              {sat.hotspots && (
                <div className="text-[11px] text-orange-400 font-mono">{sat.hotspots} pts</div>
              )}
              <div className="text-[9px] text-zinc-600">{sat.coverage}% cov.</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 p-2 border border-amber-500/30 bg-amber-900/20">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
        <span className="text-[9px] text-amber-400 leading-snug">
          Perimeter estimate: ±8% accuracy. Smoke obscuring N quadrant.
        </span>
      </div>
    </div>
  );
}

export function MediaSidebar() {
  const { isMediaSidebarOpen, toggleMediaSidebar, viewLevel } = useWildfireStore();
  const isOpen = isMediaSidebarOpen && viewLevel === "incident";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed right-0 top-0 z-40 h-screen w-80 border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-sm flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 shrink-0 bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-red-400" strokeWidth={1.5} />
              <div>
                <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Live Feeds</h2>
                <p className="text-[10px] text-zinc-500">{LIVE_FEEDS.filter((f) => f.status === "LIVE").length} active streams</p>
              </div>
            </div>
            <button onClick={toggleMediaSidebar} className="text-zinc-500 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
            {/* Live feed cards */}
            <div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2">Camera & Aerial Feeds</div>
              <div className="grid grid-cols-1 gap-2">
                {LIVE_FEEDS.map((feed) => (
                  <FeedCard key={feed.id} feed={feed} />
                ))}
              </div>
            </div>

            {/* Weather */}
            <WeatherPanel />

            {/* Satellite */}
            <SatellitePanel />

            {/* Spread progression */}
            <div className="border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Perimeter Growth</div>
              <div className="space-y-2">
                {[
                  { label: "Current", value: "1,500 m", pct: 26, color: "bg-red-500" },
                  { label: "+1 Hour", value: "3,200 m", pct: 55, color: "bg-orange-500" },
                  { label: "+3 Hours", value: "5,800 m", pct: 100, color: "bg-amber-600" },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-400">{row.label}</span>
                      <span className="text-zinc-300 font-mono">{row.value} radius</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", row.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${row.pct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Values at risk */}
            <div className="border border-red-500/30 bg-red-950/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-red-400 mb-2">Values at Risk</div>
              <div className="space-y-1.5">
                {[
                  "Kelowna urban interface — 14,200 structures",
                  "Highway 97 corridor — critical evacuation route",
                  "BCIT Kelowna campus — within 3h spread zone",
                  "Agricultural land — 3,400 ha at risk",
                ].map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-zinc-400">
                    <span className="text-red-500 shrink-0 mt-0.5">▸</span>
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer — CIFFC status */}
          <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/40 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest">CIFFC National Status</span>
              <span className="text-[9px] text-amber-400 font-medium">Mutual Aid Active</span>
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">
              3 provinces contributing resources. BCWS Incident Command active.
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
