"use client";

import { cn } from "@/lib/utils";
import { Users, MapPin, ShieldCheck } from "lucide-react";
import { ResearchAgentType } from "@/types/research";
import { AGENT_CONFIG, AGENT_DEFAULT_PROVIDERS } from "@/lib/research/config";

interface AgentTabsProps {
  activeAgent: ResearchAgentType;
  onChange: (agent: ResearchAgentType) => void;
}

const AGENT_ICONS: Record<ResearchAgentType, typeof Users> = {
  people: Users,
  location: MapPin,
  evidence: ShieldCheck,
};

export function AgentTabs({ activeAgent, onChange }: AgentTabsProps) {
  return (
    <div className="flex gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
      {(Object.keys(AGENT_CONFIG) as ResearchAgentType[]).map((agent) => {
        const isActive = activeAgent === agent;
        const config = AGENT_CONFIG[agent];
        const Icon = AGENT_ICONS[agent];

        return (
          <button
            key={agent}
            onClick={() => onChange(agent)}
            className={cn(
              "flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left",
              isActive
                ? "bg-white border border-gray-300 shadow-sm"
                : "hover:bg-white hover:border-gray-200 border border-transparent"
            )}
          >
            <span
              className={cn(
                "flex-shrink-0",
                isActive ? "text-black" : "text-gray-400"
              )}
            >
              <Icon className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "font-medium text-sm",
                  isActive ? "text-gray-900" : "text-gray-600"
                )}
              >
                {config.label}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {config.description.substring(0, 20)}...
              </div>
            </div>
            {isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                {AGENT_DEFAULT_PROVIDERS[agent]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
