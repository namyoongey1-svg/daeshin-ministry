/** 수집기에서 쓰는 작은 HTML 도우미. 의존성 없이 정규식으로만 처리한다. */

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** 태그를 걷어내고 공백을 한 칸으로 정리한다. */
export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** 정규식의 첫 캡처를 꺼낸다. 없으면 null. */
export function pick(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m?.[1] ? stripTags(m[1]) : null;
}

/** 전역 정규식의 첫 캡처를 모두 모은다. */
export function pickAll(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => stripTags(m[1])).filter(Boolean);
}

export interface FetchOptions {
  /** 응답 인코딩. 국내 구형 게시판은 대부분 euc-kr이다. */
  encoding?: string;
  method?: "GET" | "POST";
  body?: string;
  referer?: string;
}

/**
 * 출처를 밝히는 User-Agent. 차단이 필요하면 상대가 막을 수 있어야 한다.
 * HTTP 헤더는 Latin-1만 실을 수 있어 한글을 쓰지 않는다.
 */
const USER_AGENT =
  "daeshin-ministry-bot/1.0 (church ministry job aggregator; contact: 1yoon1hy@gmail.com)";

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const { encoding = "utf-8", method = "GET", body, referer } = options;

  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (referer) headers["Referer"] = referer;
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["X-Requested-With"] = "XMLHttpRequest";
  }

  const res = await fetch(url, { method, headers, body });
  if (!res.ok) throw new Error(`${method} ${url} → HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  return new TextDecoder(encoding).decode(buffer);
}

/** 상대에게 부담을 주지 않도록 요청 사이에 쉬어 간다. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
