/**
 * 외부 청빙게시판에서 공고 정보를 모은다.
 *
 *   npm run scrape                    -- 세 곳 모두, 새 글이 없으면 멈춤
 *   npm run scrape -- godpeople       -- 한 곳만
 *   npm run scrape -- --pages 10      -- 페이지 수 지정
 *   npm run scrape -- --full          -- 아는 글이어도 끝까지 훑음
 *   npm run scrape -- --delay 2000    -- 요청 간격(ms)
 *   npm run scrape -- --prune 12      -- 12개월보다 오래된 공고는 버림
 *
 * 모으는 것은 교회명·지역·직분·마감일 같은 사실 정보와 원문 링크뿐이다.
 * 게시물 본문과 담당자 연락처는 가져오지 않는다.
 */
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ADAPTERS, adapterFor, collect, keyOf, markClosed, mergePosts } from "@/lib/scrape";
import type { ScrapedPost } from "@/lib/scrape/types";

const OUT_DIR = path.join(process.cwd(), "src", "data", "scraped");
const OUT_FILE = path.join(OUT_DIR, "posts.json");

/** 값을 받는 플래그 — 뒤따라오는 인자는 출처 이름이 아니다. */
const VALUE_FLAGS = new Set(["pages", "delay", "prune"]);

interface Args {
  names: string[];
  flags: Set<string>;
  values: Map<string, string>;
}

function parseArgs(argv: string[]): Args {
  const names: string[] = [];
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      names.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (VALUE_FLAGS.has(name)) {
      values.set(name, argv[++i] ?? "");
    } else {
      flags.add(name);
    }
  }
  return { names, flags, values };
}

function numeric(args: Args, name: string, fallback: number): number {
  const value = Number(args.values.get(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * 매일 돌리면 파일이 한없이 커지고 마감된 공고가 쌓인다.
 * 게시일이 너무 오래된 건은 떨어낸다. 게시일을 못 읽은 건은 수집일로 판단한다.
 */
function prune(posts: ScrapedPost[], months: number, now = new Date()): ScrapedPost[] {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const limit = cutoff.toISOString().slice(0, 10);
  return posts.filter((p) => (p.postedAt ?? p.collectedAt.slice(0, 10)) >= limit);
}

async function loadExisting(): Promise<ScrapedPost[]> {
  try {
    return JSON.parse(await readFile(OUT_FILE, "utf8")) as ScrapedPost[];
  } catch {
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const full = args.flags.has("full");
  const maxPages = numeric(args, "pages", full ? 200 : 5);
  const delayMs = numeric(args, "delay", 1200);

  const targets = args.names.length
    ? args.names.map((name) => {
        const adapter = adapterFor(name);
        if (!adapter) {
          throw new Error(
            `알 수 없는 출처: ${name} (가능: ${ADAPTERS.map((a) => a.id).join(", ")})`
          );
        }
        return adapter;
      })
    : ADAPTERS;

  const existing = await loadExisting();
  const known = new Set(existing.map(keyOf));
  let addedCount = 0;
  console.log(`기존 ${existing.length}건 / 대상 ${targets.map((t) => t.label).join(", ")}\n`);

  let merged = existing;
  const failures: { label: string; error: string }[] = [];

  for (const adapter of targets) {
    console.log(`▸ ${adapter.label}`);
    const result = await collect(adapter, {
      maxPages,
      delayMs,
      stopWhenKnown: !full,
      known,
      onProgress: (m) => console.log(m),
    });

    if (result.error) {
      failures.push({ label: adapter.label, error: result.error });
      console.error(`  실패: ${result.error}`);
      continue;
    }

    const fresh = result.posts.filter((p) => !known.has(keyOf(p))).length;
    addedCount += fresh;
    merged = mergePosts(merged, result.posts);
    console.log(`  ${result.pages}쪽에서 ${result.fetched}건 확인, 새 글 ${fresh}건`);

    // 모집 중인 목록을 끝까지 본 경우에만, 목록에서 빠진 공고를 마감으로 본다.
    if (result.completed && adapter.activeListing) {
      const seenIds = new Set(result.posts.map((p) => p.externalId));
      const marked = markClosed(merged, adapter.id, seenIds);
      merged = marked.posts;
      if (marked.closed) console.log(`  목록에서 내려간 ${marked.closed}건을 마감 처리`);
    }
    console.log();
  }

  const pruneMonths = numeric(args, "prune", 0);
  if (pruneMonths > 0) {
    const before = merged.length;
    merged = prune(merged, pruneMonths);
    const dropped = before - merged.length;
    if (dropped) console.log(`${pruneMonths}개월 지난 공고 ${dropped}건 정리
`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(merged, null, 2));

  console.log(
    `저장: ${path.relative(process.cwd(), OUT_FILE)} — 전체 ${merged.length}건 (신규 ${addedCount}건)`
  );

  for (const adapter of ADAPTERS) {
    const count = merged.filter((p) => p.source === adapter.id).length;
    if (count) console.log(`  ${adapter.label}: ${count}건`);
  }

  await reportFailures(failures, targets.length);

  // 한 곳이 안 되는 날은 나머지 두 곳 수집분이 남는다. 그날치가 통째로 없는
  // 경우에만 실패로 본다. 한 곳이 흔들릴 때마다 메일이 오면 정작 다 끊긴 날을
  // 놓치게 된다. 어디가 왜 안 됐는지는 아래 요약에 적어 둔다.
  if (failures.length === targets.length) process.exitCode = 1;
}

/**
 * 어느 곳이 왜 안 됐는지를 실행 요약에 적는다.
 *
 * 이유가 로그 안에만 있으면 알림 메일은 "실패했음"까지만 알려 주고, 로그는
 * 로그인해야 열린다. 요약은 실행 페이지에 그대로 붙어 누구나 볼 수 있다.
 * GitHub Actions 밖에서 돌릴 때는 이 변수가 없으므로 아무것도 하지 않는다.
 */
async function reportFailures(
  failures: { label: string; error: string }[],
  total: number
): Promise<void> {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile || failures.length === 0) return;

  const lines = [
    failures.length === total
      ? "### 수집한 곳이 한 곳도 없습니다"
      : `### ${failures.length}곳이 실패했습니다 (나머지 ${total - failures.length}곳은 받았습니다)`,
    "",
    "| 출처 | 이유 |",
    "| --- | --- |",
    // 막대는 표의 칸 구분자라 그대로 두면 줄이 깨진다.
    ...failures.map((f) => `| ${f.label} | ${f.error.replaceAll("|", "\\|")} |`),
    "",
  ];
  await appendFile(summaryFile, lines.join("\n") + "\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
