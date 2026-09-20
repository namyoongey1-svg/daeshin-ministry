import Link from "next/link";
import { SOURCE_LABELS, queryJobs } from "@/lib/scrape/store";

const TOOLS = [
  {
    href: "/tools/original",
    title: "원어 파싱",
    body: "구약 히브리어·신약 헬라어 66권 전체. 낱말을 누르면 시제·태·법을 한글로 풀어 주고, 그 문법이 강단에서 뜻하는 바까지 짚어 줍니다.",
    meta: "44만 단어 · Strong's 사전",
  },
  {
    href: "/tools/sermon",
    title: "설교 노트",
    body: "원어에서 담은 낱말을 개요에 붙여 한 편의 설교 초안으로 정리하고 마크다운으로 내려받습니다.",
    meta: "본문 · 대지 · 적용",
  },
  {
    href: "/tools/bulletin",
    title: "주보 · 순서지",
    body: "예배 종류를 고르면 기본 순서가 채워집니다. 광고와 주간 일정을 붙여 A4로 바로 인쇄합니다.",
    meta: "예배 6종 · A4 인쇄",
  },
  {
    href: "/tools/video",
    title: "스케치 영상 기획",
    body: "행사별로 놓치기 쉬운 촬영 장면을 목록으로 챙기고, 편집 구성과 자막을 미리 짭니다.",
    meta: "행사 6종 · 샷 리스트",
  },
] as const;

export default async function Home() {
  const { posts, all } = await queryJobs();
  const recent = posts.slice(0, 6);
  const fullTime = posts.filter((p) => p.employment === "전임").length;

  return (
    <div>
      {/* ------------------------------------------------------------- 머리말 */}
      <section className="py-6 sm:py-12">
        <p className="text-sm font-semibold text-accent">대신 교단 사역자를 위해</p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.25] tracking-tight sm:text-5xl sm:leading-[1.2]">
          흩어진 청빙 소식을 한곳에,
          <br />
          설교 준비는 더 깊게.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          세 곳의 청빙게시판을 모아 지역과 근무 형태로 추려 보여 드립니다.
          원어 성경과 주보·영상 도구도 함께 쓰실 수 있습니다.
        </p>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <Link
            href="/jobs"
            className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
          >
            청빙공고 {all.toLocaleString()}건 보기
          </Link>
          <Link
            href="/tools/original"
            className="rounded-pill border border-line bg-surface px-6 py-3 text-sm font-semibold transition-colors hover:border-line-strong"
          >
            원어 파싱 써보기
          </Link>
        </div>

        <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
          {[
            { label: "모집 중인 공고", value: all.toLocaleString() },
            { label: "전임 공고", value: fullTime.toLocaleString() },
            { label: "모으는 게시판", value: "3곳" },
            { label: "원어 성경", value: "66권" },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-faint">{stat.label}</dt>
              <dd className="mt-0.5 text-xl font-bold tracking-tight">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------ 최근 공고 */}
      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">최근 청빙공고</h2>
          <Link href="/jobs" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
            전체 보기
          </Link>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((post) => (
            <li key={`${post.source}:${post.externalId}`}>
              <Link
                href="/jobs"
                className="flex h-full flex-col rounded-card border border-line bg-surface p-4 transition-all hover:border-line-strong hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold">{post.church ?? post.title}</span>
                  {post.employment && (
                    <span className="shrink-0 rounded-pill bg-accent-soft px-2 py-0.5 text-[0.7rem] font-bold text-accent">
                      {post.employment}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">{post.location}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-faint">{post.title}</p>
                <p className="mt-auto pt-3 text-[0.7rem] text-faint">{SOURCE_LABELS[post.source]}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------------- 도구들 */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold">사역 도구</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-card border border-line bg-surface p-6 transition-all hover:border-line-strong hover:shadow-card"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{tool.title}</h3>
                <span className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{tool.body}</p>
              <p className="mt-4 text-xs text-faint">{tool.meta}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
