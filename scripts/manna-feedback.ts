/**
 * 마나 게임의 한 주치 반응을 한 장으로 모은다.
 *
 *   npm run manna-feedback            -- 보고서를 찍고 이번 주 숫자를 저장한다
 *   npm run manna-feedback -- --peek  -- 찍기만 하고 저장하지 않는다
 *
 * 월요일 저녁에 돌려서 "지난 한 주에 무엇이 달라졌는가"를 본다.
 * 저장을 해 둬야 다음 주에 증감을 낼 수 있으므로, 그냥 보고 싶을 때는
 * --peek 를 쓴다.
 *
 * 모으는 것은 둘이다.
 *   1. 로블록스 공개 지표 — 방문·동시접속·좋아요·즐겨찾기. 열쇠가 필요 없다.
 *   2. 스레드 반응 — 홍보 글에 달린 답글과 조회수. 전도사 계정 토큰을 쓴다.
 *
 * 어느 쪽이 실패해도 나머지는 나온다. 한 주에 한 번 보는 것이라
 * 반쪽짜리라도 없는 것보다 낫다.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GAME_URL } from "./manna-posts";

const API = "https://graph.threads.net";
const UNIVERSE_ID = 10743312689;
const PEEK = process.argv.includes("--peek");
/** 최근 올린 글 중 몇 편까지 거슬러 볼 것인가. 주 3회니 넉넉하다. */
const LOOKBACK = 15;
const SNAPSHOT = "manna_feedback_snapshot";

type Snapshot = {
  at: string;
  visits: number;
  favorites: number;
  upVotes: number;
  downVotes: number;
};

type Reply = { from: string; text: string; at: string; on: string };

async function getSecret(db: SupabaseClient, name: string) {
  const { data } = await db.from("app_secrets").select("value, updated_at").eq("name", name).maybeSingle();
  return data as { value: string; updated_at: string } | null;
}

async function setSecret(db: SupabaseClient, name: string, value: string) {
  const { error } = await db
    .from("app_secrets")
    .upsert({ name, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`${name} 을(를) 저장하지 못했습니다: ${error.message}`);
}

async function threads(pathAndQuery: string, params: Record<string, string>) {
  const url = new URL(`${API}${pathAndQuery}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (body.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body;
}

/** 증감을 "+12" 처럼 적는다. 0 이면 "-" 로 둬서 눈이 그냥 지나가게 한다. */
function delta(now: number, before: number | undefined): string {
  if (before === undefined) return "(첫 기록)";
  const d = now - before;
  if (d === 0) return "-";
  return d > 0 ? `+${d.toLocaleString("ko-KR")}` : d.toLocaleString("ko-KR");
}

async function robloxStats() {
  const [info, votes] = await Promise.all([
    fetch(`https://games.roblox.com/v1/games?universeIds=${UNIVERSE_ID}`, {
      signal: AbortSignal.timeout(20_000),
    }).then((r) => r.json()),
    fetch(`https://games.roblox.com/v1/games/votes?universeIds=${UNIVERSE_ID}`, {
      signal: AbortSignal.timeout(20_000),
    }).then((r) => r.json()),
  ]);
  const g = info?.data?.[0];
  const v = votes?.data?.[0];
  if (!g) throw new Error("로블록스가 게임 정보를 돌려주지 않았습니다.");
  return {
    visits: g.visits as number,
    playing: g.playing as number,
    favorites: g.favoritedCount as number,
    upVotes: (v?.upVotes ?? 0) as number,
    downVotes: (v?.downVotes ?? 0) as number,
    updated: g.updated as string,
  };
}

/**
 * 홍보 글에 달린 답글을 모은다.
 *
 * 토큰이 없거나 메타가 거절하면 빈 배열을 돌려준다. 반응을 못 봐도
 * 로블록스 숫자는 봐야 하므로 여기서 멈추면 안 된다.
 */
async function threadsFeedback(token: string) {
  const posts: { id: string; text: string; at: string; views?: number; likes?: number }[] = [];
  const replies: Reply[] = [];

  const mine = (await threads("/v1.0/me/threads", {
    fields: "id,text,timestamp,permalink",
    limit: String(LOOKBACK),
    access_token: token,
  })) as { data?: { id: string; text?: string; timestamp?: string }[] };

  // 게임 링크가 들어간 글만 본다. 청빙공고 글이 섞이면 안 된다.
  const ours = (mine.data ?? []).filter((p) => (p.text ?? "").includes(GAME_URL));

  for (const post of ours) {
    const entry = {
      id: post.id,
      text: (post.text ?? "").split("\n")[0].slice(0, 40),
      at: (post.timestamp ?? "").slice(0, 10),
      views: undefined as number | undefined,
      likes: undefined as number | undefined,
    };

    // 조회수는 계정 상태에 따라 안 줄 때가 있다. 없으면 없는 대로 둔다.
    try {
      const ins = (await threads(`/v1.0/${post.id}/insights`, {
        metric: "views,likes,replies",
        access_token: token,
      })) as { data?: { name: string; values?: { value: number }[] }[] };
      for (const m of ins.data ?? []) {
        const value = m.values?.[0]?.value;
        if (m.name === "views") entry.views = value;
        if (m.name === "likes") entry.likes = value;
      }
    } catch {
      /* 조회수는 없어도 된다 */
    }

    try {
      const rep = (await threads(`/v1.0/${post.id}/replies`, {
        fields: "id,text,username,timestamp",
        access_token: token,
      })) as { data?: { text?: string; username?: string; timestamp?: string }[] };
      for (const r of rep.data ?? []) {
        if (!r.text) continue;
        replies.push({
          from: r.username ?? "?",
          text: r.text.replace(/\s+/g, " ").slice(0, 200),
          at: (r.timestamp ?? "").slice(0, 10),
          on: entry.text,
        });
      }
    } catch {
      /* 답글을 못 읽어도 넘어간다 */
    }

    posts.push(entry);
  }

  return { posts, replies };
}

async function main() {
  const lines: string[] = [];
  const say = (s = "") => {
    lines.push(s);
    console.log(s);
  };

  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
  say(`# 마나 게임 주간 보고 (${kst})`);
  say();

  // ---------------------------------------------------------------- 로블록스
  let stats: Awaited<ReturnType<typeof robloxStats>> | null = null;
  try {
    stats = await robloxStats();
  } catch (err) {
    say(`로블록스 지표를 가져오지 못했습니다 — ${err instanceof Error ? err.message : err}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

  let before: Snapshot | undefined;
  if (db) {
    const raw = await getSecret(db, SNAPSHOT);
    if (raw?.value) {
      try {
        before = JSON.parse(raw.value) as Snapshot;
      } catch {
        /* 깨진 기록은 없는 셈 친다 */
      }
    }
  }

  if (stats) {
    const since = before ? `${before.at.slice(0, 10)} 이후` : "첫 기록";
    say(`## 로블록스 (${since})`);
    say();
    say("| 항목 | 지금 | 지난주 대비 |");
    say("| --- | ---: | ---: |");
    say(`| 방문 | ${stats.visits.toLocaleString("ko-KR")} | ${delta(stats.visits, before?.visits)} |`);
    say(`| 즐겨찾기 | ${stats.favorites.toLocaleString("ko-KR")} | ${delta(stats.favorites, before?.favorites)} |`);
    say(`| 좋아요 | ${stats.upVotes.toLocaleString("ko-KR")} | ${delta(stats.upVotes, before?.upVotes)} |`);
    say(`| 싫어요 | ${stats.downVotes.toLocaleString("ko-KR")} | ${delta(stats.downVotes, before?.downVotes)} |`);
    say(`| 지금 접속 | ${stats.playing} | |`);
    say();

    // 싫어요 비율은 그 자체로 신호다. 적은 표본에서도 방향은 보인다.
    const total = stats.upVotes + stats.downVotes;
    if (total >= 5) {
      const pct = Math.round((stats.upVotes / total) * 100);
      say(`좋아요 비율 ${pct}% (${stats.upVotes}/${total})`);
      say();
    }
  }

  // ------------------------------------------------------------------ 스레드
  const token = db ? (await getSecret(db, "threads_token"))?.value ?? process.env.THREADS_ACCESS_TOKEN : process.env.THREADS_ACCESS_TOKEN;

  if (!token) {
    say("## 스레드");
    say();
    // 토큰은 청빙 쪽이 날마다 연장해 Supabase 에 넣어 둔다. 여기서 못 찾으면 대개 열쇠가 없어서다.
    say(
      db
        ? "토큰이 없어 반응을 보지 못했습니다."
        : "토큰이 없어 반응을 보지 못했습니다 — .env.local 에 SUPABASE_SERVICE_ROLE_KEY 가 없어 저장된 토큰을 읽지 못했습니다.",
    );
    say();
  } else {
    try {
      const { posts, replies } = await threadsFeedback(token);
      say(`## 스레드 — 홍보 글 ${posts.length}편`);
      say();
      if (posts.length > 0) {
        say("| 올린 날 | 첫 줄 | 조회 | 좋아요 |");
        say("| --- | --- | ---: | ---: |");
        for (const p of posts) {
          say(`| ${p.at} | ${p.text} | ${p.views ?? "-"} | ${p.likes ?? "-"} |`);
        }
        say();
      }

      say(`### 답글 ${replies.length}개`);
      say();
      if (replies.length === 0) {
        say("아직 답글이 없습니다.");
      } else {
        for (const r of replies) {
          say(`- **@${r.from}** (${r.at}, "${r.on}")`);
          say(`  > ${r.text}`);
        }
      }
      say();
    } catch (err) {
      say("## 스레드");
      say();
      say(`반응을 가져오지 못했습니다 — ${err instanceof Error ? err.message : err}`);
      say();
    }
  }

  // ------------------------------------------------------------------ 저장
  if (stats && db && !PEEK) {
    const snapshot: Snapshot = {
      at: new Date().toISOString(),
      visits: stats.visits,
      favorites: stats.favorites,
      upVotes: stats.upVotes,
      downVotes: stats.downVotes,
    };
    await setSecret(db, SNAPSHOT, JSON.stringify(snapshot));
    say("(이번 주 숫자를 저장했습니다. 다음 주에 증감으로 보입니다.)");
  } else if (PEEK) {
    say("(--peek 라 저장하지 않았습니다.)");
  } else if (!db) {
    say("(SUPABASE_SERVICE_ROLE_KEY 가 없어 이번 주 숫자를 저장하지 못했습니다. 다음 주에도 증감이 안 나옵니다.)");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
