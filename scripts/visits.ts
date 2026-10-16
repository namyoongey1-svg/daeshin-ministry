/**
 * 방문자가 어디서 왔는지 본다.
 *
 *   npm run visits            -- 최근 7일
 *   npm run visits -- 30      -- 최근 30일
 *
 * 열쇠는 공개 키(anon)면 된다. 합계만 돌려주는 함수라 누구나 부를 수 있다.
 */
import { createClient } from "@supabase/supabase-js";

const days = Number(process.argv[2]) || 7;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다 (.env.local).");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const LABEL: Record<string, string> = {
  threads: "스레드",
  facebook: "페이스북",
  instagram: "인스타그램",
  kakao: "카카오",
  google: "구글 검색",
  naver: "네이버 검색",
  daum: "다음 검색",
  bing: "빙 검색",
  direct: "직접 입력·앱 링크",
  other: "그 밖",
};

async function main() {
  const [{ data: refs, error }, { data: stats }] = await Promise.all([
    db.rpc("referrer_stats", { days }),
    db.rpc("site_stats"),
  ]);
  if (error) {
    // 함수가 없으면 아직 site_referrers.sql 을 적용하지 않은 것이다.
    if (/Could not find the function/.test(error.message)) {
      console.log('referrer_stats 함수가 없습니다. supabase/site_referrers.sql 을 먼저 적용해 주세요.');
      return;
    }
    throw new Error(error.message);
  }

  const rows = (refs ?? []) as { kind: string; visitors: number }[];
  const total = rows.reduce((n, r) => n + Number(r.visitors), 0);
  const s = Array.isArray(stats) ? stats[0] : stats;

  console.log(`최근 ${days}일 방문자 ${total}명 (오늘 ${s?.today_visitors ?? "?"}명 · 누적 ${s?.total_visitors ?? "?"}명)\n`);
  if (rows.length === 0) {
    console.log("아직 출처가 쌓이지 않았습니다. site_referrers.sql 을 적용하고 배포한 뒤부터 셉니다.");
    return;
  }
  for (const r of rows) {
    const n = Number(r.visitors);
    const pct = total ? Math.round((n / total) * 100) : 0;
    console.log(`${(LABEL[r.kind] ?? r.kind).padEnd(12)} ${String(n).padStart(5)}명 ${String(pct).padStart(3)}%`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
