"use client";

import { cn } from "@/lib/utils";
import { Users, MapPin, ShieldCheck } from "lucide-react";
import { ResearchAgentType } from "@/app/api/research/route";

interface AgentTabsProps {
  activeAgent: ResearchAgentType;
  onChange: (agent: ResearchAgentType) => void;
}

interface AgentTab {
  id: ResearchAgentType;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultProvider: string;
}

const agents: AgentTab[] = [
  {
    id: "people",
    label: "人探し",
    description: "X検索で人物を特定",
    icon: <Users className="w-5 h-5" />,
    defaultProvider: "Grok 4.1 Fast",
  },
  {
    id: "location",
    label: "ロケ地探し",
    description: "撮影場所を検索",
    icon: <MapPin className="w-5 h-5" />,
    defaultProvider: "Perplexity Sonar",
  },
  {
    id: "evidence",
    label: "エビデンス",
    description: "事実確認と検証",
    icon: <ShieldCheck className="w-5 h-5" />,
    defaultProvider: "Perplexity Sonar",
  },
];

export function AgentTabs({ activeAgent, onChange }: AgentTabsProps) {
  return (
    <div className="flex gap-2 p-2 bg-[#1a1a24] rounded-xl border border-[#2a2a35]">
      {agents.map((agent) => {
        const isActive = activeAgent === agent.id;
        return (
          <button
            key={agent.id}
            onClick={() => onChange(agent.id)}
            className={cn(
              "flex-1 flex items-center gap-3 px-4 py-3 rounded-lg",
              "transition-all duration-200",
              "text-left",
              isActive
                ? "bg-[#ff6b00]/10 border border-[#ff6b00]/30"
                : "hover:bg-[#2a2a35] border border-transparent"
            )}
          >
            <span
              className={cn(
                "flex-shrink-0",
                isActive ? "text-[#ff6b00]" : "text-gray-500"
              )}
            >
              {agent.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "font-medium text-sm",
                  isActive ? "text-white" : "text-gray-300"
                )}
              >
                {agent.label}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {agent.description}
              </div>
            </div>
            {isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff6b00]/20 text-[#ff6b00] flex-shrink-0">
                {agent.defaultProvider}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
