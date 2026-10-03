/**
 * 어제 올라온 청빙공고를 분석해 스레드에 올린다.
 *
 *   npm run threads -- --dry      -- 올리지 않고 글만 찍어 본다
 *   npm run threads               -- 올린다 (하루에 한 번만)
 *   npm run threads -- --force    -- 오늘 이미 올렸어도 다시 올린다
 *   npm run threads -- --dry --weekly           -- 주간 요약도 만들어 본다
 *   npm run threads -- --dry --at 2026-10-05    -- 그날 아침인 셈 치고 만든다
 *
 * 월요일 아침에는 지난주(월~일) 요약을 한 편 더 올린다.
 *
 * 매일 아침 수집이 끝난 뒤 GitHub Actions 가 돌린다. 수집이 실패한 날에는
 * 돌리지 않는다 — 반쯤 모인 숫자를 공개적으로 올리게 되기 때문이다.
 *
 * 열쇠(접근 토큰)는 60일짜리다. 하루 이상 지난 토큰은 새로 연장할 수 있어,
 * 일주일마다 연장해 Supabase 에 적어 둔다. 그러면 사람이 두 달마다 토큰을
 * 갈아 끼우지 않아도 된다. 처음 한 번만 GitHub Secret 으로 넣는다.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildDailyReport, buildWeeklyReport, isKstMonday } from "@/lib/daily-report";
import { applyDenominations, applyLoosePlaces, buildListings } from "@/lib/scrape/listings";
import type { ScrapedPost } from "@/lib/scrape/types";

const API = "https://graph.threads.net";
const DIR = path.join(process.cwd(), "src", "data", "scraped");
const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");
/** 월요일이 아니어도 주간 요약을 만든다. 시험할 때 쓴다. */
const WEEKLY = process.argv.includes("--weekly");
/**
 * 그날 아침인 셈 치고 돌린다. "--at 2026-10-05" 처럼 준다. 시험할 때 쓴다.
 * 한국 시각 아침 7시 10분으로 잡는다 — 실제로 도는 때다.
 */
const AT = process.argv[process.argv.indexOf("--at") + 1];
const NOW = process.argv.includes("--at") ? Date.parse(`${AT}T07:10:00+09:00`) : Date.now();

/** 토큰을 얼마나 묵히면 연장하는가. 하루가 지나야 연장되고, 60일이면 죽는다. */
const REFRESH_AFTER_MS = 7 * 86_400_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readJson<T>(file: string, fallback: T): Promise<T> {
  return readFile(path.join(DIR, file), "utf8")
    .then((t) => JSON.parse(t) as T)
    .catch(() => fallback);
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
  const stored = await getSecret(db, "threads_token");
  const token = stored?.value ?? process.env.THREADS_ACCESS_TOKEN ?? null;
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
      await setSecret(db, "threads_token", next);
      console.log("토큰을 60일 더 연장해 두었습니다.");
      return next;
    }
  } catch (err) {
    // 막 발급한 토큰은 하루가 안 되어 연장이 안 된다. 그래도 지금 쓰는 데는 문제없다.
    console.log(`토큰 연장은 건너뜁니다 — ${err instanceof Error ? err.message : err}`);
    if (!stored) await setSecret(db, "threads_token", token);
  }
  return token;
}

async function main() {
  const posts = await readJson<ScrapedPost[]>("posts.json", []);
  const listings = applyLoosePlaces(
    applyDenominations(buildListings(posts), await readJson("denominations.json", {})),
    await readJson("places.json", {})
  );
  const open = listings.filter((l) => !l.closedAt).length;

  // 올릴 글을 모은다. 날마다 하루치 하나, 월요일엔 지난주 요약을 하나 더.
  const daily = buildDailyReport(listings, open, NOW);
  const jobs: { kind: string; key: string; mark: string; count: number; text: string }[] = [
    { kind: "일간", key: "threads_last_day", mark: daily.day, count: daily.count, text: daily.text },
  ];
  if (isKstMonday(NOW) || WEEKLY) {
    const weekly = buildWeeklyReport(listings, open, NOW);
    jobs.push({
      kind: "주간",
      key: "threads_last_week",
      mark: weekly.weekStart,
      count: weekly.count,
      text: weekly.text,
    });
  }

  for (const job of jobs) {
    console.log(`[${job.kind} ${job.mark}] ${job.count}건 · ${job.text.length}자
`);
    console.log(job.text);
    console.log("");
  }

  if (DRY) {
    console.log("시험 실행이라 올리지 않았습니다.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Supabase 열쇠가 없어 건너뜁니다.");
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false } });

  const token = await getToken(db);
  if (!token) {
    console.log("THREADS_ACCESS_TOKEN 이 없어 건너뜁니다.");
    return;
  }

  for (const job of jobs) {
    // 0건이면 수집이 덜 됐거나 명절이다. 어느 쪽이든 "0건"을 공개적으로 올릴 일은 아니다.
    if (job.count === 0) {
      console.log(`${job.kind}: 공고가 없어 올리지 않습니다.`);
      continue;
    }
    // 같은 날, 같은 주를 두 번 올리지 않는다. 워크플로를 손으로 다시 돌려도 된다.
    const last = await getSecret(db, job.key);
    if (last?.value === job.mark && !FORCE) {
      console.log(`${job.kind}: ${job.mark} 글은 이미 올렸습니다.`);
      continue;
    }
    const id = await publish(token, job.text);
    await setSecret(db, job.key, job.mark);
    console.log(`${job.kind}: 올렸습니다 (게시물 ${id}).`);
  }
}

/** 글 하나를 올린다. 컨테이너를 만들고, 기다렸다가, 게시한다. */
async function publish(token: string, text: string): Promise<string> {
  const container = await call("POST", "/v1.0/me/threads", {
    media_type: "TEXT",
    text,
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
