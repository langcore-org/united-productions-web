import type { DefaultSession } from "next-auth";

/**
 * NextAuth Session 型の拡張
 * JWTコールバックで設定したカスタムフィールドを型定義
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    userId?: string;
    role?: string;
  }
}
