"use client";

import {
  Flame,
  Brain,
  Video,
  Map,
  ChevronLeft,
  Globe,
  Menu,
} from "lucide-react";
import { MenuItem, MenuContainer } from "@/components/ui/stack-menu";
import { useWildfireStore } from "@/stores/wildfire-store";
import type { ViewLevel } from "@/stores/wildfire-store";

export function LeftSidebar() {
  const { viewLevel, setViewLevel, toggleAiSidebar, toggleMediaSidebar, isAiSidebarOpen, isMediaSidebarOpen } =
    useWildfireStore();

  const handleBack = () => {
    if (viewLevel === "incident") setViewLevel("province");
    else if (viewLevel === "province") setViewLevel("national");
  };

  const breadcrumb: Record<ViewLevel, string> = {
    national: "CANADA OVERVIEW",
    province: "BC — OKANAGAN",
    incident: "OKANAGAN RIDGE FIRE",
  };

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-14 border-r border-zinc-800 bg-zinc-950 flex flex-col items-center">
      {/* Logo / Brand */}
      <div className="w-full border-b border-zinc-800 flex items-center justify-center h-14 bg-zinc-900/60 shrink-0">
        <Flame className="h-5 w-5 text-orange-500" strokeWidth={1.5} />
      </div>

      {/* Current view indicator */}
      <div className="w-full px-1 py-2 border-b border-zinc-800 shrink-0">
        <div
          className="text-[8px] text-zinc-500 uppercase tracking-widest text-center leading-tight"
          style={{ writingMode: "horizontal-tb" }}
        >
          {breadcrumb[viewLevel].split("—").map((part, i) => (
            <div key={i}>{part.trim()}</div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 w-full mt-2">
        <MenuContainer>
          <MenuItem
            icon={<Menu size={18} strokeWidth={1.5} />}
            label="Menu"
          />
          <MenuItem
            icon={<Globe size={18} strokeWidth={1.5} />}
            onClick={() => setViewLevel("national")}
            isActive={viewLevel === "national"}
            label="National View"
          />
          <MenuItem
            icon={<Map size={18} strokeWidth={1.5} />}
            onClick={() => viewLevel !== "national" && setViewLevel("province")}
            isActive={viewLevel === "province"}
            disabled={viewLevel === "national"}
            label="Province View"
          />
          <MenuItem
            icon={<Flame size={18} strokeWidth={1.5} />}
            onClick={() => viewLevel === "province" && setViewLevel("incident")}
            isActive={viewLevel === "incident"}
            disabled={viewLevel !== "incident" && viewLevel !== "province"}
            label="Incident View"
          />
          <MenuItem
            icon={<Brain size={18} strokeWidth={1.5} />}
            onClick={toggleAiSidebar}
            isActive={isAiSidebarOpen && viewLevel === "incident"}
            disabled={viewLevel !== "incident"}
            label="AI Command"
          />
          <MenuItem
            icon={<Video size={18} strokeWidth={1.5} />}
            onClick={toggleMediaSidebar}
            isActive={isMediaSidebarOpen && viewLevel === "incident"}
            disabled={viewLevel !== "incident"}
            label="Live Feeds"
          />
          {viewLevel !== "national" && (
            <MenuItem
              icon={<ChevronLeft size={18} strokeWidth={1.5} />}
              onClick={handleBack}
              label="Back"
            />
          )}
        </MenuContainer>
      </div>

      {/* Status dot */}
      <div className="pb-4 flex flex-col items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-[8px] text-zinc-600 uppercase tracking-wider">LIVE</span>
      </div>
    </aside>
  );
}
