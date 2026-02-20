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
      {/* 左耳 - ぷっくり丸みを帯びた耳 */}
      <circle
        cx="7"
        cy="7"
        r="4.5"
        fill={variant === "filled" ? "currentColor" : "#C17848"}
      />
      {/* 右耳 */}
      <circle
        cx="25"
        cy="7"
        r="4.5"
        fill={variant === "filled" ? "currentColor" : "#C17848"}
      />
      {/* 顔の輪郭 - より丸く */}
      <circle
        cx="16"
        cy="17"
        r="11"
        fill={variant === "filled" ? "currentColor" : "#D2691E"}
      />
      {/* 左目 - アニメ風大きめの目 */}
      <ellipse
        cx="11"
        cy="15"
        rx="2"
        ry="2.5"
        fill="#1a1a1a"
      />
      {/* 左目のハイライト */}
      <circle
        cx="12"
        cy="13.5"
        r="0.8"
        fill="white"
      />
      {/* 右目 - アニメ風大きめの目 */}
      <ellipse
        cx="21"
        cy="15"
        rx="2"
        ry="2.5"
        fill="#1a1a1a"
      />
      {/* 右目のハイライト */}
      <circle
        cx="22"
        cy="13.5"
        r="0.8"
        fill="white"
      />
      {/* 鼻 - 小さめシンプル */}
      <ellipse
        cx="16"
        cy="19"
        rx="1.5"
        ry="1"
        fill="#1a1a1a"
      />
      {/* 口 - ω型でかわいらしく */}
      <path
        d="M14 21 Q16 23 18 21"
        stroke="#1a1a1a"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* 左頬 - ぷっくり強調 */}
      <ellipse
        cx="8"
        cy="19"
        rx="2"
        ry="1.2"
        fill="#FF9AA2"
        opacity="0.7"
      />
      {/* 右頬 */}
      <ellipse
        cx="24"
        cy="19"
        rx="2"
        ry="1.2"
        fill="#FF9AA2"
        opacity="0.7"
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
