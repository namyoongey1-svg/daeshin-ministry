import { fetchText, stripTags } from "../html";
import { extractDepartments, findChurchIn, normalizePositions, parseDate } from "../normalize";
import { findPlaceIn } from "@/lib/region";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "https://www.kts.ac.kr/home/pinvit";

/**
 * 고려신학대학원 교역자초빙.
 *
 * robots.txt 가 아예 없어 막아 둔 것이 없다.
 *
 * 상세 주소가 `/home/pinvit/{글번호}` 로 목록에 그대로 박혀 있어, 글번호를
 * 따로 조립하지 않고 링크를 그대로 쓴다. 다만 목록의 번호 칸(11073)과
 * 주소의 번호(31643)가 다르므로, 주소 쪽을 글번호로 삼아야 같은 글을 두 번
 * 담지 않는다.
 *
 * 제목에 지역과 노회가 함께 오는 일이 많다.
 *   "울산 온양교회(울산남부노회)에서 부교역자를 정중히 모십니다"
 *   "경남(법통)노회 명곡교회에서 동역자를 모십니다"
 */
export const kosin: SourceAdapter = {
  id: "kosin",
  label: "고려신학대학원 교역자초빙",
  homepage: BASE,
  pageSize: 15,

  async fetchPage(page) {
    const html = await fetchText(`${BASE}?page=${page}`);
    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];
    const seen = new Set<string>();

    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      // 목록의 링크에는 `?page=1` 이 따라붙는다. 주소에서 그것을 떼고 쓴다.
      const link = row.match(/href="(https?:\/\/[^"?]*\/home\/pinvit\/(\d+))[^"]*"/);
      if (!link) continue;
      const [, url, externalId] = link;
      if (seen.has(externalId)) continue;

      // 번호 칸이 "공지"인 행은 안내글이다.
      const num = stripTags(row.match(/<td class="td_num2">([\s\S]*?)<\/td>/)?.[1] ?? "");
      if (!/^\d+$/.test(num)) continue;

      const title = stripTags(row.match(/<div class="bo_tit">([\s\S]*?)<\/div>/)?.[1] ?? "")
        // 목록에 붙는 새 글 표시가 제목에 섞여 들어온다.
        .replace(/\s*\bN\b\s*새글\s*/g, " ")
        .replace(/^[[(]\s*끌어올림[^\])]{0,12}[\])]\s*/, "")
        .trim();
      if (!title) continue;
      seen.add(externalId);

      posts.push({
        source: "kosin",
        externalId,
        url,
        title,
        church: findChurchIn(title),
        regionRaw: findPlaceIn(title),
        region: null,
        positions: normalizePositions([title]),
        departments: extractDepartments([title]),
        tagsRaw: [],
        postedAt: parseDate(stripTags(row.match(/<td class="td_datetime">([\s\S]*?)<\/td>/)?.[1] ?? "")),
        deadline: null,
        deadlineText: null,
        collectedAt,
      });
    }

    return posts;
  },
};
