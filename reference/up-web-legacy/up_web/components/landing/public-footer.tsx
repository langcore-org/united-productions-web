import Link from "next/link";

const footerLinks = {
  service: {
    title: "サービス",
    links: [
      { label: "機能紹介", href: "/features" },
      { label: "料金プラン", href: "/pricing" },
    ],
  },
  company: {
    title: "会社情報",
    links: [
      { label: "会社概要", href: "/about" },
      { label: "採用情報", href: "/careers" },
    ],
  },
  support: {
    title: "サポート",
    links: [
      { label: "お問い合わせ", href: "/contact" },
      { label: "ヘルプセンター", href: "/help" },
      { label: "利用規約", href: "/terms" },
      { label: "プライバシーポリシー", href: "/privacy" },
    ],
  },
};

export function PublicFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🎬</span>
              <span className="font-semibold">AD-Agent</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              番組制作を、AIで加速する。
            </p>
          </div>

          {/* Links */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold">{section.title}</h3>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          © 2025 AD-Agent. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
