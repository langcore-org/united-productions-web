"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { forwardRef } from "react";

// Button size variants
const featureButtonVariants = cva(
  // Base styles
  [
    "group inline-flex items-center justify-center gap-2",
    "rounded-full font-medium",
    "transition-all duration-200 ease-out",
    "border",
    "hover:scale-[1.02]",
    "active:scale-[0.98]",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
  ],
  {
    variants: {
      variant: {
        light: [
          "bg-white",
          "border-zinc-200",
          "text-zinc-700",
          "hover:border-zinc-400",
          "hover:shadow-md",
          "hover:shadow-zinc-200/50",
          "focus:ring-zinc-400",
          "data-[active=true]:border-zinc-900",
          "data-[active=true]:bg-zinc-900",
          "data-[active=true]:text-white",
        ],
        dark: [
          "bg-gray-100",
          "border-gray-200",
          "text-gray-700",
          "hover:border-gray-300",
          "hover:bg-gray-200",
          "hover:shadow-lg",
          "hover:shadow-gray-200/50",
          "focus:ring-gray-700/50",
          "data-[active=true]:border-gray-700/50",
          "data-[active=true]:bg-gray-100",
          "data-[active=true]:text-gray-700",
        ],
      },
      size: {
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-4 py-2 text-sm gap-2",
        lg: "px-5 py-2.5 text-base gap-2.5",
      },
    },
    defaultVariants: {
      variant: "light",
      size: "md",
    },
  }
);

// Icon container variants
const iconContainerVariants = cva(
  "flex items-center justify-center transition-colors duration-200",
  {
    variants: {
      variant: {
        light: [
          "text-zinc-500",
          "group-hover:text-zinc-700",
          "group-data-[active=true]:text-white",
        ],
        dark: [
          "text-gray-500",
          "group-hover:text-gray-700",
          "group-data-[active=true]:text-gray-700",
        ],
      },
      size: {
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5",
      },
    },
    defaultVariants: {
      variant: "light",
      size: "md",
    },
  }
);

// Shortcut key styles
const shortcutVariants = cva(
  "ml-1 font-mono text-[10px] tracking-wider rounded px-1 py-0.5 transition-colors duration-200",
  {
    variants: {
      variant: {
        light: [
          "bg-zinc-100",
          "text-zinc-500",
          "group-hover:bg-zinc-200",
          "group-hover:text-zinc-600",
          "group-data-[active=true]:bg-zinc-700",
          "group-data-[active=true]:text-zinc-300",
        ],
        dark: [
          "bg-gray-200",
          "text-gray-500",
          "group-hover:bg-gray-300",
          "group-hover:text-gray-600",
          "group-data-[active=true]:bg-gray-200",
          "group-data-[active=true]:text-gray-700",
        ],
      },
    },
    defaultVariants: {
      variant: "light",
    },
  }
);

// Types
export interface FeatureButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  shortcut?: string;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export interface FeatureButtonsProps extends VariantProps<typeof featureButtonVariants> {
  buttons: FeatureButton[];
  className?: string;
  buttonClassName?: string;
  orientation?: "horizontal" | "vertical";
  gap?: "sm" | "md" | "lg";
}

// Gap styles
const gapStyles = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

// Individual Feature Button Component
interface FeatureButtonItemProps extends VariantProps<typeof featureButtonVariants> {
  button: FeatureButton;
  className?: string;
}

const FeatureButtonItem = forwardRef<HTMLButtonElement | HTMLAnchorElement, FeatureButtonItemProps>(
  ({ button, variant, size, className }, ref) => {
    const buttonContent = (
      <>
        <span className={cn(iconContainerVariants({ variant, size }))}>
          {button.icon}
        </span>
        <span className="whitespace-nowrap">{button.label}</span>
        {button.shortcut && (
          <span className={cn(shortcutVariants({ variant }))}>
            {button.shortcut}
          </span>
        )}
      </>
    );

    const commonProps = {
      "data-active": button.isActive,
      "data-disabled": button.disabled,
      className: cn(
        featureButtonVariants({ variant, size }),
        "data-[disabled=true]:opacity-50",
        "data-[disabled=true]:cursor-not-allowed",
        "data-[disabled=true]:hover:scale-100",
        className
      ),
    };

    // Render as Link if href is provided
    if (button.href && !button.disabled) {
      return (
        <Link
          href={button.href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          {...commonProps}
        >
          {buttonContent}
        </Link>
      );
    }

    // Render as button
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={button.onClick}
        disabled={button.disabled}
        {...commonProps}
      >
        {buttonContent}
      </button>
    );
  }
);

FeatureButtonItem.displayName = "FeatureButtonItem";

// Main Feature Buttons Container Component
export function FeatureButtons({
  buttons,
  variant = "light",
  size = "md",
  className,
  buttonClassName,
  orientation = "horizontal",
  gap = "md",
}: FeatureButtonsProps) {
  const containerClasses = cn(
    "flex",
    orientation === "horizontal" ? "flex-row flex-wrap" : "flex-col",
    gapStyles[gap],
    className
  );

  return (
    <div className={containerClasses} role="group" aria-label="Feature buttons">
      {buttons.map((button) => (
        <FeatureButtonItem
          key={button.id}
          button={button}
          variant={variant}
          size={size}
          className={buttonClassName}
        />
      ))}
    </div>
  );
}

// Pre-defined button presets for common use cases
export const presetButtons = {
  deepSearch: (props?: Partial<FeatureButton>): FeatureButton => ({
    id: "deep-search",
    label: "DeepSearch",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6" />
        <path d="M8 11h6" />
      </svg>
    ),
    shortcut: "⌘K",
    ...props,
  }),

  imagine: (props?: Partial<FeatureButton>): FeatureButton => ({
    id: "imagine",
    label: "Imagine",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
      </svg>
    ),
    shortcut: "⌘I",
    ...props,
  }),

  news: (props?: Partial<FeatureButton>): FeatureButton => ({
    id: "news",
    label: "最新ニュース",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" />
        <path d="M15 18h-5" />
        <path d="M10 6h8v4h-8V6Z" />
      </svg>
    ),
    ...props,
  }),

  voiceChat: (props?: Partial<FeatureButton>): FeatureButton => ({
    id: "voice-chat",
    label: "ボイスチャット",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v10" />
        <path d="M18 8v6a6 6 0 0 1-12 0V8" />
        <path d="M12 18v4" />
        <path d="M8 22h8" />
      </svg>
    ),
    ...props,
  }),

  minutes: (props?: Partial<FeatureButton>): FeatureButton => ({
    id: "minutes",
    label: "議事録",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    ),
    ...props,
  }),

  transcription: (props?: Partial<FeatureButton>): FeatureButton => ({
    id: "transcription",
    label: "起こし・NA",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v10" />
        <path d="M18 8v6a6 6 0 0 1-12 0V8" />
        <path d="M12 18v4" />
        <path d="M8 22h8" />
        <circle cx="17" cy="6" r="3" fill="currentColor" className="text-gray-700" />
      </svg>
    ),
    ...props,
  }),

  // locationSchedule（ロケスケ）は削除
};

// Export individual button component for advanced use cases
export { FeatureButtonItem };
export type { FeatureButtonItemProps };
