import type { Metadata } from "next";
import Link from "next/link";
import { EMPLOYMENT, POSITIONS } from "@/lib/jobs";
import { makeKey, makeLooseKey } from "@/lib/places";
import { SOURCE_LABELS, loadPlaceBook, queryJobs } from "@/lib/scrape/store";
import { RegionPicker } from "../RegionPicker";
import { MapView, type MapPin } from "./MapView";

export const metadata: Metadata = {
  title: "청빙 지도",
  description:
    "모집 중인 교역자 청빙공고를 지도에 올렸습니다. 사는 곳 가까이에 어떤 자리가 있는지 한눈에 보세요.",
  alternates: { canonical: "/jobs/map" },
};

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function JobsMapPage({ searchParams }: PageProps<"/jobs/map">) {
  const params = await searchParams;
  const filter = {
    region: one(params.region),
    position: one(params.position),
    employment: one(params.employment),
  };

  const [{ posts, places, all }, book] = await Promise.all([
    queryJobs(filter),
    loadPlaceBook(),
  ]);

  // 좌표를 아는 교회만 핀이 된다. 한 교회가 여러 건을 올렸으면 핀은 하나다.
  const byChurch = new Map<string, MapPin>();
  for (const post of posts) {
    if (!post.church) continue;
    /*
      키를 둘 다 본다.

      이름으로 찾아 둔 교회는 그 주소에서 지역을 되읽어 채우므로, 이 자리에
      오면 이미 지역을 아는 공고가 되어 있다. 그러면 makeKey 가 키를 내주는데
      정작 좌표는 이름 키(`교회명|?`) 아래 들어 있다. 앞의 키만 보면 방금
      채운 교회가 전부 지도에서 빠진다.
    */
    const strict = makeKey(post.church, post.place);
    const loose = makeLooseKey(post.church);
    const key = (strict && book[strict] ? strict : null) ?? (loose && book[loose] ? loose : null);
    if (!key) continue;
    const pin = book[key];

    const entry =
      byChurch.get(key) ??
      byChurch.set(key, { key, church: post.church, ...pin, posts: [] }).get(key)!;
    entry.posts.push({
      title: post.title,
      url: post.url,
      positions: post.positions,
      employment: post.employment,
      departments: post.departments,
      postedAt: post.postedAt,
      sourceLabel: SOURCE_LABELS[post.source],
    });
  }
  const pins = [...byChurch.values()];
  const pinned = pins.reduce((n, p) => n + p.posts.length, 0);

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

  const select = (name: "position" | "employment", label: string, options: readonly string[]) => (
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
        <h1 className="text-3xl font-bold sm:text-4xl">청빙 지도</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          모집 중인 {all}건 가운데 {pinned}건을 지도에 올렸습니다. 게시판이 주소를
          적어 두지 않아 교회 이름으로 찾은 자리라, 이름을 못 찾았거나 지역이
          어긋난 공고는 지도에 없습니다.{" "}
          <Link href="/jobs" className="text-accent hover:underline">전체 목록</Link>도
          함께 보세요.
        </p>
      </header>

      <form className="mt-7 flex flex-wrap items-center gap-2">
        <RegionPicker counts={places} selected={filter.region} />
        {select("position", "직분", POSITIONS)}
        {select("employment", "근무 형태", EMPLOYMENT)}
        <button className="rounded-pill bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85">
          적용
        </button>
        {(filter.region || filter.position || filter.employment) && (
          <Link href="/jobs/map" className="px-2 text-sm text-muted underline-offset-4 hover:underline">
            초기화
          </Link>
        )}
      </form>

      {!appKey ? (
        // 열쇠가 없으면 지도 자리에 빈 상자를 두지 않고 왜 비었는지 적는다.
        <p className="mt-6 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm leading-relaxed text-muted">
          지도를 켜려면 <code className="rounded bg-sunken px-1.5 py-0.5">NEXT_PUBLIC_KAKAO_JS_KEY</code> 가
          필요합니다.
          <br />
          카카오 개발자 사이트의 JavaScript 키를 Vercel 환경변수에 넣어 주세요.
        </p>
      ) : pins.length === 0 ? (
        <p className="mt-6 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          이 조건으로 지도에 올릴 공고가 없습니다. 지역을 넓혀 보세요.
        </p>
      ) : (
        <MapView pins={pins} appKey={appKey} />
      )}
    </div>
  );
}
