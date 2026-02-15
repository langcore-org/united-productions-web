/**
 * NextAuth.js 型拡張
 * 
 * カスタムセッションとJWTの型を拡張
 */

import NextAuth from "next-auth";

declare module "next-auth" {
  /**
   * 拡張されたセッション型
   */
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
  }

  /**
   * 拡張されたユーザー型
   */
  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * 拡張されたJWT型
   */
  interface JWT {
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}
