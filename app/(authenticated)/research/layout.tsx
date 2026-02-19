import { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "リサーチ・考査 - AI Hub",
  description: "人探し、エビデンス確認、ロケ地探しのためのAIリサーチ機能",
};

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
