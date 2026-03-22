"use client";

import { WildfireMap } from "@/components/map/wildfire-map";
import { LeftSidebar } from "@/components/sidebar/left-sidebar";
import { AiSidebar } from "@/components/sidebar/ai-sidebar";
import { CameraPanel } from "@/components/ui/camera-panel";
import { DeploymentBar } from "@/components/ui/deployment-bar";
import { useWildfireStore } from "@/stores/wildfire-store";

export default function MapPage() {
  const { isAiSidebarOpen, viewLevel } = useWildfireStore();

  const isIncident = viewLevel === "incident";
  const leftPad = isIncident && isAiSidebarOpen ? "pl-[calc(3.5rem+18rem)]" : "pl-14";
  const bottomPad = isIncident ? "pb-[88px]" : "pb-0";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      <LeftSidebar />
      <AiSidebar />

      <div className={`${leftPad} ${bottomPad} h-full transition-all duration-300 relative`}>
        <WildfireMap />
        <CameraPanel visible={isIncident} />
      </div>

      <DeploymentBar visible={isIncident} />
    </main>
  );
}
