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

  const posts: ScrapedPost[] = [];
  const seen = new Set<string>();
  let fetched = 0;
  let pages = 0;

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
        error: err instanceof Error ? err.message : String(err),
      };
    }

    pages++;
    fetched += batch.length;
    if (batch.length === 0) break;

    let fresh = 0;
    for (const post of batch) {
      const key = keyOf(post);
      if (seen.has(key)) continue;
      seen.add(key);
      posts.push(post);
      if (!known.has(key)) fresh++;
    }

    onProgress?.(`  ${adapter.label} ${page}쪽 — ${batch.length}건 (새 글 ${fresh}건)`);

    // 이 페이지가 전부 아는 글이면 그 뒤는 더 오래된 글이다.
    if (stopWhenKnown && fresh === 0 && page > 1) break;
  }

  return { source: adapter.id, fetched, added: posts.length, pages, posts };
}

/** 같은 글이 여러 번 들어오면 마지막에 본 내용을 남긴다. */
export function mergePosts(existing: ScrapedPost[], incoming: ScrapedPost[]): ScrapedPost[] {
  const byKey = new Map(existing.map((p) => [keyOf(p), p]));

  for (const post of incoming) {
    const key = keyOf(post);
    const previous = byKey.get(key);
    byKey.set(key, previous ? { ...previous, ...post } : post);
  }

  return [...byKey.values()].sort((a, b) => {
    const left = a.postedAt ?? "";
    const right = b.postedAt ?? "";
    if (left !== right) return right.localeCompare(left);
    return keyOf(b).localeCompare(keyOf(a));
  });
}
