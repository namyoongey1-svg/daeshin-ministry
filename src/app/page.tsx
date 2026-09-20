import Link from "next/link";
import { SOURCE_LABELS, queryJobs } from "@/lib/scrape/store";

const CARDS = [
  {
    href: "/jobs",
    title: "청빙·구직",
    body: "갓피플·백석대·총신대 게시판에 흩어진 청빙공고를 한곳에 모아 지역·직분으로 추려 봅니다.",
  },
  {
    href: "/tools/original",
    title: "원어 파싱",
    body: "구약 히브리어·신약 헬라어 본문을 낱말 단위로 분석합니다. 시제·태·법이 설교에서 뜻하는 바까지 함께 봅니다.",
  },
  {
    href: "/tools/sermon",
    title: "설교 노트",
    body: "원어 연구에서 담은 낱말을 개요에 붙여 한 편의 설교 초안으로 정리하고 내려받습니다.",
  },
  {
    href: "/tools/bulletin",
    title: "주보 · 순서지",
    body: "예배 종류를 고르면 기본 순서가 채워집니다. 광고와 주간 일정을 붙여 A4로 바로 인쇄합니다.",
  },
  {
    href: "/tools/video",
    title: "스케치 영상 기획",
    body: "행사별로 놓치기 쉬운 촬영 장면을 목록으로 챙기고, 편집 구성과 자막을 미리 짭니다.",
  },
] as const;

export default async function Home() {
  const { posts, all } = await queryJobs();
  const recent = posts.slice(0, 5);

  return (
    <div>
      <section className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-2xl font-bold leading-snug">
          대신 교단 사역자들이
          <br />
          청빙 정보와 설교 준비를 함께 나누는 자리
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          여러 게시판에 흩어진 청빙 소식을 한곳에 모으고, 원어 본문과 설교 자료를
          사역자끼리 열어 둡니다. 지금 {all.toLocaleString()}건의 공고를 모아 두었습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/jobs" className="rounded bg-accent px-4 py-2 text-sm text-background">
            청빙공고 보기
          </Link>
          <Link
            href="/tools/original"
            className="rounded border border-line px-4 py-2 text-sm hover:bg-accent-soft"
          >
            원어 파싱 써보기
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent"
          >
            <h2 className="font-bold">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">최근 청빙공고</h2>
          <Link href="/jobs" className="text-sm text-accent hover:underline">
            전체 보기
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
          {recent.map((post) => (
            <li
              key={`${post.source}:${post.externalId}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
            >
              <span className="rounded bg-accent-soft px-2 py-0.5 text-xs">
                {post.region ?? "지역미상"}
              </span>
              <span className="font-medium">{post.church ?? post.title}</span>
              <span className="text-xs text-muted">{post.positions.join(", ")}</span>
              <span className="ml-auto text-xs text-muted">{SOURCE_LABELS[post.source]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
