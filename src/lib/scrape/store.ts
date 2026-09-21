import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ADAPTERS } from "./index";
import { buildListings, type JobListing } from "./listings";
import type { ScrapedPost, SourceId } from "./types";
import type { Employment, Position, Region } from "@/lib/jobs";

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
}

export async function queryJobs(filter: JobFilter = {}): Promise<JobQueryResult> {
  const everything = await loadScrapedPosts();
  const closed = everything.filter((p) => p.closedAt).length;
  const all = filter.includeClosed ? everything : everything.filter((p) => !p.closedAt);

  // 교회별 횟수와 근무 형태는 묶는 단계에서 읽어 내므로, 거르기는 그 뒤에 한다.
  // 세는 일은 거르기 전 전체를 기준으로 해야 같은 교회의 다른 지역 공고가
  // 빠져 숫자가 작아지지 않는다.
  const everyListing = buildListings(all);

  const filtered = everyListing.filter((post) => {
    if (filter.church && post.church !== filter.church) return false;
    if (filter.region && post.region !== (filter.region as Region)) return false;
    if (filter.position && !post.positions.includes(filter.position as Position)) return false;
    if (filter.source && post.source !== filter.source) return false;
    if (filter.department && !post.departments.includes(filter.department)) return false;
    if (filter.employment && post.employment !== (filter.employment as Employment)) return false;
    return true;
  });

  const departments = [...new Set(all.flatMap((p) => p.departments))].sort();
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
  };
}
