import Link from "next/link";
import { RegionPicker } from "./RegionPicker";
import type { Metadata } from "next";
import { EMPLOYMENT, POSITIONS, type Employment } from "@/lib/jobs";
import { SOURCE_LABELS, queryJobs, type JobListing } from "@/lib/scrape/store";
import { ADAPTERS } from "@/lib/scrape";

export const metadata: Metadata = {
  title: "청빙·구직",
  description:
    "갓피플·백석대 신대원·총신대 신대원 동창회·청빙넷 게시판의 교역자 청빙공고를 한곳에 모았습니다. 지역, 직분, 전임·준전임·파트로 추려 보세요.",
  alternates: { canonical: "/jobs" },
};

const PER_PAGE = 24;

/** 근무 형태는 구직자가 가장 먼저 보는 값이라 눈에 띄게 둔다. */
const EMPLOYMENT_STYLE: Record<Employment, string> = {
  전임: "bg-accent text-background",
  준전임: "bg-accent-soft text-accent ring-1 ring-inset ring-accent/25",
  파트: "bg-highlight-soft text-highlight ring-1 ring-inset ring-highlight/25",
  협동: "bg-sunken text-muted ring-1 ring-inset ring-line-strong",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 3.9 7.7 4.07 7.89a.57.57 0 0 0 .86 0C8.6 13.7 12.5 9.2 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6.2A1.7 1.7 0 1 1 8 4.3a1.7 1.7 0 0 1 0 3.4Z"
      />
    </svg>
  );
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const params = await searchParams;
  const pick = (k: string) => (typeof params[k] === "string" ? params[k] : "");

  const filter = {
    church: pick("church"),
    region: pick("region"),
    position: pick("position"),
    employment: pick("employment"),
    department: pick("department"),
    source: pick("source"),
  };
  const page = Math.max(1, Number(pick("page")) || 1);

  const { posts, total, all, departments, collectedAt, places } = await queryJobs(filter);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = posts.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const filtered = Object.values(filter).some(Boolean);

  const linkTo = (changes: Record<string, string>) => {
    const next = new URLSearchParams({ ...filter, ...changes });
    for (const [k, v] of [...next]) if (!v) next.delete(k);
    const query = next.toString();
    return `/jobs${query ? `?${query}` : ""}`;
  };

  const select = (
    name: keyof typeof filter,
    label: string,
    options: readonly { value: string; text: string }[]
  ) => (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={filter[name]}
        className={`cursor-pointer appearance-none rounded-pill border py-2 pl-4 pr-9 text-sm font-medium transition-colors ${
          filter[name]
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-surface text-muted hover:border-line-strong"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.text}</option>
        ))}
      </select>
      <svg
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-50"
        aria-hidden="true"
      >
        <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">청빙·구직</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            갓피플·백석대 신대원·총신대 신대원 동창회·청빙넷 게시판의 공고를 한곳에 모았습니다.
            사역 내용과 연락처는 각 원문에 있습니다.
          </p>
        </div>
        {collectedAt && (
          <p className="text-xs text-faint">
            {new Date(collectedAt).toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short" })} 기준
          </p>
        )}
      </header>

      <form className="no-print mt-7 flex flex-wrap items-center gap-2">
        <RegionPicker counts={places} selected={filter.region ?? ""} />
        {select("employment", "근무 형태", EMPLOYMENT.map((e) => ({ value: e, text: e })))}
        {select("position", "직분", POSITIONS.map((p) => ({ value: p, text: p })))}
        {departments.length > 0 &&
          select("department", "부서", departments.map((d) => ({ value: d, text: d })))}
        {select("source", "출처", ADAPTERS.map((a) => ({ value: a.id, text: a.label })))}

        <button className="rounded-pill bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85">
          적용
        </button>
        {filtered && (
          <Link href="/jobs" className="px-2 text-sm text-muted underline-offset-4 hover:underline">
            초기화
          </Link>
        )}
      </form>

      {filter.church && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 text-sm">
          <b>{filter.church}</b>
          <span className="text-muted">의 공고만 보고 있습니다</span>
          <Link
            href={linkTo({ church: "", page: "" })}
            className="ml-auto text-accent underline-offset-4 hover:underline"
          >
            전체 보기
          </Link>
        </div>
      )}

      <p className="mt-6 text-sm text-muted">
        <b className="text-foreground">{total.toLocaleString()}건</b>
        {filtered && ` · 전체 ${all.toLocaleString()}건 중`}
        {pageCount > 1 && ` · ${current}/${pageCount}쪽`}
      </p>

      {total === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-line py-16 text-center text-sm text-muted">
          조건에 맞는 공고가 없습니다.
          <br />
          <Link href="/jobs" className="mt-2 inline-block text-accent underline-offset-4 hover:underline">
            조건 지우고 전체 보기
          </Link>
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {visible.map((post) => (
            <JobCard key={`${post.source}:${post.externalId}`} post={post} linkTo={linkTo} />
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav className="no-print mt-10 flex items-center justify-center gap-2 text-sm">
          {current > 1 && (
            <Link
              href={linkTo({ page: String(current - 1) })}
              className="rounded-pill border border-line px-4 py-2 font-medium transition-colors hover:border-line-strong"
            >
              이전
            </Link>
          )}
          <span className="px-3 text-muted">{current} / {pageCount}</span>
          {current < pageCount && (
            <Link
              href={linkTo({ page: String(current + 1) })}
              className="rounded-pill border border-line px-4 py-2 font-medium transition-colors hover:border-line-strong"
            >
              다음
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function JobCard({
  post,
  linkTo,
}: {
  post: JobListing;
  linkTo: (changes: Record<string, string>) => string;
}) {
  return (
    <li className="group flex flex-col rounded-card border border-line bg-surface p-5 transition-all hover:border-line-strong hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">
            {post.church ? (
              <Link
                href={linkTo({ church: post.church, page: "" })}
                className="underline-offset-4 hover:text-accent hover:underline"
                title={`${post.church}의 공고만 보기`}
              >
                {post.church}
              </Link>
            ) : (
              post.title
            )}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <PinIcon />
            {post.location}
            {post.churchPostings >= 3 && (
              <span
                className="ml-1 text-highlight"
                title="최근 1년 동안 이 교회가 올린 서로 다른 공고 수입니다. 부서를 늘리는 중일 수도, 사람이 자주 바뀌는 중일 수도 있습니다."
              >
                · 최근 1년 청빙 {post.churchPostings}회
              </span>
            )}
          </p>
        </div>

        {post.employment ? (
          <span
            className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-bold ${EMPLOYMENT_STYLE[post.employment]}`}
          >
            {post.employment}
          </span>
        ) : (
          <span className="shrink-0 rounded-pill border border-dashed border-line px-2.5 py-1 text-xs text-faint">
            형태 미표기
          </span>
        )}
      </div>

      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground/90 underline-offset-4 hover:text-accent hover:underline"
      >
        {post.title}
      </a>

      {(post.positions.length > 0 || post.departments.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.positions.map((p) => (
            <Link
              key={p}
              href={linkTo({ position: p, page: "" })}
              className="rounded-pill bg-sunken px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              {p}
            </Link>
          ))}
          {post.departments.map((d) => (
            <Link
              key={d}
              href={linkTo({ department: d, page: "" })}
              className="rounded-pill px-2.5 py-1 text-xs text-faint ring-1 ring-inset ring-line transition-colors hover:text-muted"
            >
              {d}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-xs text-faint">
        <span>{SOURCE_LABELS[post.source]}</span>
        {/* 다른 게시판에도 같은 자리가 올라와 있으면 접어 두되 숨기지는 않는다. */}
        {post.alsoOn.map((other) => (
          <a
            key={other.source}
            href={other.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-muted hover:underline"
            title={`${SOURCE_LABELS[other.source]}에도 같은 자리가 올라와 있습니다`}
          >
            · {SOURCE_LABELS[other.source]}
          </a>
        ))}
        {post.postedAt && <span>· {formatDate(post.postedAt)}</span>}
        {post.repostCount > 1 && (
          <span
            className="text-highlight"
            title="같은 공고가 여러 번 올라왔습니다. 아직 사람을 못 구했을 가능성이 큽니다."
          >
            · 재게시 {post.repostCount}회
          </span>
        )}
        <span className="ml-auto whitespace-nowrap">
          {post.deadlineText && post.deadlineText !== "채용시까지"
            ? `마감 ${post.deadlineText}`
            : "채용 시까지"}
        </span>
      </div>
    </li>
  );
}
