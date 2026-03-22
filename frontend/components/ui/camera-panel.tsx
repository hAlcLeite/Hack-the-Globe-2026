"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, ChevronLeft, ChevronRight } from "lucide-react";
import { CAMERA_FEEDS } from "@/data/demo-wildfire";
import { cn } from "@/lib/utils";

const INTENSITY_COLORS: Record<string, string> = {
  Extreme: "text-red-400",
  High: "text-orange-400",
  Moderate: "text-amber-400",
};


export function CameraPanel({ visible }: { visible: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = CAMERA_FEEDS[activeIndex];

  const prev = () => setActiveIndex((i) => (i - 1 + CAMERA_FEEDS.length) % CAMERA_FEEDS.length);
  const next = () => setActiveIndex((i) => (i + 1) % CAMERA_FEEDS.length);

  if (!visible) return null;

  return (
    <div className="absolute top-4 right-4 z-30 w-64 select-none">
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-zinc-950/95 border border-zinc-800 backdrop-blur-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-1.5">
            <Video className="h-3 w-3 text-red-400" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">Live Feed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] text-red-400 font-medium">LIVE</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative h-36 bg-zinc-950 overflow-hidden"
          >
            <video
              key={active.id}
              src={active.video}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
              }}
            />

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
              <div className="text-[10px] font-medium text-white leading-tight">{active.title}</div>
              <div className="text-[9px] text-zinc-400 mt-0.5">{active.location}</div>
            </div>

            <div className="absolute top-2 right-2">
              <span className={cn("text-[9px] font-bold uppercase", INTENSITY_COLORS[active.intensity])}>
                {active.intensity}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center border-t border-zinc-800">
          <button
            onClick={prev}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-1">
            {CAMERA_FEEDS.map((feed, i) => (
              <button
                key={feed.id}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "text-[10px] font-semibold px-2 py-1.5 uppercase tracking-wider transition-all",
                  i === activeIndex
                    ? "text-white bg-zinc-700/80"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {feed.label}
              </button>
            ))}
          </div>

          <button
            onClick={next}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
