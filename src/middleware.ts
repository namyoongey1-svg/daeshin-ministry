import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 세션 쿠키를 갱신해야 하는 길만 지난다.
  //
  // 예전에는 모든 경로를 훑었는데, 그러면 로그인과 상관없는 청빙 목록이나 원어
  // 화면을 열 때마다 Supabase에 인증 요청이 한 번씩 더 나간다. 로그인 상태를
  // 실제로 읽는 곳만 남긴다.
  matcher: ["/account/:path*", "/admin/:path*", "/auth/:path*", "/login"],
};
