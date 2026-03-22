"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Flame,
  Crosshair,
  CheckCircle2,
  RotateCcw,
  X,
  ChevronUp,
  Tractor,
  PlaneTakeoff,
} from "lucide-react";
import type { ResourceType } from "@/stores/wildfire-store";

const ACTION_ICON: Record<string, React.ReactNode> = {
  "dozer-line": <Tractor className="h-4 w-4 text-stone-400" />,
  "air-tanker": <PlaneTakeoff className="h-4 w-4 text-sky-400" />,
};
import { useWildfireStore } from "@/stores/wildfire-store";
import type { Resource } from "@/stores/wildfire-store";
import { cn } from "@/lib/utils";

function GroundCrewSubCard({ crew }: { crew: Resource }) {
  const { selectedResourceId, setSelectedResourceId, removeDeployment, submitted } =
    useWildfireStore();
  const isSelected = selectedResourceId === crew.id;
  const isDeployed = !!crew.deployedPosition;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 border cursor-pointer transition-all",
        isDeployed
          ? "border-green-600/50 bg-green-900/20 cursor-default"
          : isSelected
            ? "border-blue-500 bg-blue-900/25"
            : "border-zinc-700 bg-zinc-800/50 hover:brightness-125",
        submitted && "opacity-60 pointer-events-none"
      )}
      onClick={() => {
        if (submitted || isDeployed) return;
        setSelectedResourceId(isSelected ? null : crew.id);
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-zinc-200">{crew.name}</div>
        <div className="text-[9px] text-zinc-500">
          {crew.count} people &middot; {crew.experience}
        </div>
      </div>
      <div className="shrink-0">
        {isDeployed ? (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-400" />
            {!submitted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeDeployment(crew.id);
                }}
              >
                <X className="h-3 w-3 text-zinc-600 hover:text-zinc-300" />
              </button>
            )}
          </div>
        ) : isSelected ? (
          <Crosshair className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
        ) : null}
      </div>
    </div>
  );
}

function GroundCrewCard() {
  const { groundCrews, submitted } = useWildfireStore();
  const [expanded, setExpanded] = useState(false);
  const deployedCount = groundCrews.filter((r) => r.deployedPosition).length;

  return (
    <div className="relative shrink-0">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 bg-zinc-950/98 border border-zinc-700 backdrop-blur-sm p-2 space-y-1.5 min-w-[190px] shadow-xl"
          >
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest px-1 mb-2">
              Select a team to deploy
            </div>
            {groundCrews.map((crew) => (
              <GroundCrewSubCard key={crew.id} crew={crew} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setExpanded((v) => !v)}
        disabled={submitted}
        className={cn(
          "flex flex-col gap-1 px-3 py-2 border w-36 text-left transition-all",
          expanded
            ? "border-yellow-500/70 bg-yellow-900/30"
            : "border-zinc-700 bg-zinc-900/60 hover:brightness-125",
          submitted && "opacity-60 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between">
          <Users className="h-4 w-4 text-yellow-400" />
          <ChevronUp
            className={cn(
              "h-3.5 w-3.5 text-zinc-500 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
        <div className="text-[11px] font-medium text-zinc-200">Ground Crew</div>
        <div className="text-[9px] text-zinc-500">
          {deployedCount} / {groundCrews.length} deployed
        </div>
      </button>
    </div>
  );
}

function PlannedBurnCard() {
  const {
    fireActions,
    selectedResourceId,
    setSelectedResourceId,
    removeDeployment,
    submitted,
    activeBurnLine,
    deployedBurnLines,
  } = useWildfireStore();
  const resource = fireActions.find((r) => r.type === "planned-burn");
  if (!resource) return null;

  const isSelected = selectedResourceId === resource.id;
  const hasLines = deployedBurnLines.length > 0;

  const handleClick = () => {
    if (submitted) return;
    setSelectedResourceId(isSelected ? null : resource.id);
  };

  let statusText = "Draw burn line";
  if (hasLines && !isSelected) {
    statusText = `${deployedBurnLines.length} line${deployedBurnLines.length > 1 ? "s" : ""} set`;
  } else if (isSelected) {
    statusText = activeBurnLine.length === 0 ? "Click pt. 1 on map" : "Click pt. 2 to finish";
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-3 py-2 border cursor-pointer w-36 transition-all shrink-0",
        hasLines && !isSelected
          ? "border-orange-500/60 bg-orange-900/25"
          : isSelected
            ? "border-orange-500 bg-orange-950/40"
            : "bg-orange-900/30 border-orange-700/50 hover:brightness-125",
        submitted && "opacity-60 pointer-events-none"
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <Flame className="h-4 w-4 text-orange-400" />
        {hasLines && !submitted ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeDeployment(resource.id);
            }}
          >
            <X className="h-3 w-3 text-zinc-600 hover:text-zinc-300" />
          </button>
        ) : isSelected ? (
          <Crosshair className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
        ) : null}
      </div>
      <div className="text-[11px] font-medium text-zinc-200">Planned Burn</div>
      <div className="text-[9px] text-zinc-500">{statusText}</div>
    </div>
  );
}

function ActionCard({ resource }: { resource: Resource }) {
  const { selectedResourceId, setSelectedResourceId, removeDeployment, submitted } =
    useWildfireStore();
  const isSelected = selectedResourceId === resource.id;
  const isDeployed = !!resource.deployedPosition;

  const handleClick = () => {
    if (submitted || isDeployed) return;
    setSelectedResourceId(isSelected ? null : resource.id);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-3 py-2 border cursor-pointer w-36 transition-all shrink-0",
        isDeployed
          ? "border-green-600/50 bg-green-900/20 cursor-default"
          : isSelected
            ? "border-blue-500 bg-blue-900/25"
            : "border-zinc-700 bg-zinc-900/60 hover:brightness-125",
        submitted && "opacity-60 pointer-events-none"
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        {ACTION_ICON[resource.type] ?? <Tractor className="h-4 w-4 text-stone-400" />}
        {isDeployed && !submitted ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeDeployment(resource.id);
            }}
          >
            <X className="h-3 w-3 text-zinc-600 hover:text-zinc-300" />
          </button>
        ) : isSelected ? (
          <Crosshair className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
        ) : null}
      </div>
      <div className="text-[11px] font-medium text-zinc-200">{resource.name}</div>
      <div className="text-[9px] text-zinc-500">
        {isDeployed ? "Placed on map" : resource.description?.split(" ").slice(0, 5).join(" ")}
      </div>
    </div>
  );
}

export function DeploymentBar({ visible }: { visible: boolean }) {
  const {
    groundCrews,
    fireActions,
    selectedResourceId,
    submitted,
    submittedAt,
    submit,
    resetMission,
    isAiSidebarOpen,
    activeBurnLine,
    deployedBurnLines,
    gameLinearHour,
    gameMinute,
    gameWon,
  } = useWildfireStore();

  const allResources = [...groundCrews, ...fireActions];
  const nonBurnDeployed = allResources.filter(
    (r) => r.type !== "planned-burn" && r.deployedPosition
  ).length;
  const deployedCount = nonBurnDeployed + deployedBurnLines.length;

  const selectedResource = selectedResourceId
    ? allResources.find((r) => r.id === selectedResourceId) ?? null
    : null;
  const isPlannedBurnSelecting = selectedResource?.type === "planned-burn";

  const pointActions = fireActions.filter((r) => r.type !== "planned-burn");

  let hintText = "Click anywhere on the map to place this unit — or click the card again to deselect";
  if (isPlannedBurnSelecting) {
    hintText =
      activeBurnLine.length === 0
        ? "Click first point on map to start burn line, then click second point to complete"
        : "Now click the second point to complete the burn line";
  }

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm"
      style={{
        left: isAiSidebarOpen ? "calc(3.5rem + 18rem)" : "3.5rem",
        transition: "left 300ms",
      }}
    >
      <AnimatePresence>
        {!!selectedResourceId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "border-b px-4 py-1.5 flex items-center gap-2",
              isPlannedBurnSelecting
                ? "border-orange-500/30 bg-orange-950/30"
                : "border-blue-500/30 bg-blue-950/40"
            )}
          >
            <Crosshair
              className={cn(
                "h-3.5 w-3.5 shrink-0 animate-pulse",
                isPlannedBurnSelecting ? "text-orange-400" : "text-blue-400"
              )}
            />
            <span className={cn("text-[10px]", isPlannedBurnSelecting ? "text-orange-300" : "text-blue-300")}>
              {hintText}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 px-4 py-2">
        <div className="shrink-0">
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Ground Crews</div>
          <div className="text-[9px] text-zinc-700">Tap to expand</div>
        </div>

        <GroundCrewCard />

        <div className="h-10 w-px bg-zinc-800 shrink-0" />

        <div className="shrink-0">
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Actions</div>
          <div className="text-[9px] text-zinc-700">Click to place</div>
        </div>

        <div className="flex items-center gap-2">
          <PlannedBurnCard />
          {pointActions.map((r) => (
            <ActionCard key={r.id} resource={r} />
          ))}
        </div>

        <div className="flex-1" />

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <div className="text-[9px] text-zinc-600 font-mono">
            {String(gameLinearHour % 24).padStart(2, "0")}:{String(gameMinute).padStart(2, "0")}
          </div>
          {!submitted ? (
            <button
              onClick={submit}
              disabled={deployedCount === 0}
              className={cn(
                "px-5 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all border whitespace-nowrap",
                deployedCount > 0
                  ? "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed"
              )}
            >
              {deployedCount === 0
                ? "Place units first"
                : `Dispatch  —  ${deployedCount} unit${deployedCount > 1 ? "s" : ""}`}
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3"
            >
              <div className="text-right">
                <div className="text-[10px] text-green-400 font-semibold flex items-center gap-1.5 justify-end">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Dispatched at {submittedAt}
                </div>
                <div className="text-[9px] text-zinc-500">
                  {deployedCount} unit{deployedCount > 1 ? "s" : ""} en route
                </div>
              </div>
              <button
                onClick={resetMission}
                className="p-1.5 text-zinc-600 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 transition-colors"
                title="Reset mission"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
