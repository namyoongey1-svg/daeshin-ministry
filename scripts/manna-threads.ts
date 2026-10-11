/**
 * 로블록스 게임 "마나 수집 시뮬레이터" 홍보 글을 스레드에 올린다.
 *
 *   npm run manna-threads -- --dry      -- 올리지 않고 오늘 글만 찍어 본다
 *   npm run manna-threads               -- 올린다 (하루에 한 번만)
 *   npm run manna-threads -- --force    -- 오늘 이미 올렸어도 다시 올린다
 *   npm run manna-threads -- --dry --all  -- 묶음에 있는 글을 전부 검사한다
 *
 * 청빙공고용 scripts/threads.ts 와 **다른 스레드 계정**에 올린다.
 * 보는 사람이 전혀 달라서(한국 목회자 vs 해외 로블록스 유저) 계정을 섞으면
 * 양쪽 다 도달이 떨어진다. 그래서 토큰도 따로 둔다.
 *
 * 토큰은 60일짜리이고 하루가 지나면 연장할 수 있다. 일주일마다 연장해
 * Supabase 에 적어 두므로, 사람이 두 달마다 갈아 끼우지 않아도 된다.
 * 처음 한 번만 GitHub Secret(MANNA_THREADS_ACCESS_TOKEN)으로 넣는다.
 *
 * 평소에는 묶음에서 차례로 한 편씩 올리고, 방문 수가 기념할 만한 선을
 * 넘은 날에는 그 글을 대신 올린다.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GAME_URL, POSTS, pickPost } from "./manna-posts";

const API = "https://graph.threads.net";
/** 해외 유저가 모이는 태그. 1~50자, 마침표와 & 는 쓸 수 없다. */
const TOPIC = "Roblox";
/** 스레드 글 한도. 넘으면 메타가 통째로 거절한다. */
const MAX_CHARS = 500;
/** 이 게임의 로블록스 유니버스 번호. 공개 API 라 열쇠가 필요 없다. */
const UNIVERSE_ID = 10743312689;
/** 방문 수가 이 선을 넘으면 기념 글을 올린다. */
const MILESTONES = [100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000];
/** 토큰을 얼마나 묵히면 연장하는가. 하루가 지나야 연장되고, 60일이면 죽는다. */
const REFRESH_AFTER_MS = 7 * 86_400_000;

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");
const ALL = process.argv.includes("--all");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 한국 시각 기준 날짜. 하루에 한 번만 올리는 기준이 된다. */
function kstDay(now = Date.now()): string {
  return new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
}

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

/** Threads API 를 부른다. 실패하면 메타가 돌려준 말을 그대로 보인다. */
async function call(method: "GET" | "POST", pathAndQuery: string, params: Record<string, string>) {
  const url = new URL(`${API}${pathAndQuery}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method, signal: AbortSignal.timeout(30_000) });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (body.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new Error(`Threads API ${pathAndQuery}: ${message}`);
  }
  return body;
}

/** 토큰을 꺼낸다. 일주일이 지났으면 연장해서 다시 적어 둔다. */
async function getToken(db: SupabaseClient): Promise<string | null> {
  const stored = await getSecret(db, "manna_threads_token");
  const token = stored?.value ?? process.env.MANNA_THREADS_ACCESS_TOKEN ?? null;
  if (!token) return null;

  const age = stored ? Date.now() - Date.parse(stored.updated_at) : Infinity;
  if (age < REFRESH_AFTER_MS) return token;

  try {
    const fresh = await call("GET", "/refresh_access_token", {
      grant_type: "th_refresh_token",
      access_token: token,
    });
    const next = String(fresh.access_token ?? "");
    if (next) {
      await setSecret(db, "manna_threads_token", next);
      console.log("토큰을 60일 더 연장해 두었습니다.");
      return next;
    }
  } catch (err) {
    // 막 발급한 토큰은 하루가 안 되어 연장이 안 된다. 지금 쓰는 데는 문제없다.
    console.log(`토큰 연장은 건너뜁니다 — ${err instanceof Error ? err.message : err}`);
    if (!stored) await setSecret(db, "manna_threads_token", token);
  }
  return token;
}

/** 로블록스 공개 지표. 실패해도 홍보 글은 올라가야 하므로 null 을 돌려준다. */
async function fetchStats(): Promise<{ visits: number; playing: number; favorites: number } | null> {
  try {
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${UNIVERSE_ID}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { visits: number; playing: number; favoritedCount: number }[] };
    const game = body.data?.[0];
    if (!game) return null;
    return { visits: game.visits, playing: game.playing, favorites: game.favoritedCount };
  } catch {
    return null;
  }
}

function milestoneText(visits: number): string {
  return (
    `${visits.toLocaleString("en-US")} visits.\n\n` +
    "Thank you to everyone who opened a land, raised a companion, or laid a stone on their island.\n\n" +
    "Still free, still no purchases, still has an ending." +
    `\n\n${GAME_URL}`
  );
}

/** 넘긴 글이 올릴 만한지 본다. 한도를 넘으면 올리지 않는다. */
function tooLong(text: string): boolean {
  return [...text].length > MAX_CHARS;
}

async function main() {
  // --all: 묶음 전체를 검사한다. 글을 고친 뒤 한 번 돌려 보는 용도다.
  if (ALL) {
    let bad = 0;
    POSTS.forEach((post, index) => {
      const length = [...post.text].length;
      const flag = length > MAX_CHARS ? "  <-- 한도 초과" : "";
      if (length > MAX_CHARS) bad += 1;
      console.log(`${String(index).padStart(2)} [${post.kind.padEnd(7)}] ${length}자${flag}`);
    });
    console.log(`\n총 ${POSTS.length}편, 한도 초과 ${bad}편`);
    if (bad > 0) process.exitCode = 1;
    return;
  }

  const today = kstDay();
  const stats = await fetchStats();
  if (stats) {
    console.log(`로블록스 지표: 방문 ${stats.visits} · 접속 ${stats.playing} · 즐겨찾기 ${stats.favorites}`);
  } else {
    console.log("로블록스 지표를 가져오지 못했습니다. 기념 글 판단은 건너뜁니다.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 시험 실행은 Supabase 없이도 돌아가야 한다. 글만 보고 싶을 때가 더 많다.
  if (DRY && (!url || !key)) {
    const { post } = pickPost(0);
    console.log(`\n[${post.kind}] ${[...post.text].length}자\n`);
    console.log(post.text);
    console.log("\n(Supabase 열쇠가 없어 묶음 첫 글을 보여드렸습니다.)");
    return;
  }

  if (!url || !key) {
    console.log("Supabase 열쇠가 없어 건너뜁니다.");
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false } });

  // 같은 날 두 번 올리지 않는다. 워크플로를 손으로 다시 돌려도 된다.
  const last = await getSecret(db, "manna_threads_last_day");
  if (last?.value === today && !FORCE) {
    console.log(`${today} 글은 이미 올렸습니다.`);
    return;
  }

  // 기념할 선을 넘었으면 그 글을 먼저 올린다. 묶음 순서는 그대로 둔다.
  let text: string | null = null;
  let kind = "";
  let reachedMilestone: number | null = null;

  if (stats) {
    const doneRaw = await getSecret(db, "manna_threads_milestone");
    const done = Number(doneRaw?.value ?? 0);
    const reached = MILESTONES.filter((m) => stats.visits >= m && m > done).pop();
    if (reached) {
      reachedMilestone = reached;
      text = milestoneText(stats.visits);
      kind = `기념(${reached})`;
    }
  }

  // 평소에는 묶음에서 차례로 하나.
  let nextCursor: number | null = null;
  if (!text) {
    const cursorRaw = await getSecret(db, "manna_threads_cursor");
    const { post, next } = pickPost(Number(cursorRaw?.value ?? 0));
    if (tooLong(post.text)) {
      console.log(`글이 ${MAX_CHARS}자를 넘어 건너뜁니다. 커서만 넘깁니다.`);
      await setSecret(db, "manna_threads_cursor", String(next));
      return;
    }
    text = post.text;
    kind = post.kind;
    nextCursor = next;
  }

  console.log(`\n[${kind}] ${[...text].length}자\n`);
  console.log(text);
  console.log("");

  if (DRY) {
    console.log("시험 실행이라 올리지 않았습니다.");
    return;
  }

  if (tooLong(text)) {
    throw new Error(`글이 ${MAX_CHARS}자를 넘습니다. 올리지 않았습니다.`);
  }

  const token = await getToken(db);
  if (!token) {
    console.log("MANNA_THREADS_ACCESS_TOKEN 이 없어 건너뜁니다.");
    return;
  }

  const id = await publish(token, text);

  // 올린 뒤에만 표시를 남긴다. 중간에 실패하면 내일 같은 글을 다시 시도한다.
  await setSecret(db, "manna_threads_last_day", today);
  if (nextCursor !== null) await setSecret(db, "manna_threads_cursor", String(nextCursor));
  if (reachedMilestone !== null) await setSecret(db, "manna_threads_milestone", String(reachedMilestone));

  console.log(`올렸습니다 (게시물 ${id}).`);
}

/** 글 하나를 올린다. 컨테이너를 만들고, 기다렸다가, 게시한다. */
async function publish(token: string, text: string): Promise<string> {
  const container = await call("POST", "/v1.0/me/threads", {
    media_type: "TEXT",
    text,
    topic_tag: TOPIC,
    access_token: token,
  });

  // 메타가 컨테이너를 만드는 데 시간이 든다. 바로 게시하면 실패하는 일이 있어
  // 문서가 권하는 대로 30초 기다린다.
  await sleep(30_000);

  const published = await call("POST", "/v1.0/me/threads_publish", {
    creation_id: String(container.id),
    access_token: token,
  });
  return String(published.id);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
