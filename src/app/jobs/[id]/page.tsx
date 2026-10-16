import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { describeAccepts } from "@/lib/denomination";
import type { Employment } from "@/lib/jobs";
import { daysBetween, kstToday, readSignals } from "@/lib/job-signals";
import { placeKey } from "@/lib/region";
import { SOURCE_LABELS, findJob, jobId, type JobListing } from "@/lib/scrape/store";
import { ShareButton } from "./ShareButton";

/*
  공고 한 건.

  목록이 아는 것보다 더 아는 것은 없다 — 본문도 연락처도 긁지 않는다. 그래도
  이 화면이 있어야 하는 까닭은 둘이다. 공고 하나를 링크로 보낼 수 있고,
  검색엔진이 공고마다 한 쪽씩 본다. 그리고 목록에서는 눈에 안 띄던 신호
  (몇 번 다시 올라왔는지, 이 교회가 올해 몇 번 사람을 찾았는지)를 한자리에
  모아 "이 공고를 어떻게 읽을지"를 돕는다.
*/

const EMPLOYMENT_STYLE: Record<Employment, string> = {
  전임: "bg-accent text-background",
  준전임: "bg-accent-soft text-accent ring-1 ring-inset ring-accent/25",
  파트: "bg-highlight-soft text-highlight ring-1 ring-inset ring-highlight/25",
  협동: "bg-sunken text-muted ring-1 ring-inset ring-line-strong",
};

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** 검색 결과와 미리보기에 뜨는 한 줄 제목. 교회·직분·지역이 앞에 와야 한다. */
function headline(job: JobListing): string {
  const who = job.positions.length ? job.positions.join("·") : "교역자";
  const where = job.location ? ` (${job.location})` : "";
  return job.church ? `${job.church} ${who} 청빙${where}` : job.title;
}

function summary(job: JobListing): string {
  const parts = [
    job.location && `${job.location}`,
    job.denomination?.name,
    job.employment,
    job.departments.length ? `${job.departments.join("·")} 담당` : null,
    job.deadlineText && job.deadlineText !== "채용시까지" ? `${job.deadlineText} 마감` : "채용 시까지",
  ].filter(Boolean);
  return `${job.title} — ${parts.join(" · ")}. 원문은 ${SOURCE_LABELS[job.source]}에 있습니다.`;
}

export async function generateMetadata({ params }: PageProps<"/jobs/[id]">): Promise<Metadata> {
  const { id } = await params;
  const found = await findJob(id);
  if (!found) return { title: "공고를 찾을 수 없습니다", robots: { index: false } };
  const { job } = found;
  const title = headline(job);
  const description = summary(job);
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${found.id}` },
    openGraph: { type: "article", title, description, url: `/jobs/${found.id}` },
    // 마감된 공고는 남겨 두되 검색에는 내보내지 않는다. 이미 끝난 자리로
    // 사람을 불러들일 일은 아니다.
    robots: job.closedAt ? { index: false, follow: true } : undefined,
  };
}

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const found = await findJob(id);
  if (!found) notFound();
  // 묶이기 전 번호로 들어오면 대표 주소로 보낸다. 주소가 하나여야 검색엔진이
  // 같은 공고를 두 쪽으로 세지 않는다.
  if (found.id !== id) permanentRedirect(`/jobs/${found.id}`);

  const { job, siblings, pin } = found;
  const today = kstToday();
  const sincePosted = job.postedAt ? daysBetween(job.postedAt, today) : null;
  const signals = readSignals(job, (src) => SOURCE_LABELS[src], today);
  const accepts = describeAccepts(job);

  const facts: [string, React.ReactNode][] = [
    ["직분", job.positions.length ? job.positions.map((p) => (
      <Link key={p} href={`/jobs?position=${encodeURIComponent(p)}`} className="underline-offset-4 hover:text-accent hover:underline">{p}</Link>
    )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, " · ", el] : [el]), []) : "미표기"],
    ["근무 형태", job.employment ?? "미표기"],
    ["부서", job.departments.length ? job.departments.join(" · ") : "미표기"],
    ["지역", job.place.sido ? (
      <Link href={`/jobs?region=${encodeURIComponent(placeKey(job.place.sido, job.place.sigungu))}`} className="underline-offset-4 hover:text-accent hover:underline">{job.location}</Link>
    ) : "미표기"],
    ["교단", job.denomination
      ? `${job.denomination.name}${job.denomination.basis === "게시판" ? " (게시판 기준)" : job.denomination.basis === "본문" ? " (공고에 적힘)" : ""}`
      : "미표기"],
    ["지원 가능", accepts ?? "적혀 있지 않음"],
    ["마감", job.deadlineText && job.deadlineText !== "채용시까지" ? job.deadlineText : "채용 시까지"],
    ["올라온 날", job.postedAt ? `${longDate(job.postedAt)}${sincePosted !== null && sincePosted > 0 ? ` (${sincePosted}일 전)` : ""}` : "미표기"],
  ];

  return (
    <article className="max-w-3xl">
      <Link href="/jobs" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 청빙·구직 목록으로
      </Link>

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {job.employment ? (
            <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${EMPLOYMENT_STYLE[job.employment]}`}>{job.employment}</span>
          ) : (
            <span className="rounded-pill border border-dashed border-line px-2.5 py-1 text-xs text-faint">형태 미표기</span>
          )}
          {job.closedAt && (
            <span className="rounded-pill bg-sunken px-2.5 py-1 text-xs font-bold text-muted">마감</span>
          )}
          {job.location && <span>{job.location}</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">{job.title}</h1>
        {job.church && (
          <p className="mt-2 text-sm text-muted">
            <Link href={`/jobs?church=${encodeURIComponent(job.church)}`} className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline">
              {job.church}
            </Link>
            {job.denomination && <> · {job.denomination.name}{job.denomination.basis === "게시판" && " 쪽"}</>}
            {accepts && <> · {accepts}</>}
          </p>
        )}
      </header>

      {/* 원문이 먼저다. 이 화면은 원문으로 가는 길목이지 원문의 대체가 아니다. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
        >
          {SOURCE_LABELS[job.source]}에서 원문 보기 ↗
        </a>
        {job.alsoOn.map((other) => (
          <a
            key={other.source}
            href={other.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-pill border border-line px-4 py-2.5 text-sm font-medium transition-colors hover:border-line-strong"
          >
            {SOURCE_LABELS[other.source]} ↗
          </a>
        ))}
        <ShareButton title={headline(job)} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-faint">
        사역 내용과 연락처는 원문에 있습니다. 이 사이트는 공고 본문과 연락처를 저장하지 않습니다.
      </p>

      {signals.length > 0 && (
        <section className="mt-8 rounded-card border border-line bg-surface p-5">
          <h2 className="text-sm font-bold">이 공고를 읽는 법</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
            {signals.map((s) => (
              <li key={s.kind} className={`flex gap-2 ${s.tone === "warn" ? "text-highlight" : "text-muted"}`}>
                <span aria-hidden="true">•</span>
                <span>{s.long}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dl className="mt-8 grid gap-x-6 gap-y-4 rounded-card border border-line bg-surface p-5 text-sm sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-xs text-faint">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-xs text-faint">출처</dt>
          <dd className="font-medium">
            {SOURCE_LABELS[job.source]}
            {job.alsoOn.length > 0 && ` · ${job.alsoOn.map((a) => SOURCE_LABELS[a.source]).join(" · ")}`}
          </dd>
        </div>
      </dl>

      {pin && (
        <section className="mt-8">
          <h2 className="text-sm font-bold">위치</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {pin.name} — {pin.address}
            {pin.matched !== "구" && (
              <span className="text-faint"> (교회 이름으로 찾은 자리라 같은 이름의 다른 교회일 수 있습니다)</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <a
              href={`https://map.kakao.com/link/map/${encodeURIComponent(pin.name)},${pin.lat},${pin.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-pill border border-line px-4 py-2 font-medium transition-colors hover:border-line-strong"
            >
              카카오맵에서 보기 ↗
            </a>
            {job.place.sido && (
              <Link
                href={`/jobs/map?region=${encodeURIComponent(placeKey(job.place.sido, job.place.sigungu))}`}
                className="rounded-pill border border-line px-4 py-2 font-medium transition-colors hover:border-line-strong"
              >
                이 지역 청빙 지도
              </Link>
            )}
          </div>
        </section>
      )}

      {siblings.length > 0 && job.church && (
        <section className="mt-8">
          <h2 className="text-sm font-bold">{job.church}의 다른 공고</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {siblings.map((s) => (
              <li key={jobId(s)}>
                <Link
                  href={`/jobs/${jobId(s)}`}
                  className="flex items-baseline justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm transition-colors hover:border-line-strong"
                >
                  <span className="line-clamp-1">{s.title}</span>
                  <span className="shrink-0 text-xs text-faint">{s.postedAt ? longDate(s.postedAt) : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-10 flex flex-wrap gap-2 text-sm">
        {job.place.sido && (
          <Link href={`/jobs?region=${encodeURIComponent(job.place.sido)}`} className="rounded-pill bg-sunken px-3 py-1.5 text-muted transition-colors hover:text-foreground">
            {job.place.sido} 공고 더 보기
          </Link>
        )}
        {job.positions.map((p) => (
          <Link key={p} href={`/jobs?position=${encodeURIComponent(p)}`} className="rounded-pill bg-sunken px-3 py-1.5 text-muted transition-colors hover:text-foreground">
            {p} 공고 더 보기
          </Link>
        ))}
        <Link href="/jobs/recommend" className="rounded-pill bg-sunken px-3 py-1.5 text-muted transition-colors hover:text-foreground">
          내 조건에 맞는 공고 추천
        </Link>
      </nav>
    </article>
  );
}
