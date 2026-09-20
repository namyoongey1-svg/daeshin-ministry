import Link from "next/link";
import { POSITIONS, REGIONS } from "@/lib/jobs";
import { SOURCE_LABELS, queryJobs } from "@/lib/scrape/store";
import { ADAPTERS } from "@/lib/scrape";

const PER_PAGE = 40;

function formatDate(iso: string | null): string {
  return iso ? iso.replace(/-/g, ".").slice(2) : "-";
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const params = await searchParams;
  const pick = (k: string) => (typeof params[k] === "string" ? params[k] : "");

  const filter = {
    region: pick("region"),
    position: pick("position"),
    source: pick("source"),
    department: pick("department"),
  };
  const page = Math.max(1, Number(pick("page")) || 1);

  const { posts, total, all, departments, collectedAt } = await queryJobs(filter);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = posts.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const linkTo = (changes: Record<string, string>) => {
    const next = new URLSearchParams({ ...filter, ...changes });
    for (const [k, v] of [...next]) if (!v) next.delete(k);
    const query = next.toString();
    return `/jobs${query ? `?${query}` : ""}`;
  };

  const select = (
    name: string,
    label: string,
    options: readonly { value: string; text: string }[]
  ) => (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={filter[name as keyof typeof filter]}
        className="rounded border border-line bg-surface px-3 py-2 text-sm"
      >
        <option value="">{label} 전체</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.text}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">청빙·구직</h1>
        {collectedAt && (
          <p className="text-xs text-muted">
            마지막 수집 {new Date(collectedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>

      <p className="mt-2 rounded border border-line bg-accent-soft px-3 py-2 text-xs leading-relaxed">
        갓피플취업·백석대 신대원·총신대 신대원 동창회 게시판에 올라온 공고를 한곳에 모았습니다.
        사역 내용과 연락처는 각 <b>원문</b>에 있습니다. 지원과 문의는 원문 게시판에서 해 주세요.
      </p>

      <form className="mt-4 flex flex-wrap gap-2">
        {select("region", "지역", REGIONS.map((r) => ({ value: r, text: r })))}
        {select("position", "직분", POSITIONS.map((p) => ({ value: p, text: p })))}
        {select("source", "출처", ADAPTERS.map((a) => ({ value: a.id, text: a.label })))}
        {departments.length > 0 &&
          select("department", "부서", departments.map((d) => ({ value: d, text: d })))}
        <button className="rounded bg-accent px-4 py-2 text-sm text-background">적용</button>
        <Link href="/jobs" className="rounded border border-line px-4 py-2 text-sm hover:bg-accent-soft">
          초기화
        </Link>
      </form>

      <p className="mt-4 text-xs text-muted">
        전체 {all.toLocaleString()}건 중 {total.toLocaleString()}건
        {pageCount > 1 && ` · ${current}/${pageCount}쪽`}
      </p>

      <ul className="mt-2 space-y-2">
        {visible.map((post) => (
          <li key={`${post.source}:${post.externalId}`} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-accent-soft px-2 py-0.5 font-medium">
                {SOURCE_LABELS[post.source]}
              </span>
              {post.region && <span className="text-muted">{post.region}</span>}
              {post.regionRaw && post.regionRaw !== post.region && (
                <span className="text-muted">({post.regionRaw})</span>
              )}
              {post.repostCount > 1 && (
                <span
                  className="text-highlight"
                  title="같은 공고가 여러 번 올라왔습니다. 아직 사람을 못 구했을 가능성이 큽니다."
                >
                  재게시 {post.repostCount}회
                </span>
              )}
              <span className="ml-auto text-muted">{formatDate(post.postedAt)}</span>
            </div>

            <h2 className="mt-2 font-bold">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent hover:underline"
              >
                {post.title}
              </a>
            </h2>
            {post.church && post.church !== post.title && (
              <p className="text-sm text-muted">{post.church}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
              {post.positions.map((p) => (
                <Link
                  key={p}
                  href={linkTo({ position: p, page: "" })}
                  className="rounded-full border border-line px-2 py-0.5 hover:bg-accent-soft"
                >
                  {p}
                </Link>
              ))}
              {post.departments.map((d) => (
                <Link
                  key={d}
                  href={linkTo({ department: d, page: "" })}
                  className="rounded-full border border-dashed border-line px-2 py-0.5 text-muted hover:bg-accent-soft"
                >
                  {d}
                </Link>
              ))}
              {post.deadlineText && (
                <span className="ml-auto text-muted">마감 {post.deadlineText}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {total === 0 && (
        <p className="mt-6 rounded border border-dashed border-line p-6 text-center text-sm text-muted">
          조건에 맞는 공고가 없습니다.
        </p>
      )}

      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm">
          {current > 1 && (
            <Link href={linkTo({ page: String(current - 1) })} className="rounded border border-line px-3 py-1.5 hover:bg-accent-soft">
              이전
            </Link>
          )}
          <span className="text-muted">{current} / {pageCount}</span>
          {current < pageCount && (
            <Link href={linkTo({ page: String(current + 1) })} className="rounded border border-line px-3 py-1.5 hover:bg-accent-soft">
              다음
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
