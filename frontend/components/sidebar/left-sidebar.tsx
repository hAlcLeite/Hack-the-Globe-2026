"use client";

import { Flame, Brain, Globe, Map, ChevronLeft } from "lucide-react";
import { MenuItem, MenuContainer } from "@/components/ui/stack-menu";
import { useWildfireStore } from "@/stores/wildfire-store";
import type { ViewLevel } from "@/stores/wildfire-store";

export function LeftSidebar() {
  const { viewLevel, setViewLevel, toggleAiSidebar, isAiSidebarOpen } =
    useWildfireStore();

  const handleBack = () => {
    if (viewLevel === "incident") setViewLevel("province");
    else if (viewLevel === "province") setViewLevel("national");
  };

  const breadcrumb: Record<ViewLevel, string[]> = {
    national: ["CANADA"],
    province: ["BC"],
    incident: ["INCIDENT"],
  };

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-14 border-r border-zinc-800 bg-zinc-950 flex flex-col items-center">
      <div className="w-full border-b border-zinc-800 flex flex-col items-center justify-center h-14 bg-zinc-900/60 shrink-0 gap-0.5">
        <Flame className="h-4 w-4 text-orange-500" strokeWidth={1.5} />
        <span className="text-[7px] text-zinc-600 uppercase tracking-widest">Phoenix</span>
      </div>

      <div className="w-full px-1 py-1.5 border-b border-zinc-800 shrink-0 flex justify-center">
        {breadcrumb[viewLevel].map((part, i) => (
          <span key={i} className="text-[8px] text-zinc-600 uppercase tracking-widest">{part}</span>
        ))}
      </div>

      <div className="flex-1 w-full mt-1">
        <MenuContainer>
          <MenuItem icon={<Flame size={16} strokeWidth={1.5} />} label="Menu" />
          <MenuItem
            icon={<Globe size={16} strokeWidth={1.5} />}
            onClick={() => setViewLevel("national")}
            isActive={viewLevel === "national"}
            label="National View"
          />
          <MenuItem
            icon={<Map size={16} strokeWidth={1.5} />}
            onClick={() => viewLevel !== "national" && setViewLevel("province")}
            isActive={viewLevel === "province"}
            disabled={viewLevel === "national"}
            label="Province View"
          />
          <MenuItem
            icon={<Flame size={16} strokeWidth={1.5} />}
            onClick={() => viewLevel === "province" && setViewLevel("incident")}
            isActive={viewLevel === "incident"}
            disabled={viewLevel !== "incident" && viewLevel !== "province"}
            label="Incident View"
          />
          <MenuItem
            icon={<Brain size={16} strokeWidth={1.5} />}
            onClick={toggleAiSidebar}
            isActive={isAiSidebarOpen && viewLevel === "incident"}
            disabled={viewLevel !== "incident"}
            label="AI Analysis"
          />
          <MenuItem
            icon={<ChevronLeft size={16} strokeWidth={1.5} />}
            onClick={handleBack}
            disabled={viewLevel === "national"}
            label="Back"
          />
        </MenuContainer>
      </div>

      <div className="pb-3 flex flex-col items-center gap-1 shrink-0">
        <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-[7px] text-zinc-700 uppercase tracking-wider">LIVE</span>
      </div>
    </aside>
  );
}
