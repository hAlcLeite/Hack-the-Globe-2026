"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ChevronRight,
  AlertTriangle,
  Clock,
  Users,
  Plane,
  Truck,
  Target,
  CheckCircle2,
  X,
  Crosshair,
  Wind,
  Thermometer,
  Droplets,
} from "lucide-react";
import { useWildfireStore } from "@/stores/wildfire-store";
import {
  WILDFIRE_INCIDENT,
  AI_SUGGESTIONS,
  MISSION_LOG,
} from "@/data/fake-wildfire";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES = {
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

function ResourceIcon({ type }: { type: string }) {
  if (type === "air-tanker" || type === "helicopter") return <Plane className="h-3.5 w-3.5" />;
  if (type === "heavy-equipment") return <Truck className="h-3.5 w-3.5" />;
  return <Users className="h-3.5 w-3.5" />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    deployed: "bg-green-500/20 text-green-400 border-green-500/40",
    ready: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    standby: "bg-zinc-700/50 text-zinc-400 border-zinc-600",
  };
  return (
    <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 border rounded-sm", colors[status] || colors.standby)}>
      {status}
    </span>
  );
}

export function AiSidebar() {
  const {
    isAiSidebarOpen,
    toggleAiSidebar,
    firstResponders,
    actionAssets,
    selectedResourceId,
    setSelectedResourceId,
    submitted,
    submittedAt,
    submit,
    resetMission,
    viewLevel,
  } = useWildfireStore();

  const isOpen = isAiSidebarOpen && viewLevel === "incident";
  const deployedCount = [...firstResponders, ...actionAssets].filter((r) => r.deployedPosition).length;
  const totalResources = firstResponders.length + actionAssets.length;

  const handleResourceClick = (id: string) => {
    setSelectedResourceId(selectedResourceId === id ? null : id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed left-14 top-0 z-40 h-screen w-80 border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-sm flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 shrink-0 bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-400" strokeWidth={1.5} />
              <div>
                <h2 className="text-xs font-semibold text-white uppercase tracking-widest">AI Commander</h2>
                <p className="text-[10px] text-zinc-500">Palantir Wildfire Intelligence</p>
              </div>
            </div>
            <button onClick={toggleAiSidebar} className="text-zinc-500 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Incident summary strip */}
          <div className="border-b border-zinc-800 px-4 py-3 bg-red-950/20 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Active Incident</span>
              <span className="text-[10px] text-red-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                {WILDFIRE_INCIDENT.status}
              </span>
            </div>
            <div className="text-sm font-semibold text-white mb-1">{WILDFIRE_INCIDENT.name}</div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-zinc-900/60 border border-zinc-800 p-2 text-center">
                <div className="text-xs font-bold text-orange-400">{WILDFIRE_INCIDENT.containment}%</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">Contained</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 p-2 text-center">
                <div className="text-xs font-bold text-red-400">{WILDFIRE_INCIDENT.size.toLocaleString()}</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">Hectares</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 p-2 text-center">
                <div className="text-xs font-bold text-amber-400">HIGH</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">Severity</div>
              </div>
            </div>

            {/* Weather strip */}
            <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1"><Wind className="h-3 w-3" /> {WILDFIRE_INCIDENT.wind.speed} km/h {WILDFIRE_INCIDENT.wind.direction}</span>
              <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" /> {WILDFIRE_INCIDENT.temperature}°C</span>
              <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {WILDFIRE_INCIDENT.humidity}% RH</span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* AI Suggestions */}
            <div className="px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Containment COAs</span>
              </div>
              <div className="space-y-2">
                {AI_SUGGESTIONS.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "border p-3 space-y-1.5 cursor-default transition-all hover:brightness-110",
                      PRIORITY_STYLES[s.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.LOW
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[s.priority] || "bg-zinc-500")} />
                        <span className="text-[9px] uppercase tracking-widest font-bold opacity-80">{s.priority}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] opacity-70">
                        <Clock className="h-2.5 w-2.5" />
                        {s.timeWindow}
                      </div>
                    </div>
                    <p className="text-[11px] font-medium leading-snug">{s.title}</p>
                    <p className="text-[10px] opacity-70 leading-snug">{s.detail}</p>
                    <div className="flex items-center gap-1 pt-0.5">
                      <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-current rounded-full"
                          style={{ width: `${s.confidence}%`, opacity: 0.7 }}
                        />
                      </div>
                      <span className="text-[9px] opacity-60">{s.confidence}% conf.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mission Resources */}
            <div className="px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Mission Resources</span>
                </div>
                <span className="text-[10px] text-zinc-500">{deployedCount}/{totalResources} placed</span>
              </div>

              {selectedResourceId && (
                <div className="mb-3 p-2 border border-blue-500/40 bg-blue-500/10 flex items-center gap-2">
                  <Crosshair className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                  <span className="text-[10px] text-blue-300">Click map to place selected unit</span>
                  <button
                    className="ml-auto text-zinc-500 hover:text-white"
                    onClick={() => setSelectedResourceId(null)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* First Responders */}
              <div className="mb-2">
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">First Responders</div>
                <div className="space-y-1.5">
                  {firstResponders.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => !submitted && handleResourceClick(r.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 border transition-all cursor-pointer group",
                        selectedResourceId === r.id
                          ? "border-blue-500 bg-blue-500/15"
                          : r.deployedPosition
                            ? "border-green-600/50 bg-green-900/20"
                            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70",
                        submitted && "pointer-events-none"
                      )}
                    >
                      <div className={cn(
                        "h-7 w-7 flex items-center justify-center border shrink-0",
                        r.deployedPosition ? "border-green-500/50 bg-green-900/30 text-green-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      )}>
                        <ResourceIcon type={r.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-zinc-200 truncate">{r.name}</div>
                        <div className="text-[9px] text-zinc-500">
                          {r.count} personnel
                          {r.deployedPosition && " · Placed on map"}
                        </div>
                      </div>
                      <StatusBadge status={r.deployedPosition ? "deployed" : r.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Assets */}
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">Action Assets</div>
                <div className="space-y-1.5">
                  {actionAssets.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => !submitted && handleResourceClick(r.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 border transition-all cursor-pointer group",
                        selectedResourceId === r.id
                          ? "border-blue-500 bg-blue-500/15"
                          : r.deployedPosition
                            ? "border-green-600/50 bg-green-900/20"
                            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70",
                        submitted && "pointer-events-none"
                      )}
                    >
                      <div className={cn(
                        "h-7 w-7 flex items-center justify-center border shrink-0",
                        r.deployedPosition ? "border-green-500/50 bg-green-900/30 text-green-400" : "border-zinc-700 bg-zinc-800 text-amber-400"
                      )}>
                        <ResourceIcon type={r.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-zinc-200 truncate">{r.name}</div>
                        <div className="text-[9px] text-zinc-500">
                          {r.type.replace("-", " ")}
                          {r.deployedPosition && " · Placed on map"}
                        </div>
                      </div>
                      <StatusBadge status={r.deployedPosition ? "deployed" : r.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="mt-4">
                {!submitted ? (
                  <button
                    onClick={submit}
                    disabled={deployedCount === 0}
                    className={cn(
                      "w-full py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-all border",
                      deployedCount > 0
                        ? "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white"
                        : "bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    {deployedCount === 0
                      ? "Place Resources First"
                      : `Submit Mission — ${deployedCount} Unit${deployedCount > 1 ? "s" : ""}`}
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-green-500/50 bg-green-900/20 p-3 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">
                        Mission Dispatched
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      {deployedCount} unit{deployedCount > 1 ? "s" : ""} deployed at {submittedAt}. ICS notified.
                    </p>
                    <button
                      onClick={resetMission}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                    >
                      Reset deployment
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Mission Log */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Mission Log</span>
              </div>
              <div className="space-y-2">
                {MISSION_LOG.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[9px] text-zinc-600 font-mono shrink-0 mt-0.5">{entry.time}</span>
                    <div className="w-px h-full bg-zinc-800 shrink-0" />
                    <span className="text-[10px] text-zinc-400 leading-snug">{entry.message}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1 text-[9px] text-zinc-600">
                <AlertTriangle className="h-3 w-3" />
                <span>Threat: {WILDFIRE_INCIDENT.threat}</span>
              </div>
            </div>
          </div>

          {/* Spread assessment footer */}
          <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/40 shrink-0">
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">Spread Forecast</div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: "68%" }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                />
              </div>
              <span className="text-[10px] text-orange-400 font-mono shrink-0">+320 m/hr</span>
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-zinc-600">
              <span>Now · 1.5 km</span>
              <span>+1h · 3.2 km</span>
              <span>+3h · 5.8 km</span>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
