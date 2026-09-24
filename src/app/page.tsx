import Link from "next/link";
import { RolePicker } from "./RolePicker";
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
    href: "/tools/setlist",
    title: "찬양 콘티",
    body: "곡 순서와 조, 연결을 정리합니다. 조가 멀리 건너뛰거나 분위기가 갑자기 바뀌는 자리를 짚어 주고, 단톡방에 그대로 붙일 글로 내보냅니다.",
    meta: "키 계산 · 흐름 점검",
  },
  {
    href: "/tools/songs",
    title: "곡 라이브러리",
    body: "곡을 한 번 등록해 두면 키·박자·송폼·악보가 따라옵니다. 콘티와 악보를 PDF 한 개로 묶어 팀에게 보냅니다.",
    meta: "악보 보관 · PDF 묶기",
  },
  {
    href: "/tools/roster",
    title: "명단 · 출석 · 생일",
    body: "교회 명단 엑셀을 그대로 올리면 주일마다 이름을 눌러 인원을 세고, 다가오는 생일을 미리 봅니다.",
    meta: "엑셀 입출력 · 생일 D-day",
  },
  {
    href: "/tools/poster",
    title: "행사 포스터",
    body: "칸만 채우면 포스터가 됩니다. 단톡방용 정사각형, A4 인쇄, 예배당 스크린용 가로로 바로 내려받습니다.",
    meta: "행사 5종 · 3가지 크기",
  },
  {
    href: "/tools/bulletin",
    title: "주보 · 순서지",
    body: "예배 종류를 고르면 기본 순서가 채워집니다. 광고와 주간 일정을 붙여 A4로 바로 인쇄합니다.",
    meta: "예배 6종 · A4 인쇄",
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
          네 곳의 청빙게시판을 매일 모아 지역·직분·교단으로 추려 보여 드립니다.
          콘티·설교 노트·주보·명단 같은 사역 도구도 함께 쓰실 수 있습니다.
        </p>

        <RolePicker />

        <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
          {[
            { label: "모집 중인 공고", value: all.toLocaleString() },
            { label: "전임 공고", value: fullTime.toLocaleString() },
            { label: "모으는 게시판", value: "4곳" },
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
