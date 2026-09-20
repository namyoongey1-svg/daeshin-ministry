import { fetchText, pick, stripTags } from "../html";
import {
  extractDepartments,
  normalizePositions,
  normalizeRegion,
  parseDate,
  splitBracket,
} from "../normalize";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "http://aats.kr/main/bbs/board.php";
const BOARD = "b05";

/**
 * 총신대학교 신학대학원 총동창회 '동역자 구함'.
 *
 * 그누보드 기반이고 본문은 utf-8이다. 게시글이 많지 않아 몇 페이지면 전부 훑는다.
 * 제목에 "[지역]" 표기가 없어, 제목 문장 자체에서 지역과 직분을 찾아본다.
 * ("찬양사역및 청년부 사역자를 구합니다" 처럼 제목이 문장으로 적혀 있다.)
 */
export const aats: SourceAdapter = {
  id: "aats",
  label: "총신대 신대원 총동창회",
  homepage: `${BASE}?bo_table=${BOARD}`,
  pageSize: 15,

  async fetchPage(page) {
    const html = await fetchText(`${BASE}?bo_table=${BOARD}&page=${page}`);

    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];
    const seen = new Set<string>();

    for (const cell of html.split(/<td class="mw_basic_list_subject/i).slice(1)) {
      const idMatch = cell.match(/wr_id=(\d+)/);
      if (!idMatch) continue;
      const externalId = idMatch[1];
      if (seen.has(externalId)) continue;
      seen.add(externalId);

      const rawTitle = pick(cell, /<span class='media-list-subject'>([\s\S]*?)<\/span>/i);
      if (!rawTitle) continue;
      const title = stripTags(rawTitle);
      if (!title) continue;

      // 날짜는 시계 아이콘 뒤에 "07-01" 꼴로 붙는다.
      const posted = pick(cell, /fa-clock-o'><\/i>\s*([0-9]{1,2}-[0-9]{1,2})/i);
      const { bracket, rest } = splitBracket(title);

      posts.push({
        source: "aats",
        externalId,
        url: `${BASE}?bo_table=${BOARD}&wr_id=${externalId}`,
        title,
        church: bracket ? rest || null : null,
        regionRaw: bracket,
        region: normalizeRegion(bracket ?? title),
        positions: normalizePositions([title]),
        departments: extractDepartments([title]),
        tagsRaw: [],
        postedAt: parseDate(posted),
        deadline: null,
        deadlineText: null,
        collectedAt,
      });
    }
    return posts;
  },
};
