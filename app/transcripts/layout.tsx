import { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "起こし・NA原稿 - AI Hub",
  description: "Premiere Pro書き起こしをAIで整形してNA原稿を作成",
};

export default function TranscriptsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppLayout>{children}</AppLayout>;
}
