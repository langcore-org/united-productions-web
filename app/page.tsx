import Image from "next/image";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { getChatNavigationItems } from "@/lib/chat/navigation";

export default function DashboardPage() {
  const items = getChatNavigationItems();

  return (
    <AppLayout>
      <div className="flex min-h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            {/* Logo Section */}
            <div className="flex flex-col items-center mb-12">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center overflow-hidden">
                  <Image src="/Teddy_icon.PNG" alt="Teddy" width={48} height={48} />
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Teddy</h1>
              </div>
              <p className="text-sm text-gray-500">Teacher &amp; Buddy</p>
            </div>

            {/* Feature Cards */}
            <section className="w-full max-w-5xl">
              <h2 className="text-xl font-semibold mb-1">機能一覧</h2>
              <p className="text-sm text-gray-500 mb-6">各機能を選んでチャットを開始できます。</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="border border-gray-200 rounded-2xl p-5 bg-white hover:shadow-md hover:border-gray-400 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <IconComponent className="w-5 h-5" />
                        <span className="font-semibold text-sm">{item.label}</span>
                      </div>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
