"use client";

import { cn } from "@/lib/utils";

interface TeddyIconProps {
  className?: string;
  size?: number;
  variant?: "default" | "outline" | "filled";
}

export function TeddyIcon({ 
  className, 
  size = 32,
  variant = "default" 
}: TeddyIconProps) {
  const fillColor = variant === "filled" ? "currentColor" : "none";
  const strokeColor = "currentColor";
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill={fillColor}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("", className)}
    >
      {/* 左耳 */}
      <circle
        cx="8"
        cy="8"
        r="4"
        stroke={strokeColor}
        strokeWidth="2"
        fill={variant === "filled" ? "currentColor" : "#8B4513"}
      />
      {/* 右耳 */}
      <circle
        cx="24"
        cy="8"
        r="4"
        stroke={strokeColor}
        strokeWidth="2"
        fill={variant === "filled" ? "currentColor" : "#8B4513"}
      />
      {/* 顔の輪郭 */}
      <ellipse
        cx="16"
        cy="18"
        rx="10"
        ry="9"
        stroke={strokeColor}
        strokeWidth="2"
        fill={variant === "filled" ? "currentColor" : "#D2691E"}
      />
      {/* 左目 */}
      <circle
        cx="12"
        cy="15"
        r="1.5"
        fill={variant === "filled" ? "white" : "#1a1a1a"}
      />
      {/* 右目 */}
      <circle
        cx="20"
        cy="15"
        r="1.5"
        fill={variant === "filled" ? "white" : "#1a1a1a"}
      />
      {/* 鼻 */}
      <ellipse
        cx="16"
        cy="19"
        rx="2.5"
        ry="1.8"
        fill={variant === "filled" ? "#1a1a1a" : "#1a1a1a"}
      />
      {/* 口 */}
      <path
        d="M13 22 Q16 25 19 22"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* 左頬 */}
      <circle
        cx="9"
        cy="20"
        r="1.5"
        fill="#FFB6C1"
        opacity="0.6"
      />
      {/* 右頬 */}
      <circle
        cx="23"
        cy="20"
        r="1.5"
        fill="#FFB6C1"
        opacity="0.6"
      />
    </svg>
  );
}

export function TeddyLogo({ 
  className,
  size = 40,
  showText = true 
}: { 
  className?: string; 
  size?: number;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <TeddyIcon size={size} variant="filled" className="text-amber-700" />
      </div>
      {showText && (
        <span className="font-bold text-xl tracking-tight">Teddy</span>
      )}
    </div>
  );
}

export default TeddyIcon;
