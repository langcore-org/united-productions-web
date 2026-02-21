import { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "議事録・文字起こし - Teddy",
  description: "Zoom文字起こしをAIで整形して議事録を作成",
};

export default function MeetingNotesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppLayout>{children}</AppLayout>;
}
