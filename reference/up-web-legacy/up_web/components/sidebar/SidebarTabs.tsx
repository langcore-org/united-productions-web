"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, FolderOpen, Users, FolderOutput } from "lucide-react";

interface SidebarTabsProps {
  activeTab: "sessions" | "files" | "team" | "output";
  onTabChange: (tab: "sessions" | "files" | "team" | "output") => void;
  sessionsContent: React.ReactNode;
  filesContent: React.ReactNode;
  teamFilesContent: React.ReactNode;
  outputContent?: React.ReactNode;
}

export function SidebarTabs({
  activeTab,
  onTabChange,
  sessionsContent,
  filesContent,
  teamFilesContent,
  outputContent,
}: SidebarTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as "sessions" | "files" | "team" | "output")}
      className="h-full min-h-0 flex flex-col w-full max-w-full overflow-hidden"
    >
      <TabsList className="grid grid-cols-4 mx-2 mt-2 shrink-0">
        <TabsTrigger value="sessions" className="flex items-center gap-1 px-1">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Sessions</span>
        </TabsTrigger>
        <TabsTrigger value="files" className="flex items-center gap-1 px-1">
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Files</span>
        </TabsTrigger>
        <TabsTrigger value="team" className="flex items-center gap-1 px-1">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Team</span>
        </TabsTrigger>
        <TabsTrigger value="output" className="flex items-center gap-1 px-1">
          <FolderOutput className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Output</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sessions" className="flex-1 min-h-0 min-w-0 w-full overflow-hidden mt-0 data-[state=inactive]:hidden">
        {sessionsContent}
      </TabsContent>
      <TabsContent value="files" className="flex-1 min-h-0 min-w-0 w-full overflow-auto mt-0 data-[state=inactive]:hidden">
        {filesContent}
      </TabsContent>
      <TabsContent value="team" className="flex-1 min-h-0 min-w-0 w-full overflow-auto mt-0 data-[state=inactive]:hidden">
        {teamFilesContent}
      </TabsContent>
      <TabsContent value="output" className="flex-1 min-h-0 min-w-0 w-full overflow-auto mt-0 data-[state=inactive]:hidden">
        {outputContent}
      </TabsContent>
    </Tabs>
  );
}
