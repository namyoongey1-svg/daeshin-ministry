import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 우리 사이트 안의 경로만 받는다.
 *
 * `${origin}${next}` 로 붙이므로 `//evil.com` 같은 값이 들어오면 브라우저가
 * 스킴 생략 주소로 읽어 남의 사이트로 넘어간다. 로그인 직후는 사람이 주소를
 * 살피지 않는 순간이라 특히 위험하다.
 */
function safeNext(raw: string | null): string {
  return raw && /^\/(?!\/)/.test(raw) ? raw : "/account";
}

/** 메일 링크와 카카오·구글 로그인이 돌아오는 자리. 코드를 세션으로 바꾼다. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=코드가 없습니다`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=Supabase가 연결되지 않았습니다`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
