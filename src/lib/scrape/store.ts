import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ADAPTERS } from "./index";
import { applyDenominations, applyLoosePlaces, buildListings, type JobListing } from "./listings";
import { denominationFit, type Denomination } from "@/lib/denomination";
import type { ScrapedPost, SourceId } from "./types";
import type { Employment, Position } from "@/lib/jobs";
import { SIDO, matchesPlace, parseKeys, type Sido } from "@/lib/region";
import type { PlaceBook } from "@/lib/places";
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
