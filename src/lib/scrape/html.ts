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

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * 자동 수집은 사람이 지켜보지 않으므로, 한 번 끊겼다고 그날 수집을 통째로
 * 버리지 않도록 몇 번 다시 시도한다. 4xx는 다시 걸어도 같은 답이라 바로 포기한다.
 */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const { encoding = "utf-8", method = "GET", body, referer } = options;

  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (referer) headers["Referer"] = referer;
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["X-Requested-With"] = "XMLHttpRequest";
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        const error = new Error(`${method} ${url} → HTTP ${res.status}`);
        if (res.status >= 400 && res.status < 500) throw error;
        lastError = error;
      } else {
        const buffer = await res.arrayBuffer();
        return new TextDecoder(encoding).decode(buffer);
      }
    } catch (err) {
      if (err instanceof Error && /HTTP 4\d\d/.test(err.message)) throw err;
      lastError = err;
    }

    if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt);
  }

  throw new Error(`${method} ${url} — ${describe(lastError)}`);
}

/**
 * 왜 끊겼는지까지 적는다.
 *
 * fetch 가 실패하면 메시지는 "fetch failed" 한 줄뿐이고, 실제 이유(주소를 못
 * 찾았는지, 상대가 거절했는지, 시간이 다 됐는지)는 cause 에 들어 있다.
 * 자동 수집은 로그를 나중에 읽으므로 그 한 줄로는 손을 쓸 수 없다.
 */
function describe(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (err.name === "TimeoutError") return `${REQUEST_TIMEOUT_MS / 1000}초 안에 응답이 없음`;

  const cause = err.cause;
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : null;
  const detail = cause instanceof Error ? cause.message : null;

  return [err.message, code, code === detail ? null : detail].filter(Boolean).join(" / ");
}

/**
 * 출처가 고정 글번호를 주지 않을 때, 내용에서 안정적인 식별자를 만든다.
 *
 * 갓피플은 목록을 받을 때마다 같은 공고에 다른 토큰(rc_idxx)을 붙여 준다.
 * 그 토큰을 식별자로 쓰면 수집할 때마다 같은 공고가 새 글로 쌓인다.
 * FNV-1a 해시라 실행 환경이 달라도 같은 값이 나온다.
 */
export function stableId(...parts: (string | null | undefined)[]): string {
  const input = parts.map((p) => (p ?? "").trim()).join("|");
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}

/** 상대에게 부담을 주지 않도록 요청 사이에 쉬어 간다. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
