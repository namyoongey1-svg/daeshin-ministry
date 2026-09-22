/**
 * 이 사이트의 주소.
 *
 * 메일 링크가 돌아올 곳이자, 검색엔진에 알려 줄 정식 주소(canonical)다.
 * 서버(사이트맵·메타데이터)와 브라우저(로그인 링크) 양쪽에서 쓰이므로
 * window 에만 기대면 안 된다.
 *
 * 순서대로 본다.
 *   1. NEXT_PUBLIC_SITE_URL   — 직접 지정한 값
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel이 넣어 주는 운영 도메인
 *   3. window.location.origin — 브라우저에서만. 샌드박스 iframe에서는
 *      origin이 문자열 "null"이 되므로 http(s)일 때만 받아들인다.
 *   4. 개발 기본값
 */
const FALLBACK = "http://localhost:3000";

function clean(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && /^https?:\/\//.test(configured)) return clean(configured);

  // Vercel은 도메인만 넣어 준다 (스킴 없음).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return clean(`https://${vercel.replace(/^https?:\/\//, "")}`);

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (/^https?:\/\/.+/.test(origin)) return origin;
  }

  return FALLBACK;
}

/** 메일 링크가 되돌아올 콜백 주소 */
export function getCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

/**
 * 로그인을 마치고 보던 화면으로 되돌아오는 콜백 주소.
 *
 * 콘티를 쓰다 저장하려고 로그인한 사람을 /account 로 보내면, 쓰던 것을
 * 두고 온 셈이 된다. 우리 사이트 안의 경로만 받는다 — 바깥 주소를 그대로
 * 붙이면 로그인 직후 남의 사이트로 튕겨 보낼 수 있다.
 */
export function callbackWithNext(next?: string): string {
  const base = getCallbackUrl();
  if (!next || !/^\/(?!\/)/.test(next)) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}
