/**
 * NextAuth.js 認証設定
 * AI Hub - United Productions 制作支援統合プラットフォーム
 * 
 * Google Workspace SSO認証 + Drive API連携
 * 
 * 【Vercelプレビュー環境対応】
 * - NEXTAUTH_URL: 本番環境では自動設定、ローカルでは明示的に設定
 * - AUTH_TRUST_HOST: Vercel環境でtrueに設定（複数ホスト対応）
 */

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

/**
 * 現在のホストURLを取得（Vercelプレビュー環境対応）
 */
function getNextAuthUrl(): string {
  // 1. 明示的に設定されたNEXTAUTH_URLを優先
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // 2. Vercel本番環境
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  
  // 3. Vercelプレビュー環境（ブランチデプロイなど）
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 4. フォールバック（ローカル開発用）
  return "http://localhost:3000";
}

/**
 * NextAuth設定オプション
 * 
 * 認証プロバイダー: Google OAuth 2.0
 * アダプター: Prisma（PostgreSQL）
 * スコープ: openid, email, profile, drive.readonly
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  // Vercel環境で複数ホスト（プレビューURL）を信頼する
  trustHost: process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "production" || process.env.AUTH_TRUST_HOST === "true",
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/drive.readonly",
          ].join(" "),
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  /**
   * セッション設定
   * JWT戦略を使用（PrismaAdapterと組み合わせて使用可能）
   */
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },

  /**
   * コールバック関数
   */
  callbacks: {
    /**
     * JWTコールバック
     * アクセストークンとユーザー情報をJWTに追加
     */
    async jwt({ token, account, user }) {
      // 初回サインイン時にアカウント情報をトークンに保存
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        token.userId = user.id;
      }

      // アクセストークンが有効期限内ならそのまま返す
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // トークンのリフレッシュが必要な場合（将来的な実装）
      // 現在は期限切れのトークンを返す
      return token;
    },

    /**
     * セッションコールバック
     * JWTからセッションに必要な情報を追加
     */
    async session({ session, token }: { session: Record<string, unknown> & { user?: Record<string, unknown> }; token: Record<string, unknown> }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },

    /**
     * サインインコールバック
     * 特定ドメインの制限などが必要な場合に実装
     */
    async signIn() {
      // 必要に応じてドメイン制限を実装
      // 例: United Productionsのドメインのみ許可
      // if (user.email && !user.email.endsWith("@united-productions.jp")) {
      //   return false;
      // }
      return true;
    },
  },

  /**
   * イベントハンドラ
   */
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
    async signOut({ token }: { token: Record<string, unknown> }) {
      console.log(`User signed out: ${token.email}`);
    },
  },

  /**
   * デバッグ設定
   * 開発環境でのみ有効
   */
  debug: process.env.NODE_ENV === "development",

  /**
   * カスタムページ設定
   */
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};
