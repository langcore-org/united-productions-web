import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ビルド設定
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 画像設定
  images: {
    unoptimized: true,
  },
  
  // 実験的機能
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  
  // ヘッダー設定
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
