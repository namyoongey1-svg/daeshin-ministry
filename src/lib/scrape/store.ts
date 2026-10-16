import "server-only";
import { cache as once } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ADAPTERS } from "./index";
import { applyDenominations, applyLoosePlaces, buildListings, type JobListing } from "./listings";
import { denominationFit, type Denomination } from "@/lib/denomination";
import type { ScrapedPost, SourceId } from "./types";
import type { Employment, Position } from "@/lib/jobs";
import { SIDO, matchesPlace, parseKeys, type Sido } from "@/lib/region";
import { makeKey, makeLooseKey, type Pin, type PlaceBook } from "@/lib/places";
import type { PlaceCount } from "@/app/jobs/RegionPicker";

export type { JobListing } from "./listings";

const FILE = path.join(process.cwd(), "src", "data", "scraped", "posts.json");
const PLACES_FILE = path.join(process.cwd(), "src", "data", "scraped", "places.json");
const DENOM_FILE = path.join(process.cwd(), "src", "data", "scraped", "denominations.json");

let cache: Promise<ScrapedPost[]> | null = null;

export function loadScrapedPosts(): Promise<ScrapedPost[]> {
  cache ??= readFile(FILE, "utf8")
    .then((text) => JSON.parse(text) as ScrapedPost[])
    .catch(() => []);
  return cache;
}

let placeCache: Promise<PlaceBook> | null = null;

/** 교회 이름을 좌표로 바꿔 둔 파일. npm run geocode 가 채운다. */
export function loadPlaceBook(): Promise<PlaceBook> {
  placeCache ??= readFile(PLACES_FILE, "utf8")
    .then((text) => JSON.parse(text) as PlaceBook)
    .catch(() => ({}));
  return placeCache;
}

type DenominationBook = Record<
  string,
  { own: Denomination | null; accepts: Denomination[]; acceptsAll: boolean }
>;

let denomCache: Promise<DenominationBook> | null = null;

/** 공고 본문에서 뽑아 둔 교단. npm run denominations 가 채운다. */
function loadDenominations(): Promise<DenominationBook> {
  denomCache ??= readFile(DENOM_FILE, "utf8")
    .then((text) => JSON.parse(text) as DenominationBook)
    .catch(() => ({}));
  return denomCache;
}

export const SOURCE_LABELS: Record<SourceId, string> = Object.fromEntries(
  ADAPTERS.map((a) => [a.id, a.label])
) as Record<SourceId, string>;

export interface JobFilter {
  /** 특정 교회의 공고만 */
  church?: string;
  /** "서울,경기|성남시 분당구" 처럼 여러 곳을 쉼표로 잇는다. */
  region?: string;
  position?: string;
  source?: string;
  /** 교단. 모르는 공고는 걸러 내지 않고 남긴다. */
  denomination?: string;
  department?: string;
  /** 전임·준전임·파트 */
  employment?: string;
  /** 마감된 공고까지 볼지 여부. 기본은 모집 중인 것만 본다. */
  includeClosed?: boolean;
}

export interface JobQueryResult {
  posts: JobListing[];
  total: number;
  /** 필터를 적용하기 전 전체 건수 — "전체 N건 중 M건" 표시에 쓴다. */
  all: number;
  /** 목록에서 내려가 마감으로 본 건수 */
  closed: number;
  departments: string[];
  collectedAt: string | null;
  /** 지역 고르기 칸에 보여 줄 시·도별·시군구별 건수 */
  places: PlaceCount[];
  /** 교단을 알 수 있는 공고 수. 교단으로 걸렀을 때 왜 많이 남는지 밝히는 데 쓴다. */
  denominationKnown: number;
}

export async function queryJobs(filter: JobFilter = {}): Promise<JobQueryResult> {
  const everything = await loadScrapedPosts();
  const closed = everything.filter((p) => p.closedAt).length;
  const all = filter.includeClosed ? everything : everything.filter((p) => !p.closedAt);

  // 교회별 횟수와 근무 형태는 묶는 단계에서 읽어 내므로, 거르기는 그 뒤에 한다.
  // 세는 일은 거르기 전 전체를 기준으로 해야 같은 교회의 다른 지역 공고가
  // 빠져 숫자가 작아지지 않는다.
  const everyListing = applyLoosePlaces(
    applyDenominations(buildListings(all), await loadDenominations()),
    await loadPlaceBook()
  );

  const selectedPlaces = parseKeys(filter.region);

  // 게시판을 가로질러 접은 글도 그 게시판에서 찾을 수 있어야 한다. 접혔다고
  // 백석대 필터에서 사라지면, 백석대에서 보고 온 사람이 공고를 못 찾는다.
  const onSource = (post: JobListing, source: string) =>
    post.source === source || post.alsoOn.some((a) => a.source === source);

  /**
   * 교단으로 거를 때 교단을 모르는 공고는 남긴다.
   *
   * 822건 중 461건이 교단 미표기다. 모르는 것을 어긋난 것으로 치면 목록의
   * 절반이 사라지고, 사라진 쪽에 정작 맞는 자리가 섞여 있다. 아는 것만 걸러
   * 낸다 — 확실히 다른 교단인 공고만 뺀다.
   */
  const keepDenomination = (post: JobListing, wanted: string | undefined) =>
    !wanted || denominationFit(post, wanted) !== "다름";


  const filtered = everyListing.filter((post) => {
    if (filter.church && post.church !== filter.church) return false;
    if (!matchesPlace(post.place, selectedPlaces)) return false;
    if (filter.position && !post.positions.includes(filter.position as Position)) return false;
    if (filter.source && !onSource(post, filter.source)) return false;
    if (filter.department && !post.departments.includes(filter.department)) return false;
    if (filter.employment && post.employment !== (filter.employment as Employment)) return false;
    if (!keepDenomination(post, filter.denomination)) return false;
    return true;
  });

  const departments = [...new Set(all.flatMap((p) => p.departments))].sort();

  // 건수는 지역을 뺀 나머지 조건까지만 적용해 센다. 지역을 하나 고른 뒤에도
  // 다른 지역에 몇 건이 있는지 보여야 옮겨 갈지 판단할 수 있다.
  const forCounts = everyListing.filter((post) => {
    if (filter.church && post.church !== filter.church) return false;
    if (filter.position && !post.positions.includes(filter.position as Position)) return false;
    if (filter.source && !onSource(post, filter.source)) return false;
    if (filter.department && !post.departments.includes(filter.department)) return false;
    if (filter.employment && post.employment !== (filter.employment as Employment)) return false;
    if (!keepDenomination(post, filter.denomination)) return false;
    return true;
  });
  const places = countPlaces(forCounts);
  const denominationKnown = everyListing.filter(
    (p) => p.denomination || p.accepts.length > 0 || p.acceptsAll
  ).length;
  const collectedAt = everything.reduce<string | null>(
    (latest, p) => (!latest || p.collectedAt > latest ? p.collectedAt : latest),
    null
  );

  return {
    posts: filtered,
    total: filtered.length,
    all: everyListing.length,
    closed,
    departments,
    collectedAt,
    places,
    denominationKnown,
  };
}

/** 시·도별 건수와, 그 안에서 구·군까지 적힌 공고의 건수를 센다. */
function countPlaces(listings: JobListing[]): PlaceCount[] {
  const totals = new Map<Sido, number>();
  const children = new Map<Sido, Map<string, number>>();

  for (const post of listings) {
    const { sido, sigungu } = post.place;
    if (!sido) continue;
    totals.set(sido, (totals.get(sido) ?? 0) + 1);
    if (!sigungu) continue;
    const inner = children.get(sido) ?? new Map<string, number>();
    inner.set(sigungu, (inner.get(sigungu) ?? 0) + 1);
    children.set(sido, inner);
  }

  return SIDO.map((sido) => ({
    sido,
    total: totals.get(sido) ?? 0,
    children: [...(children.get(sido) ?? new Map())]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko")),
  }));
}

/* ------------------------------------------------------------ 공고 한 건

  공고마다 고유 주소를 둔다. 목록에서 바로 원문으로 나가면 공고 하나를
  카카오톡이나 스레드에 링크로 보낼 수 없고, 검색엔진도 목록 한 쪽만 본다.

  주소는 "출처-게시판번호"다 (`godpeople-0q9ejuk`). 수집 번호는 글자·숫자·
  밑줄·붙임표뿐이라 그대로 주소에 넣어도 된다.

  같은 자리가 여러 게시판에, 여러 번 올라온 것은 목록에서 하나로 묶인다.
  묶이기 전 어느 번호로 들어와도 대표 공고를 보여 준다 — 백석대 쪽 번호로
  적어 둔 링크가 갓피플 쪽이 대표가 되었다고 죽으면 안 된다.
*/

export function jobId(post: Pick<ScrapedPost, "source" | "externalId">): string {
  return `${post.source}-${post.externalId}`;
}

/** 주소에서 출처와 번호를 되읽는다. 꼴이 어긋나면 null. */
function parseJobId(id: string): { source: SourceId; externalId: string } | null {
  const m = /^([a-z]+)-([A-Za-z0-9_-]+)$/.exec(id);
  if (!m) return null;
  const source = m[1] as SourceId;
  if (!(source in SOURCE_LABELS)) return null;
  return { source, externalId: m[2] };
}

interface JobIndex {
  /** 묶이기 전 번호까지 모두 대표 공고를 가리킨다. */
  byId: Map<string, JobListing>;
  open: JobListing[];
}

let indexCache: Promise<JobIndex> | null = null;

/**
 * 모집 중인 공고는 목록과 같은 과정으로 묶어, 목록의 한 장과 상세의 한 장이
 * 같은 공고를 가리키게 한다. 마감된 공고는 따로 묶는다 — 함께 묶으면 마감된
 * 글이 모집 중인 글을 삼켜 목록에서 사라지는 일이 생긴다.
 */
function loadIndex(): Promise<JobIndex> {
  indexCache ??= (async () => {
    const [everything, denoms, places] = await Promise.all([
      loadScrapedPosts(),
      loadDenominations(),
      loadPlaceBook(),
    ]);
    const build = (posts: ScrapedPost[]) =>
      applyLoosePlaces(applyDenominations(buildListings(posts), denoms), places);

    const open = build(everything.filter((p) => !p.closedAt));
    const closed = build(everything.filter((p) => p.closedAt));

    const byUrl = new Map(everything.map((p) => [p.url, p]));
    const repostKey = (p: ScrapedPost) => `${p.source}|${p.church ?? ""}|${p.title}`;
    const byRepostKey = new Map<string, ScrapedPost[]>();
    for (const p of everything) {
      const key = repostKey(p);
      byRepostKey.set(key, [...(byRepostKey.get(key) ?? []), p]);
    }

    const byId = new Map<string, JobListing>();
    // 마감된 쪽을 먼저 넣고 모집 중인 쪽으로 덮어, 겹치면 모집 중인 것이 남는다.
    for (const listing of [...closed, ...open]) {
      byId.set(jobId(listing), listing);
      for (const twin of byRepostKey.get(repostKey(listing)) ?? []) byId.set(jobId(twin), listing);
      for (const other of listing.alsoOn) {
        const raw = byUrl.get(other.url);
        if (!raw) continue;
        byId.set(jobId(raw), listing);
        for (const twin of byRepostKey.get(repostKey(raw)) ?? []) byId.set(jobId(twin), listing);
      }
    }
    return { byId, open };
  })();
  return indexCache;
}

export interface JobDetail {
  job: JobListing;
  /** 대표 공고의 주소. 들어온 주소와 다르면 정식 주소(canonical)로 쓴다. */
  id: string;
  /** 같은 교회가 최근에 올린 다른 공고 (모집 중인 것만, 최신순) */
  siblings: JobListing[];
  /** 교회 좌표. 이름으로 찾아 둔 것이라 없을 수 있다. */
  pin: Pin | null;
}

/** 주소 하나로 공고 한 건을 찾는다. 없으면 null. */
export const findJob = once(async (id: string): Promise<JobDetail | null> => {
  if (!parseJobId(id)) return null;
  const { byId, open } = await loadIndex();
  const job = byId.get(id);
  if (!job) return null;

  // 제목까지 같은 글은 뺀다. 다른 게시판에 올린 같은 자리인데 묶이지 않은
  // 것이라, "다른 공고"라며 보여 주면 같은 글이 두 번 보인다.
  const siblings = job.church
    ? open.filter((l) => l.church === job.church && l !== job && l.title !== job.title).slice(0, 6)
    : [];

  const book = await loadPlaceBook();
  const strict = job.church ? makeKey(job.church, job.place) : null;
  const loose = job.church ? makeLooseKey(job.church) : null;
  const pin = (strict && book[strict]) || (loose && book[loose]) || null;

  return { job, id: jobId(job), siblings, pin };
});

/** 사이트맵에 올릴 모집 중인 공고 전부 */
export async function listOpenJobs(): Promise<JobListing[]> {
  return (await loadIndex()).open;
}
