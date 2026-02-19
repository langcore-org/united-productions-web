/**
 * 公開ページ用レイアウト
 * 認証不要のページで使用
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
