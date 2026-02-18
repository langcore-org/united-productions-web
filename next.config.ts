import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // CI環境以外では型エラーをチェック（本番デプロイ時は必ず検証）
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === "true",
  },
  eslint: {
    // CI環境以外ではESLintエラーをチェック
    ignoreDuringBuilds: process.env.SKIP_LINT === "true",
  },
  images: {
    unoptimized: false, // 画像最適化を有効化（Vercelで推奨）
  },
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
