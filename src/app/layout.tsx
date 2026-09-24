import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_KR, Noto_Serif, Noto_Serif_Hebrew } from "next/font/google";
import { Logo } from "@/components/Logo";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const kr = Noto_Sans_KR({ variable: "--font-kr", subsets: ["latin"], weight: ["400", "500", "700"] });
const greek = Noto_Serif({ variable: "--font-greek", subsets: ["greek"], weight: ["400", "600"] });
const hebrew = Noto_Serif_Hebrew({ variable: "--font-hebrew", subsets: ["hebrew"], weight: ["400", "600"] });

const SITE_URL = getSiteUrl();

const DESCRIPTION =
  "대신 교단 사역자를 위한 자리입니다. 갓피플·백석대·총신대 게시판에 흩어진 청빙공고를 한곳에 모으고, 구약 히브리어·신약 헬라어 원어 분석과 주보·설교·영상 준비 도구를 함께 씁니다.";

export const metadata: Metadata = {
  // 상대 경로로 적은 canonical·og 이미지가 이 주소를 기준으로 절대 경로가 된다.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "대신 교역자 사역자톡방 — 청빙공고와 원어·설교 준비",
    template: "%s | 대신 교역자 사역자톡방",
  },
  description: DESCRIPTION,
  applicationName: "대신 교역자 사역자톡방",
  keywords: [
    "교역자 청빙", "사역자 청빙", "부목사 청빙", "전도사 구인", "교육전도사 모집",
    "청빙게시판", "교회 구인구직", "대신교단", "예장대신",
    "원어 성경", "헬라어 파싱", "히브리어 파싱", "성경 원어 분석",
    "주보 양식", "예배 순서지", "설교 준비", "교회 스케치 영상",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "대신 교역자 사역자톡방",
    title: "대신 교역자 사역자톡방 — 청빙공고와 원어·설교 준비",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "대신 교역자 사역자톡방",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  // 검색엔진 소유 확인 값은 각자 발급받아 환경변수로 넣는다.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_NAVER_VERIFICATION
      ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_VERIFICATION }
      : {},
  },
};

/**
 * 검색엔진이 사이트의 성격을 읽도록 구조화 데이터를 함께 싣는다.
 * 검색창에서 사이트 내부 검색으로 이어지는 연결도 알려 준다.
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "대신 교역자 사역자톡방",
  alternateName: "대신 교단 사역자 플랫폼",
  url: SITE_URL,
  description: DESCRIPTION,
  inLanguage: "ko-KR",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/jobs?region={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

const NAV = [
  { href: "/jobs", label: "청빙·구직" },
  { href: "/jobs/recommend", label: "맞춤 추천" },
  { href: "/alerts", label: "알림" },
  { href: "/qna", label: "Q&A" },
  { href: "/tools/original", label: "원어 파싱" },
  { href: "/tools/sermon", label: "설교 노트" },
  { href: "/tools/setlist", label: "콘티" },
  { href: "/tools/songs", label: "곡" },
  { href: "/tools/bulletin", label: "주보" },
  { href: "/tools/poster", label: "포스터" },
  { href: "/tools/roster", label: "명단·출석" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${kr.variable} ${greek.variable} ${hebrew.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <script
          type="application/ld+json"
          // 검색엔진만 읽는 자리라 화면에는 아무것도 그리지 않는다.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />

        <header className="no-print sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-xl">
          {/*
            휴대폰에서는 메뉴를 다음 줄로 내린다. 한 줄에 다 넣으면 로고와
            "내 정보"가 양쪽을 차지해 메뉴가 67px로 짓물린다 — 옆으로 밀어도
            메뉴가 있는 줄 자체를 모른다.
          */}
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 px-5 py-2.5 lg:h-16 lg:flex-nowrap lg:py-0">
            <Link href="/" className="shrink-0" aria-label="대신 교역자 사역자톡방 홈">
              <Logo />
            </Link>

            <Link
              href="/account"
              className="order-1 ml-auto shrink-0 rounded-pill border border-line px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-foreground lg:order-none"
            >
              내 정보
            </Link>

            {/* 메뉴가 한 줄을 넘으면 옆으로 밀어서 본다 */}
            <nav className="order-2 -mx-1 mt-1.5 flex w-full items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:order-none lg:mt-0 lg:w-auto lg:flex-1 [&::-webkit-scrollbar]:hidden">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-sunken hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:py-14">{children}</main>

        <footer className="no-print mt-8 border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Logo />
              <p className="mt-2 max-w-md text-xs leading-relaxed text-faint">
                대신 교단 사역자를 위해 만들었습니다. 청빙공고는 각 게시판의 공개 정보를
                모은 것이며, 지원과 문의는 원문에서 해 주세요.
              </p>
            </div>
            <p className="text-xs leading-relaxed text-faint sm:text-right">
              원어 본문 SBLGNT (CC BY-SA 4.0)
              <br />
              OpenScriptures OSHB (CC BY 4.0)
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
