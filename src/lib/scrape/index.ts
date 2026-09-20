import { sleep } from "./html";
import { aats } from "./sources/aats";
import { baekseok } from "./sources/baekseok";
import { godpeople } from "./sources/godpeople";
import type { ScrapedPost, SourceAdapter, SourceId } from "./types";

export const ADAPTERS: SourceAdapter[] = [godpeople, baekseok, aats];

export function adapterFor(id: string): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}

/** 같은 글을 두 번 담지 않도록 출처와 글번호를 합쳐 키로 쓴다. */
export function keyOf(post: Pick<ScrapedPost, "source" | "externalId">): string {
  return `${post.source}:${post.externalId}`;
}

export interface CollectOptions {
  /** 훑을 최대 페이지 수 */
  maxPages?: number;
  /** 요청 사이 간격(ms). 상대 서버를 배려하는 값이다. */
  delayMs?: number;
  /** 새 글이 없는 페이지를 만나면 멈춘다. 정기 수집의 기본 동작. */
  stopWhenKnown?: boolean;
  /** 이미 갖고 있는 글의 키 */
  known?: Set<string>;
  onProgress?: (message: string) => void;
}

export interface CollectResult {
  source: SourceId;
  fetched: number;
  added: number;
  pages: number;
  posts: ScrapedPost[];
  /**
   * 목록 끝까지 갔는가. 참일 때만 "목록에 없는 공고 = 마감"이라고 볼 수 있다.
   * 페이지 한도에 걸리거나 아는 글을 만나 멈춘 경우는 거짓이다.
   */
  completed: boolean;
  error?: string;
}

export async function collect(
  adapter: SourceAdapter,
  options: CollectOptions = {}
): Promise<CollectResult> {
  const {
    maxPages = 5,
    delayMs = 1200,
    stopWhenKnown = true,
    known = new Set<string>(),
    onProgress,
  } = options;

  // 목록 전체가 "모집 중"을 뜻하는 출처는 끝까지 봐야 마감을 가려낼 수 있다.
  const walkToEnd = adapter.activeListing === true;
  const posts: ScrapedPost[] = [];
  const seen = new Set<string>();
  // 같은 공고가 목록에 몇 줄로 올라와 있는지 센다.
  const rowCounts = new Map<string, number>();
  let fetched = 0;
  let pages = 0;
  let completed = false;

  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await sleep(delayMs);

    let batch: ScrapedPost[];
    try {
      batch = await adapter.fetchPage(page);
    } catch (err) {
      return {
        source: adapter.id,
        fetched,
        added: posts.length,
        pages,
        posts,
        completed: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    pages++;
    fetched += batch.length;
    if (batch.length === 0) {
      completed = true;
      break;
    }

    let fresh = 0;
    for (const post of batch) {
      const key = keyOf(post);
      rowCounts.set(key, (rowCounts.get(key) ?? 0) + 1);
      if (seen.has(key)) continue;
      seen.add(key);
      posts.push(post);
      if (!known.has(key)) fresh++;
    }

    onProgress?.(`  ${adapter.label} ${page}쪽 — ${batch.length}건 (새 글 ${fresh}건)`);

    // 마지막 페이지는 한 쪽을 다 못 채운다 — 다만 이 판정은 한 쪽당 건수를
    // 우리가 정하는 출처에서만 믿을 수 있다. 게시판형 출처는 상단 공지가 섞여
    // 들어와 매 쪽이 정원보다 적게 나오므로, 빈 쪽이 나와야 끝으로 본다.
    if (walkToEnd && batch.length < adapter.pageSize) {
      completed = true;
      break;
    }

    // 이 페이지가 전부 아는 글이면 그 뒤는 더 오래된 글이다.
    if (!walkToEnd && stopWhenKnown && fresh === 0 && page > 1) break;
  }

  for (const post of posts) post.listingCount = rowCounts.get(keyOf(post)) ?? 1;

  return { source: adapter.id, fetched, added: posts.length, pages, posts, completed };
}

/**
 * 목록 끝까지 훑은 활성 출처에서, 이번에 안 보인 공고를 마감으로 표시한다.
 * 이미 마감으로 찍힌 건은 처음 사라진 시각을 그대로 둔다.
 */
export function markClosed(
  posts: ScrapedPost[],
  source: SourceId,
  seenIds: Set<string>,
  at = new Date().toISOString()
): { posts: ScrapedPost[]; closed: number } {
  let closed = 0;
  const next = posts.map((post) => {
    if (post.source !== source || post.closedAt || seenIds.has(post.externalId)) return post;
    closed++;
    return { ...post, closedAt: at };
  });
  return { posts: next, closed };
}

/**
 * 같은 글이 여러 번 들어오면 마지막에 본 내용을 남긴다.
 *
 * 다만 수집 시각과 원문 링크는 처음 값을 지킨다. 매일 자동으로 돌리며 결과를
 * 커밋하는데, 갓피플은 같은 공고에도 요청마다 새 토큰이 박힌 링크를 주기 때문에
 * 그대로 덮어쓰면 바뀐 것이 없는 날에도 수백 건이 통째로 다시 쓰인다.
 * (먼저 받은 토큰으로도 원문은 계속 열린다.)
 */
export function mergePosts(existing: ScrapedPost[], incoming: ScrapedPost[]): ScrapedPost[] {
  const byKey = new Map(existing.map((p) => [keyOf(p), p]));

  for (const post of incoming) {
    const key = keyOf(post);
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, { ...post, closedAt: null });
      continue;
    }
    byKey.set(key, {
      ...previous,
      ...post,
      collectedAt: previous.collectedAt,
      url: previous.url,
      // 내렸다가 다시 올라온 공고는 마감을 풀어 준다.
      closedAt: null,
    });
  }

  return [...byKey.values()].sort((a, b) => {
    const left = a.postedAt ?? "";
    const right = b.postedAt ?? "";
    if (left !== right) return right.localeCompare(left);
    return keyOf(b).localeCompare(keyOf(a));
  });
}
