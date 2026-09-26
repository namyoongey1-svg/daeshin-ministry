import { fetchText, stripTags } from "../html";
import { extractDepartments, findChurchIn, normalizePositions, parseDate } from "../normalize";
import { findPlaceIn } from "@/lib/region";
import type { ScrapedPost, SourceAdapter } from "../types";

// https 로는 응답하지 않는다. 이 게시판은 http 로만 열린다.
const BASE = "http://www.nambukmc.com/main/sub.html";
const BOARD = "www85";

/**
 * 기독교대한감리회 남부연회 사역자청빙게시판.
 *
 * robots.txt 가 `User-agent: * / Disallow: /` 이고 검색엔진 몇 곳만 예외다.
 * 2026년 9월 남부연회에서 수집 허락을 받아 넣는다. 감리교신학대에서 받은
 * 허락은 여기까지 덮지 않는다 — 학교와 연회는 다른 기관이라 따로 물었다.
 * 허락이 없으면 다시 빼야 하는 곳이라 까닭을 여기 적어 둔다.
 *
 * 글쓴이 칸은 암호화되어 base64 덩어리로 온다. 담당자 이름을 가리려는
 * 것이므로 읽으려 하지 않는다. 교회 이름은 제목에 들어 있어 그것으로 된다.
 *
 * 제목 앞 대괄호가 연회와 지방이다.
 *   "[남부/유성북] 대전시온성교회에서 함께할 사역자를 모십니다"
 * 지방 이름은 지역으로 쓰지 않는다. 지역은 제목 문장에서 찾는다 —
 * 위 글은 "유성북"이 아니라 "대전시온성교회"의 대전으로 잡혀야 맞다.
 */
export const nambu: SourceAdapter = {
  id: "nambu",
  label: "감리회 남부연회 사역자청빙",
  homepage: `${BASE}?pageCode=85`,
  pageSize: 15,

  async fetchPage(page) {
    const html = await fetchText(`${BASE}?pageCode=85&page=${page}`);
    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];
    const seen = new Set<string>();

    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const externalId = row.match(/[?&]num=(\d+)/)?.[1];
      if (!externalId || seen.has(externalId)) continue;

      // 번호 칸이 숫자가 아닌 행은 붙박이 안내글이다.
      const num = stripTags(row.match(/<td class="jNum">([\s\S]*?)<\/td>/)?.[1] ?? "");
      if (!/^\d+$/.test(num)) continue;

      const title = stripTags(row.match(/<a[^>]*[?&]num=\d+[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "")
        .replace(/^[[(]\s*끌어올림[^\])]{0,12}[\])]\s*/, "")
        .trim();
      if (!title) continue;
      seen.add(externalId);

      posts.push({
        source: "nambu",
        externalId,
        url: `${BASE}?Mode=view&boardID=${BOARD}&num=${externalId}`,
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

/**
 * 날짜.
 *
 * 제목 아래 잔글씨 줄에 "2026.09.01" 꼴로 붙는다. 그 줄에는 조회수도 함께
 * 있어, 날짜 모양인 것만 골라낸다.
 */
function readDate(row: string): string | null {
  return stripTags(row).match(/\b(\d{4}\.\d{1,2}\.\d{1,2})\b/)?.[1] ?? null;
}
