/**
 * 로블록스 게임 "마나 수집 시뮬레이터" 홍보 글을 스레드에 올린다.
 *
 *   npm run manna-threads -- --dry            -- 올리지 않고 오늘 글만 찍어 본다
 *   npm run manna-threads                     -- 한국어 글을 올린다 (하루에 한 번만)
 *   npm run manna-threads -- --pack en        -- 영어 글을 올린다
 *   npm run manna-threads -- --force          -- 오늘 이미 올렸어도 다시 올린다
 *   npm run manna-threads -- --all            -- 두 묶음의 글자 수를 전부 검사한다
 *
 * 묶음이 둘이고 올라가는 계정도 둘이다.
 *
 *   ko  — 기존 전도사 계정(청빙공고와 같은 계정). 주일학교 교사·학부모가 본다.
 *         이분들은 게임을 실제로 "쓸" 사람이라 전환이 가장 높다.
 *   en  — 게임용 새 계정. 토큰(MANNA_THREADS_ACCESS_TOKEN)이 없으면 스스로 건너뛴다.
 *
 * ko 는 청빙공고 글과 계정을 공유하므로 **토큰을 연장하지 않는다.**
 * scripts/threads.ts 가 이미 날마다 연장하고 있어서, 양쪽에서 연장하면 엇갈린다.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PACKS, pickPost, type Pack, type PackName } from "./manna-posts";

const API = "https://graph.threads.net";
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
// indexOf 는 없을 때 -1 을 돌려준다. 그대로 +1 하면 argv[0](노드 경로)을 집는다.
const PACK_AT = process.argv.indexOf("--pack");
const PACK_NAME = (PACK_AT === -1 ? "ko" : process.argv[PACK_AT + 1] ?? "ko") as PackName;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const length = (text: string) => [...text].length;

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

/** 토큰을 꺼낸다. 연장해도 되는 묶음이고 일주일이 지났으면 연장해서 적어 둔다. */
async function getToken(db: SupabaseClient, pack: Pack): Promise<string | null> {
  const stored = await getSecret(db, pack.tokenSecret);
  const token = stored?.value ?? process.env[pack.tokenEnv] ?? null;
  if (!token) return null;
  if (!pack.refreshToken) return token;

  const age = stored ? Date.now() - Date.parse(stored.updated_at) : Infinity;
  if (age < REFRESH_AFTER_MS) return token;

  try {
    const fresh = await call("GET", "/refresh_access_token", {
      grant_type: "th_refresh_token",
      access_token: token,
    });
    const next = String(fresh.access_token ?? "");
    if (next) {
      await setSecret(db, pack.tokenSecret, next);
      console.log("토큰을 60일 더 연장해 두었습니다.");
      return next;
    }
  } catch (err) {
    // 막 발급한 토큰은 하루가 안 되어 연장이 안 된다. 지금 쓰는 데는 문제없다.
    console.log(`토큰 연장은 건너뜁니다 — ${err instanceof Error ? err.message : err}`);
    if (!stored) await setSecret(db, pack.tokenSecret, token);
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

/** 두 묶음의 글자 수를 전부 본다. 글을 고친 뒤 한 번 돌려 보는 용도다. */
function checkAll(): number {
  let bad = 0;
  for (const [name, pack] of Object.entries(PACKS)) {
    console.log(`\n=== ${name} (${pack.posts.length}편, 태그 #${pack.topic}) ===`);
    pack.posts.forEach((post, index) => {
      const n = length(post.text);
      const flag = n > MAX_CHARS ? "  <-- 한도 초과" : "";
      if (n > MAX_CHARS) bad += 1;
      console.log(`${String(index).padStart(2)} [${post.kind.padEnd(7)}] ${n}자${flag}`);
    });
  }
  console.log(`\n한도 초과 ${bad}편`);
  return bad;
}

async function main() {
  if (ALL) {
    if (checkAll() > 0) process.exitCode = 1;
    return;
  }

  const pack = PACKS[PACK_NAME];
  if (!pack) {
    throw new Error(`묶음 이름이 틀렸습니다: ${PACK_NAME} (ko 또는 en)`);
  }
  console.log(`묶음: ${PACK_NAME} · 태그 #${pack.topic} · ${pack.posts.length}편`);

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
    const { post } = pickPost(pack.posts, 0);
    console.log(`\n[${post.kind}] ${length(post.text)}자\n`);
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
  const last = await getSecret(db, pack.keys.lastDay);
  if (last?.value === today && !FORCE) {
    console.log(`${today} 글은 이미 올렸습니다.`);
    return;
  }

  // 기념할 선을 넘었으면 그 글을 먼저 올린다. 묶음 순서는 그대로 둔다.
  let text: string | null = null;
  let kind = "";
  let reachedMilestone: number | null = null;

  if (stats) {
    const doneRaw = await getSecret(db, pack.keys.milestone);
    const done = Number(doneRaw?.value ?? 0);
    const reached = MILESTONES.filter((m) => stats.visits >= m && m > done).pop();
    if (reached) {
      reachedMilestone = reached;
      text = pack.milestone(stats.visits);
      kind = `기념(${reached})`;
    }
  }

  // 평소에는 묶음에서 차례로 하나.
  let nextCursor: number | null = null;
  if (!text) {
    const cursorRaw = await getSecret(db, pack.keys.cursor);
    const { post, next } = pickPost(pack.posts, Number(cursorRaw?.value ?? 0));
    if (length(post.text) > MAX_CHARS) {
      console.log(`글이 ${MAX_CHARS}자를 넘어 건너뜁니다. 커서만 넘깁니다.`);
      await setSecret(db, pack.keys.cursor, String(next));
      return;
    }
    text = post.text;
    kind = post.kind;
    nextCursor = next;
  }

  console.log(`\n[${kind}] ${length(text)}자\n`);
  console.log(text);
  console.log("");

  if (DRY) {
    console.log("시험 실행이라 올리지 않았습니다.");
    return;
  }

  if (length(text) > MAX_CHARS) {
    throw new Error(`글이 ${MAX_CHARS}자를 넘습니다. 올리지 않았습니다.`);
  }

  const token = await getToken(db, pack);
  if (!token) {
    console.log(`${pack.tokenEnv} 이(가) 없어 건너뜁니다.`);
    return;
  }

  const id = await publish(token, text, pack.topic);

  // 올린 뒤에만 표시를 남긴다. 중간에 실패하면 내일 같은 글을 다시 시도한다.
  await setSecret(db, pack.keys.lastDay, today);
  if (nextCursor !== null) await setSecret(db, pack.keys.cursor, String(nextCursor));
  if (reachedMilestone !== null) await setSecret(db, pack.keys.milestone, String(reachedMilestone));

  console.log(`올렸습니다 (게시물 ${id}).`);
}

/** 글 하나를 올린다. 컨테이너를 만들고, 기다렸다가, 게시한다. */
async function publish(token: string, text: string, topic: string): Promise<string> {
  const container = await call("POST", "/v1.0/me/threads", {
    media_type: "TEXT",
    text,
    topic_tag: topic,
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
