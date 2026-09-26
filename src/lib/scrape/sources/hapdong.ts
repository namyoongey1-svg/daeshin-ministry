import { fetchText, stripTags } from "../html";
import { extractDepartments, findChurchIn, normalizePositions, parseDate } from "../normalize";
import { findPlaceIn } from "@/lib/region";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "https://www.hapdong.ac.kr/bbs/board.php";
const BOARD = "e03";

/**
 * 합동신학대학원대학교 교역자초빙.
 *
 * robots.txt 가 빈 파일이라 막아 둔 것이 없다.
 *
 * 총신대와 같은 그누보드지만 화면 살이 달라 행을 직접 읽는다. 총신대 쪽은
 * `td.mw_basic_list_subject` 로 끊는데 여기는 그 클래스가 없다.
 *
 * 제목에 노회가 자주 들어간다.
 *   "전남노회(합신) 장항갈보리교회에서 담임목사를 청빙합니다"
 *   "[끌어올림] 동서울노회에 속한 이음교회에서 동역자를 초빙합니다"
 * 노회 이름은 지역을 짐작하게 해 주지만 그대로 믿지는 않는다 — 노회 구역과
 * 교회 소재지가 늘 같지는 않다. 지역은 다른 곳과 같이 제목에서 찾는다.
 */
export const hapdong: SourceAdapter = {
  id: "hapdong",
  label: "합동신학대학원 교역자초빙",
  homepage: `${BASE}?bo_table=${BOARD}`,
  pageSize: 15,

  async fetchPage(page) {
    const html = await fetchText(`${BASE}?bo_table=${BOARD}&page=${page}`);
    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];
    const seen = new Set<string>();

    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const externalId = row.match(/wr_id=(\d+)/)?.[1];
      if (!externalId || seen.has(externalId)) continue;

      // 글번호 칸이 숫자가 아닌 행은 공지다. 청빙이 아니다.
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [];
      if (cells.length < 3) continue;
      if (!/^\d+$/.test(stripTags(cells[0] ?? ""))) continue;

      const title = readTitle(row);
      if (!title) continue;
      seen.add(externalId);

      posts.push({
        source: "hapdong",
        externalId,
        url: `${BASE}?bo_table=${BOARD}&wr_id=${externalId}`,
        title,
        church: findChurchIn(title),
        regionRaw: findPlaceIn(title),
        region: null,
        positions: normalizePositions([title]),
        departments: extractDepartments([title]),
        tagsRaw: [],
        postedAt: parseDate(readDate(row)),
        deadline: null,
        deadlineText: null,
        collectedAt,
      });
    }

    return posts;
  },
};

/** 제목 칸의 알맹이. 다시 올렸다는 표시는 제목이 아니라 걷어낸다. */
function readTitle(row: string): string {
  const link = row.match(/<a[^>]*wr_id=\d+[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "";
  return stripTags(link)
    .replace(/^[[(]\s*끌어올림[^\])]{0,12}[\])]\s*/, "")
    .trim();
}

/**
 * 날짜 칸.
 *
 * 올해 글은 "09.26", 지난해 글은 "2025.09.26" 처럼 적힌다. 둘 다 parseDate 가
 * 읽으므로 모양만 골라 넘긴다.
 */
function readDate(row: string): string | null {
  const text = stripTags(row);
  return text.match(/\b(\d{4}\.\d{1,2}\.\d{1,2}|\d{1,2}\.\d{1,2})\b/)?.[1] ?? null;
}
