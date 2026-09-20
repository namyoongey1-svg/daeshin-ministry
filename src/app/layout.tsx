import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_KR, Noto_Serif, Noto_Serif_Hebrew } from "next/font/google";
import "./globals.css";

const kr = Noto_Sans_KR({ variable: "--font-kr", subsets: ["latin"], weight: ["400", "500", "700"] });
const greek = Noto_Serif({ variable: "--font-greek", subsets: ["greek"], weight: ["400", "600"] });
const hebrew = Noto_Serif_Hebrew({ variable: "--font-hebrew", subsets: ["hebrew"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "대신 교역자 사역자톡방",
  description: "대신 교단 사역자를 위한 청빙·구직, 원어 연구, 설교 준비 플랫폼",
};

const NAV = [
  { href: "/jobs", label: "청빙·구직" },
  { href: "/tools/original", label: "원어 파싱" },
  { href: "/tools/sermon", label: "설교 노트" },
  { href: "/tools/bulletin", label: "주보" },
  { href: "/tools/video", label: "영상 기획" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${kr.variable} ${greek.variable} ${hebrew.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-bold tracking-tight">
              대신 교역자 <span className="text-accent">사역자톡방</span>
            </Link>
            <nav className="flex gap-4 text-sm text-muted">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link href="/account" className="ml-auto text-sm text-muted hover:text-accent">
              내 정보
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted">
          대신 교역자 사역자톡방 · 원어 본문 SBLGNT(CC BY-SA 4.0) · OSHB(CC BY 4.0)
        </footer>
      </body>
    </html>
  );
}
