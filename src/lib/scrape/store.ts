import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ADAPTERS } from "./index";
import { buildListings, type JobListing } from "./listings";
import type { ScrapedPost, SourceId } from "./types";
import type { Employment, Position } from "@/lib/jobs";
import { SIDO, matchesPlace, parseKeys, type Sido } from "@/lib/region";
import type { PlaceCount } from "@/app/jobs/RegionPicker";

export type { JobListing } from "./listings";

const FILE = path.join(process.cwd(), "src", "data", "scraped", "posts.json");

let cache: Promise<ScrapedPost[]> | null = null;

export function loadScrapedPosts(): Promise<ScrapedPost[]> {
  cache ??= readFile(FILE, "utf8")
    .then((text) => JSON.parse(text) as ScrapedPost[])
    .catch(() => []);
  return cache;
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
}

export async function queryJobs(filter: JobFilter = {}): Promise<JobQueryResult> {
  const everything = await loadScrapedPosts();
  const closed = everything.filter((p) => p.closedAt).length;
  const all = filter.includeClosed ? everything : everything.filter((p) => !p.closedAt);

  // 교회별 횟수와 근무 형태는 묶는 단계에서 읽어 내므로, 거르기는 그 뒤에 한다.
  // 세는 일은 거르기 전 전체를 기준으로 해야 같은 교회의 다른 지역 공고가
  // 빠져 숫자가 작아지지 않는다.
  const everyListing = buildListings(all);

  const selectedPlaces = parseKeys(filter.region);

  const filtered = everyListing.filter((post) => {
    if (filter.church && post.church !== filter.church) return false;
    if (!matchesPlace(post.place, selectedPlaces)) return false;
    if (filter.position && !post.positions.includes(filter.position as Position)) return false;
    if (filter.source && post.source !== filter.source) return false;
    if (filter.department && !post.departments.includes(filter.department)) return false;
    if (filter.employment && post.employment !== (filter.employment as Employment)) return false;
    return true;
  });

  const departments = [...new Set(all.flatMap((p) => p.departments))].sort();

  // 건수는 지역을 뺀 나머지 조건까지만 적용해 센다. 지역을 하나 고른 뒤에도
  // 다른 지역에 몇 건이 있는지 보여야 옮겨 갈지 판단할 수 있다.
  const forCounts = everyListing.filter((post) => {
    if (filter.church && post.church !== filter.church) return false;
    if (filter.position && !post.positions.includes(filter.position as Position)) return false;
    if (filter.source && post.source !== filter.source) return false;
    if (filter.department && !post.departments.includes(filter.department)) return false;
    if (filter.employment && post.employment !== (filter.employment as Employment)) return false;
    return true;
  });
  const places = countPlaces(forCounts);
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
