import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

/**
 * FeatureCardコンポーネント
 * 機能紹介カードを表示する共通コンポーネント
 */
export function FeatureCard({
  icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-white border border-gray-200 transition-all duration-300",
        "hover:border-gray-300 hover:bg-gray-50",
        className
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center mb-3 text-black">
        {icon}
      </div>
      <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
