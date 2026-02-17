/**
 * NextAuth.js 型拡張
 * 
 * カスタムセッションとJWTの型を拡張
 */

// NextAuth型拡張

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
      role?: string;
    };
    accessToken?: string;
  }

  /**
   * 拡張されたユーザー型
   */
  interface User {
    id: string;
    role?: string;
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
    role?: string;
  }
}
