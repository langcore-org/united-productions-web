"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface TeddyIconProps {
  className?: string;
  size?: number;
}

export function TeddyIcon({ className, size = 32 }: TeddyIconProps) {
  return (
    <Image
      src="/Teddy_icon.PNG"
      alt="Teddy"
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
    />
  );
}

interface TeddyLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function TeddyLogo({ className, size = 40, showText = true }: TeddyLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TeddyIcon size={size} />
      {showText && <span className="font-bold text-xl tracking-tight">Teddy</span>}
    </div>
  );
}

export default TeddyIcon;
