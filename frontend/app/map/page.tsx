"use client";

import { WildfireMap } from "@/components/map/wildfire-map";
import { LeftSidebar } from "@/components/sidebar/left-sidebar";
import { AiSidebar } from "@/components/sidebar/ai-sidebar";
import { MediaSidebar } from "@/components/sidebar/media-sidebar";
import { useWildfireStore } from "@/stores/wildfire-store";

export default function MapPage() {
  const { isAiSidebarOpen, isMediaSidebarOpen, viewLevel } = useWildfireStore();

  const isIncident = viewLevel === "incident";
  const leftPad = isIncident && isAiSidebarOpen ? "pl-[calc(3.5rem+20rem)]" : "pl-14";
  const rightPad = isIncident && isMediaSidebarOpen ? "pr-80" : "pr-0";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Fixed left icon bar */}
      <LeftSidebar />

      {/* AI Command sidebar — slides in from left */}
      <AiSidebar />

      {/* Media / live feeds sidebar — slides in from right */}
      <MediaSidebar />

      {/* Map takes remaining space */}
      <div className={`${leftPad} ${rightPad} h-full transition-all duration-300`}>
        <WildfireMap />
      </div>
    </main>
  );
}
