import type { Metadata } from "next";
import Link from "next/link";
import { EMPLOYMENT, POSITIONS } from "@/lib/jobs";
import { queryJobs } from "@/lib/scrape/store";
import { describeWish, fitLabel, recommend, type Reason, type Wish } from "@/lib/recommend";
import { RegionPicker } from "../RegionPicker";

export const metadata: Metadata = {
  title: "나에게 맞는 청빙",
  description:
    "희망 지역·직분·근무 형태를 적어 두면 962건의 청빙공고를 조건에 가까운 순서로 추려 보여 줍니다. 왜 추천했는지도 함께 적습니다.",
  alternates: { canonical: "/jobs/recommend" },
};

const PER_PAGE = 24;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

const REASON_STYLE: Record<Reason["kind"], string> = {
  맞음: "bg-accent-soft text-accent",
  가까움: "bg-sunken text-muted",
  미표기: "border border-dashed border-line text-faint",
  다름: "text-faint line-through",
};

export default async function RecommendPage({ searchParams }: PageProps<"/jobs/recommend">) {
  const params = await searchParams;
  const wish: Wish = {
    region: one(params.region),
    position: one(params.position),
    employment: one(params.employment),
    department: one(params.department),
  };
  const page = Math.max(1, Number(one(params.page)) || 1);

  // 추천은 전체에서 고른다. 거르기를 먼저 걸면 "가까운 지역"을 보여 줄 수 없다.
  const { posts, departments, places } = await queryJobs();
  const { matches, asked, perfect, strong } = recommend(posts, wish);

  const pageCount = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = matches.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const linkTo = (changes: Record<string, string>) => {
    const next = new URLSearchParams({ ...wish, page: String(current), ...changes });
    for (const [k, v] of [...next]) if (!v || v === "1") next.delete(k);
    const query = next.toString();
    return `/jobs/recommend${query ? `?${query}` : ""}`;
  };

  const select = (name: keyof Wish, label: string, options: readonly string[]) => (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={wish[name]}
        className={`cursor-pointer appearance-none rounded-pill border py-2 pl-4 pr-9 text-sm font-medium transition-colors ${
          wish[name]
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-surface text-muted hover:border-line-strong"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <svg viewBox="0 0 12 12" className="pointer-events-none absolute right-3.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-50" aria-hidden>
        <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );

  return (
    <div>
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">나에게 맞는 청빙</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          바라는 조건을 적어 두면 모집 중인 {posts.length}건 중 걸리는 것만 골라
          가까운 순서로 줄 세웁니다. 조건에 다 맞지 않아도 하나라도 걸리면
          아래쪽에 남겨 둡니다 — 경기를 찾는 분께 인천 공고를 아예 숨기는 것은
          도움이 되지 않기 때문입니다.
        </p>
      </header>

      <form className="mt-7 flex flex-wrap items-center gap-2">
        <RegionPicker counts={places} selected={wish.region} />
        {select("position", "직분", POSITIONS)}
        {select("employment", "근무 형태", EMPLOYMENT)}
        {departments.length > 0 && select("department", "부서", departments)}

        <button className="rounded-pill bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85">
          추천 받기
        </button>
        {asked && (
          <Link href="/jobs/recommend" className="px-2 text-sm text-muted underline-offset-4 hover:underline">
            초기화
          </Link>
        )}
      </form>

      {!asked ? (
        <div className="mt-10 rounded-card border border-dashed border-line px-6 py-12 text-center">
          <p className="text-sm text-muted">
            위에서 바라는 지역이나 직분을 하나만 골라도 추천이 시작됩니다.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            전체 목록을 그대로 보시려면{" "}
            <Link href="/jobs" className="text-accent hover:underline">청빙·구직</Link>으로 가세요.
          </p>
        </div>
      ) : matches.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          이 조건에 걸리는 공고가 없습니다. 지역을 넓히거나 직분을 빼고 다시 해 보세요.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            {strong > 0 ? (
              <>
                <b className="text-foreground">잘 맞는 {strong}건</b>을 위에 놓았습니다.
                {perfect > 0 && ` 그중 ${perfect}건은 적으신 조건이 전부 맞습니다.`}
                {` 아래로 비슷한 ${matches.length - strong}건이 이어집니다.`}
              </>
            ) : (
              <>
                딱 맞는 공고는 없지만 <b className="text-foreground">비슷한 {matches.length}건</b>을
                가까운 순서로 놓았습니다.
              </>
            )}
            <span className="ml-1 text-faint">· 조건: {describeWish(wish)}</span>
          </p>

          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {visible.map(({ post, score, reasons }) => (
              <li
                key={`${post.source}:${post.externalId}`}
                className="flex flex-col rounded-card border border-line bg-surface p-5 transition-all hover:border-line-strong hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate text-lg font-bold">
                    {post.church || post.title}
                  </h2>
                  <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                    {fitLabel(score)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted">{post.location || "지역 미표기"}</p>

                {post.church && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{post.title}</p>
                )}

                {/* 왜 위에 있는지 적는다. 점수만 보여 주면 믿을 이유가 없다. */}
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {reasons.map((reason, i) => (
                    <li
                      key={i}
                      className={`rounded-pill px-2 py-0.5 text-xs ${REASON_STYLE[reason.kind]}`}
                    >
                      {reason.label}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-faint">
                  <span>{post.postedAt ?? ""}</span>
                  {post.repostCount > 1 && <span className="text-highlight">재게시 {post.repostCount}회</span>}
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-medium text-accent underline-offset-4 hover:underline"
                  >
                    원문 보기 →
                  </a>
                </div>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2 text-sm">
              {current > 1 && (
                <Link href={linkTo({ page: String(current - 1) })} className="rounded-pill border border-line px-4 py-2 font-medium transition-colors hover:border-line-strong">
                  이전
                </Link>
              )}
              <span className="px-3 text-muted">{current} / {pageCount}</span>
              {current < pageCount && (
                <Link href={linkTo({ page: String(current + 1) })} className="rounded-pill border border-line px-4 py-2 font-medium transition-colors hover:border-line-strong">
                  다음
                </Link>
              )}
            </nav>
          )}

          <p className="mt-10 rounded-card border border-line bg-sunken px-5 py-4 text-sm leading-relaxed">
            <b>이 조건으로 새 공고가 올라올 때 메일을 받으시려면</b>{" "}
            <Link href="/alerts" className="font-semibold text-accent hover:underline">알림</Link>
            에 같은 조건을 걸어 두세요. 매일 아침 수집이 끝난 뒤 맞는 공고만 보내 드립니다.
          </p>
        </>
      )}
    </div>
  );
}
