import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ADAPTERS } from "./index";
import type { ScrapedPost, SourceId } from "./types";
import type { Position, Region } from "@/lib/jobs";

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
  region?: string;
  position?: string;
  source?: string;
  department?: string;
  /** 마감된 공고까지 볼지 여부. 기본은 모집 중인 것만 본다. */
  includeClosed?: boolean;
}

/** 화면에 내보내는 한 건 — 같은 공고의 재게시를 하나로 묶은 결과다. */
export interface JobListing extends ScrapedPost {
  /** 같은 내용이 올라온 횟수. 1이면 한 번만 올라온 공고다. */
  repostCount: number;
}

/**
 * 교회들은 목록 위로 올리려고 같은 공고를 여러 번 다시 올린다.
 * 화면에서는 하나로 묶되, 몇 번 올라와 있는지는 함께 알린다.
 * 재게시가 잦다는 것은 아직 사람을 못 구했다는 뜻이라 구직자에게 쓸모가 있다.
 */
function collapseReposts(posts: ScrapedPost[]): JobListing[] {
  const groups = new Map<string, JobListing>();

  for (const post of posts) {
    const key = `${post.source}|${post.church ?? ""}|${post.title}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { ...post, repostCount: post.listingCount ?? 1 });
      continue;
    }

    existing.repostCount += post.listingCount ?? 1;
    // 가장 최근 것을 대표로 남긴다.
    if ((post.postedAt ?? "") > (existing.postedAt ?? "")) {
      groups.set(key, { ...post, repostCount: existing.repostCount });
    }
  }

  return [...groups.values()].sort((a, b) =>
    (b.postedAt ?? "").localeCompare(a.postedAt ?? "")
  );
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

  const filtered = all.filter((post) => {
    if (filter.region && post.region !== (filter.region as Region)) return false;
    if (filter.position && !post.positions.includes(filter.position as Position)) return false;
    if (filter.source && post.source !== filter.source) return false;
    if (filter.department && !post.departments.includes(filter.department)) return false;
    return true;
  });

  const posts = collapseReposts(filtered);
  const departments = [...new Set(all.flatMap((p) => p.departments))].sort();
  const collectedAt = everything.reduce<string | null>(
    (latest, p) => (!latest || p.collectedAt > latest ? p.collectedAt : latest),
    null
  );

  return {
    posts,
    total: posts.length,
    all: collapseReposts(all).length,
    closed,
    departments,
    collectedAt,
  };
}
