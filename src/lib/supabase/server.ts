import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/** Supabase를 아직 연결하지 않았으면 null. 호출부에서 비로그인으로 다룬다. */
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) return null;

  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // 서버 컴포넌트에서는 쿠키를 못 쓴다. 미들웨어가 갱신을 맡는다.
        }
      },
    },
  });
}
