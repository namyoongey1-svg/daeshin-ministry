"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/*
  방문 수를 세고 모두에게 보여 준다.

  누가 왔는지는 남기지 않는다. 오늘 이 브라우저가 처음인지만 브라우저 안에
  적어 두고, 서버에는 "한 명 더" 와 "한 화면 더" 만 보낸다.

  화면 안에서 세는 까닭은 기계를 거르기 위해서다. 검색엔진이나 긁어 가는
  기계는 대개 자바스크립트를 돌리지 않는다. 서버에서 요청마다 세면 사람보다
  기계가 더 많이 잡힌다. 자동화 브라우저(navigator.webdriver)도 뺀다 — 스크린샷을
  찍으려고 띄운 브라우저까지 방문자로 세면 숫자가 부풀려진다.
*/

interface Stats {
  today_visitors: number;
  today_views: number;
  total_visitors: number;
  total_views: number;
}

/** 한국 날짜. 그대로 두면 아침 아홉 시에 "오늘"이 바뀐다. */
function today(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 오늘 이 브라우저가 처음 왔는가. 처음이면 표시를 남긴다. */
function firstVisitToday(): boolean {
  const key = `daeshin.visit.${today()}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
    return true;
  } catch {
    // 저장소를 막아 둔 브라우저. 처음으로 치면 새로 고칠 때마다 한 명씩
    // 늘어나므로, 화면 수만 세고 사람 수는 올리지 않는다.
    return false;
  }
}

const n = (v: number) => Number(v).toLocaleString("ko-KR");

export function VisitCounter() {
  const path = usePathname();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (navigator.webdriver) return;
    let alive = true;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return; // Supabase 를 붙이지 않은 개발 환경
    }

    (async () => {
      await supabase.rpc("record_visit", { new_visitor: firstVisitToday() });
      const { data } = await supabase.rpc("site_stats");
      const row = Array.isArray(data) ? data[0] : data;
      if (alive && row) setStats(row as Stats);
    })();

    return () => {
      alive = false;
    };
    // 화면이 바뀔 때마다 한 번씩 센다. 사이트 안에서 옮겨 다니는 것도 조회다.
  }, [path]);

  if (!stats) return null;

  return (
    <p className="text-xs text-faint" title="같은 사람이 하루에 여러 번 와도 한 명으로 셉니다. 전체는 날마다 센 사람 수를 더한 것입니다.">
      오늘 <b className="font-semibold text-muted">{n(stats.today_visitors)}</b>명 · 전체{" "}
      <b className="font-semibold text-muted">{n(stats.total_visitors)}</b>명
      <span className="mx-1.5">|</span>
      조회 {n(stats.total_views)}
    </p>
  );
}
