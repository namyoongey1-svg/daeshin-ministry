/**
 * Supabase 연결 정보.
 *
 * 아직 프로젝트를 연결하지 않았어도 앱이 뜨게 한다. 청빙 목록과 원어 도구는
 * Supabase 없이도 동작하므로, 키가 없을 때는 로그인 기능만 잠가 둔다.
 */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase 키가 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 넣어 주세요."
    );
  }
  return env;
}
