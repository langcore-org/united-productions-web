import { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "ロケスケ管理 - ADコパイロット",
  description: "ロケスケジュールの作成・管理・自動生成",
};

export default function SchedulesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppLayout>{children}</AppLayout>;
}
