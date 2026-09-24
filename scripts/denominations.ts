/**
 * 공고 본문에서 교단만 뽑아 둔다.
 *
 *   npm run denominations
 *   npm run denominations -- --limit 50     -- 이번에 읽을 공고 수
 *   npm run denominations -- --delay 2500   -- 요청 간격(ms)
 *   npm run denominations -- --recheck      -- 이미 읽은 것도 다시
 *
 * 본문은 저장하지 않는다. 남의 글이고 담당자 연락처가 섞여 있어, 교단이라는
 * 사실 하나만 남기고 나머지는 버린다. 글자를 파일에 쓰는 곳이 이 스크립트
 * 어디에도 없다.
 *
 * 읽는 곳은 청빙넷과 백석대 둘뿐이다. 두 곳만 본문에 교단 칸이 있다.
 * 갓피플은 상세 페이지를 자바스크립트로 그려 본문이 오지 않고, 총신대는
 * 교단 칸이 없는 대신 게시판만으로 이미 합동인 것을 안다.
 *
 * 한 번 읽은 공고는 다시 읽지 않는다. 날마다 도는 수집에서는 새 공고만
 * 읽으므로 평소에는 몇 건이면 끝난다.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readFromBody, type Denomination } from "@/lib/denomination";
import { fetchText, stripTags } from "@/lib/scrape/html";
import type { ScrapedPost, SourceId } from "@/lib/scrape/types";

const DIR = path.join(process.cwd(), "src", "data", "scraped");
const POSTS = path.join(DIR, "posts.json");
const OUT = path.join(DIR, "denominations.json");

/** 본문에 교단 칸이 있는 게시판만 읽는다. */
const READABLE: SourceId[] = ["minitries", "baekseok"];

export interface Entry {
  own: Denomination | null;
  accepts: Denomination[];
  acceptsAll: boolean;
}

/** 키는 "출처:글번호". 같은 글을 두 번 읽지 않기 위한 것이다. */
export type DenominationBook = Record<string, Entry>;

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const value = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const posts = JSON.parse(await readFile(POSTS, "utf8")) as ScrapedPost[];
  const book: DenominationBook = await readFile(OUT, "utf8")
    .then((t) => JSON.parse(t) as DenominationBook)
    .catch(() => ({}));

  const recheck = process.argv.includes("--recheck");
  // 남의 게시판이다. 1초에 한 번을 넘기지 않는다.
  const delay = arg("delay", 2000);
  const limit = arg("limit", Infinity);

  const todo = posts.filter(
    (p) =>
      !p.closedAt &&
      READABLE.includes(p.source) &&
      (recheck || !(`${p.source}:${p.externalId}` in book))
  );

  console.log(
    `읽을 수 있는 게시판의 모집 중 공고 ${todo.length}건 / 이미 읽은 것 ${Object.keys(book).length}건`
  );

  let found = 0;
  let blank = 0;
  let failed = 0;
  let done = 0;

  for (const post of todo) {
    if (done >= limit) break;
    done++;

    try {
      const html = await fetchText(post.url);
      // 여기서만 글자가 존재하고, 아래 readFromBody 를 지나면 사라진다.
      const entry = readFromBody(stripTags(html));
      if (entry.own || entry.accepts.length || entry.acceptsAll) {
        book[`${post.source}:${post.externalId}`] = entry;
        found++;
      } else {
        // 읽었는데 교단이 안 적혀 있던 것도 적어 둬야 다시 읽지 않는다.
        book[`${post.source}:${post.externalId}`] = { own: null, accepts: [], acceptsAll: false };
        blank++;
      }
    } catch (err) {
      failed++;
      if (failed <= 3) {
        console.error(`  ${post.url} — ${err instanceof Error ? err.message : String(err)}`);
      }
      // 한 곳이 연달아 막히면 더 두드리지 않는다.
      if (failed > 20 && failed > done / 2) {
        console.error("절반 넘게 실패해 멈춥니다. 게시판이 막았을 수 있습니다.");
        break;
      }
    }

    if (done % 20 === 0) process.stdout.write(`  ${done}/${todo.length}\r`);
    await sleep(delay);
  }

  const sorted = Object.fromEntries(Object.entries(book).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(OUT, JSON.stringify(sorted, null, 2) + "\n", "utf8");

  const withOwn = Object.values(sorted).filter((e) => e.own).length;
  const withAccepts = Object.values(sorted).filter((e) => e.accepts.length || e.acceptsAll).length;
  console.log(
    `\n교단 읽음 ${found}건 · 안 적혀 있음 ${blank}건 · 못 읽음 ${failed}건` +
      `\n모두 ${Object.keys(sorted).length}건 (소속 교단 ${withOwn} · 지원 가능 교단 ${withAccepts})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
