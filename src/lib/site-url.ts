/**
 * 메일 링크가 돌아올 주소.
 *
 * 브라우저의 location.origin에 기대면 취약하다. 샌드박스 iframe이나 file:// 에서는
 * origin이 문자열 "null"이 되고, 그대로 쓰면 "null/auth/callback" 같은 주소가
 * 메일에 박혀 링크가 죽는다. 배포하면 도메인도 달라진다.
 *
 * 그래서 NEXT_PUBLIC_SITE_URL 을 먼저 보고, 없을 때만 origin을 쓰되
 * http(s) 주소일 때만 받아들인다.
 */
const FALLBACK = "http://localhost:3000";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && /^https?:\/\//.test(configured)) {
    return configured.replace(/\/+$/, "");
  }

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
