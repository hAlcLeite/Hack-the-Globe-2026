"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ChevronRight,
  AlertTriangle,
  Clock,
  Target,
  Wind,
  Thermometer,
  Droplets,
  X,
  ShieldAlert,
} from "lucide-react";
import { useWildfireStore } from "@/stores/wildfire-store";
import {
  WILDFIRE_INCIDENT,
  AI_SUGGESTIONS,
  INFRASTRUCTURE_AT_RISK,
} from "@/data/fake-wildfire";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "border-red-500/60 bg-red-500/10 text-red-400",
  HIGH: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  MEDIUM: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  LOW: "border-zinc-600 bg-zinc-800/50 text-zinc-400",
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-zinc-500",
};

export function AiSidebar() {
  const { isAiSidebarOpen, toggleAiSidebar, viewLevel } = useWildfireStore();
  const isOpen = isAiSidebarOpen && viewLevel === "incident";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed left-14 top-0 z-40 h-screen w-72 border-r border-zinc-800 bg-zinc-950/96 backdrop-blur-sm flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5 shrink-0 bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-blue-400" strokeWidth={1.5} />
              <div>
                <h2 className="text-[11px] font-semibold text-white uppercase tracking-widest">
                  AI Analysis
                </h2>
              </div>
            </div>
            <button
              onClick={toggleAiSidebar}
              className="text-zinc-600 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Incident summary */}
          <div className="border-b border-zinc-800 px-3 py-2.5 bg-red-950/20 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Status</span>
              <span className="text-[9px] text-red-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                {WILDFIRE_INCIDENT.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-zinc-900/60 border border-zinc-800 p-1.5 text-center">
                <div className="text-xs font-bold text-orange-400">{WILDFIRE_INCIDENT.containment}%</div>
                <div className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Contained</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 p-1.5 text-center">
                <div className="text-xs font-bold text-red-400">{(WILDFIRE_INCIDENT.size / 1000).toFixed(1)}k</div>
                <div className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Hectares</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 p-1.5 text-center">
                <div className="text-xs font-bold text-amber-400">HIGH</div>
                <div className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Severity</div>
              </div>
            </div>

            {/* Weather strip */}
            <div className="flex items-center gap-2.5 mt-2 text-[9px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Wind className="h-2.5 w-2.5" />
                {WILDFIRE_INCIDENT.wind.speed} km/h {WILDFIRE_INCIDENT.wind.direction}
              </span>
              <span className="flex items-center gap-1">
                <Thermometer className="h-2.5 w-2.5" />
                {WILDFIRE_INCIDENT.temperature}°C
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="h-2.5 w-2.5" />
                {WILDFIRE_INCIDENT.humidity}% RH
              </span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">

            {/* AI Containment suggestions */}
            <div className="px-3 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="h-3 w-3 text-blue-400" />
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium">
                  Containment Recommendations
                </span>
              </div>
              <div className="space-y-2">
                {AI_SUGGESTIONS.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "border p-2.5 space-y-1.5",
                      PRIORITY_STYLES[s.priority] ?? PRIORITY_STYLES.LOW
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[s.priority])} />
                        <span className="text-[8px] uppercase tracking-widest font-bold opacity-80">
                          {s.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] opacity-60">
                        <Clock className="h-2.5 w-2.5" />
                        {s.timeWindow}
                      </div>
                    </div>
                    <p className="text-[11px] font-medium leading-snug">{s.title}</p>
                    <p className="text-[10px] opacity-65 leading-snug">{s.detail}</p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <div className="flex-1 h-0.5 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-current rounded-full opacity-60"
                          style={{ width: `${s.confidence}%` }}
                        />
                      </div>
                      <span className="text-[8px] opacity-50">{s.confidence}% conf.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Infrastructure at Risk */}
            <div className="px-3 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldAlert className="h-3 w-3 text-red-400" />
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium">
                  Infrastructure at Risk
                </span>
              </div>
              <div className="space-y-1.5">
                {INFRASTRUCTURE_AT_RISK.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-zinc-400">
                    <AlertTriangle className="h-2.5 w-2.5 text-red-500 shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Spread forecast */}
            <div className="px-3 py-3 border-b border-zinc-800">
              <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2">Spread Forecast</div>
              <div className="space-y-2">
                {[
                  { label: "Now", value: "1,500 m", pct: 26, color: "bg-red-500" },
                  { label: "+1h", value: "3,200 m", pct: 55, color: "bg-orange-500" },
                  { label: "+3h", value: "5,800 m", pct: 100, color: "bg-amber-600" },
                ].map((row) => (
                  <div key={row.label} className="space-y-0.5">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-zinc-500">{row.label}</span>
                      <span className="text-zinc-400 font-mono">{row.value} radius</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", row.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${row.pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[9px] text-zinc-600 leading-snug">
                {WILDFIRE_INCIDENT.progression}
              </div>
            </div>

          </div>

          {/* Footer chevron hint */}
          <div className="border-t border-zinc-800 px-3 py-2 bg-zinc-900/40 shrink-0 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] text-zinc-600">Phoenix Watch · Wildfire Intelligence</span>
            <ChevronRight className="h-3 w-3 text-zinc-700 ml-auto" />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
