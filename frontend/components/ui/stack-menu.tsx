"use client";

import React, { useState } from "react";

interface MenuItemProps {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  label?: string;
}

export function MenuItem({
  children,
  onClick,
  disabled = false,
  icon,
  isActive = false,
  label,
}: MenuItemProps) {
  return (
    <button
      title={label}
      className={`relative block w-full h-14 text-center group rounded-none transition-colors
        ${disabled ? "text-zinc-600 cursor-not-allowed" : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"}
        ${isActive ? "bg-blue-600/20 text-blue-400 border-l-2 border-blue-500" : ""}
      `}
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="flex items-center justify-center h-full">
        {icon && (
          <span className="h-5 w-5 transition-all duration-200 group-hover:[&_svg]:stroke-[2]">
            {icon}
          </span>
        )}
        {children}
      </span>
    </button>
  );
}

export function MenuContainer({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const childrenArray = React.Children.toArray(children);
  const itemSpacing = 56;

  return (
    <div className="relative w-[56px]">
      <div className="relative">
        <div
          className="relative w-14 h-14 bg-zinc-900/80 hover:bg-zinc-800 transition-colors cursor-pointer border-b border-zinc-800 group"
          onClick={() => setIsExpanded((p) => !p)}
        >
          {childrenArray[0]}
        </div>

        {childrenArray.slice(1).map((child, index) => (
          <div
            key={index}
            className="absolute top-0 left-0 w-14 h-14 bg-zinc-900/80 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
            style={{
              transform: `translateY(${isExpanded ? (index + 1) * itemSpacing : 0}px)`,
              opacity: isExpanded ? 1 : 0,
              zIndex: 40 - index,
              transition: `transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms`,
              pointerEvents: isExpanded ? "auto" : "none",
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
