import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ADAPTERS } from "./index";
import type { ScrapedPost, SourceId } from "./types";
import { inferEmployment, locationLabel, normalizeRegion } from "./normalize";
import type { Employment, Position, Region } from "@/lib/jobs";

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
  /** 전임·준전임·파트 */
  employment?: string;
  /** 마감된 공고까지 볼지 여부. 기본은 모집 중인 것만 본다. */
  includeClosed?: boolean;
}

/** 화면에 내보내는 한 건 — 같은 공고의 재게시를 하나로 묶은 결과다. */
export interface JobListing extends ScrapedPost {
  /** 같은 내용이 올라온 횟수. 1이면 한 번만 올라온 공고다. */
  repostCount: number;
  /** 태그와 제목에서 읽어 낸 근무 형태. 못 알아보면 null */
  employment: Employment | null;
  /** 화면에 쓸 위치. 구까지 알면 구까지 */
  location: string;
}

/**
 * 수집 데이터에는 없는, 화면에서 필요한 값을 붙인다.
 *
 * 지역은 출처가 "서울 외"처럼 두루뭉술하게 적어 두는 일이 많다. 그럴 때는
 * 제목 문장에서 한 번 더 찾아본다. ("…군포시 부곡동에서 사역자를…")
 */
function decorate(post: ScrapedPost, repostCount: number): JobListing {
  // 저장된 region 을 그대로 믿지 않고 원문 표기에서 다시 읽는다. 예전에 "서울 외"를
  // 서울로 잘못 넣어 둔 값들이 남아 있어, 여기서 고쳐야 다시 수집하지 않아도 맞는다.
  const region = normalizeRegion(post.regionRaw) ?? normalizeRegion(post.title);
  return {
    ...post,
    region,
    repostCount,
    employment: inferEmployment([...post.tagsRaw, post.title], post.positions),
    location: locationLabel(post.regionRaw, region),
  };
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
      groups.set(key, decorate(post, post.listingCount ?? 1));
      continue;
    }

    const count = existing.repostCount + (post.listingCount ?? 1);
    // 가장 최근 것을 대표로 남긴다.
    if ((post.postedAt ?? "") > (existing.postedAt ?? "")) {
      groups.set(key, decorate(post, count));
    } else {
      existing.repostCount = count;
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

  // 근무 형태와 보완된 지역은 묶는 단계에서 읽어 내므로, 거르기는 그 뒤에 한다.
  const filtered = collapseReposts(all).filter((post) => {
    if (filter.region && post.region !== (filter.region as Region)) return false;
    if (filter.position && !post.positions.includes(filter.position as Position)) return false;
    if (filter.source && post.source !== filter.source) return false;
    if (filter.department && !post.departments.includes(filter.department)) return false;
    if (filter.employment && post.employment !== (filter.employment as Employment)) return false;
    return true;
  });

  const everyListing = collapseReposts(all);
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
