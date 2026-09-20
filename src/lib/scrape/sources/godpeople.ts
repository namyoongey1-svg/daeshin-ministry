import { fetchText, pick, pickAll, stripTags } from "../html";
import { extractDepartments, normalizePositions, normalizeRegion, parseDate } from "../normalize";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "https://recruit.godpeople.com";
const LIST = `${BASE}/ajax_file.php`;
const REFERER = `${BASE}/?GO=recruit_find`;
const PER_PAGE = 100;

/**
 * 갓피플취업 — 사역자 청빙공고.
 *
 * 목록 화면이 ajax_file.php로 HTML 조각을 받아 그리므로, 같은 요청을 그대로 쓴다.
 * 응답은 euc-kr이다.
 */
export const godpeople: SourceAdapter = {
  id: "godpeople",
  label: "갓피플취업",
  homepage: REFERER,
  pageSize: PER_PAGE,

  async fetchPage(page) {
    const body = new URLSearchParams({
      rc_mode: "recruit_find",
      rc_tab: "1",                 // 1 = 사역자 청빙
      rc_pgno: String(page),
      rc_lisu: String(PER_PAGE),
      total_kwrd: "",
      keyword: "",
      conditions: "",
      period: "",
      area: "",
    }).toString();

    const html = await fetchText(LIST, {
      method: "POST",
      body,
      encoding: "euc-kr",
      referer: REFERER,
    });

    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];

    for (const row of html.split(/<tr\b/i).slice(1)) {
      // 목록 사이에 끼는 광고 행에는 단체명 칸이 없다.
      const church = pick(row, /<td class="tplCname">([\s\S]*?)<\/td>/i);
      if (!church) continue;

      const idMatch = row.match(/<td id='([A-Za-z0-9]+)' class="tplTit/i);
      if (!idMatch) continue;
      const externalId = idMatch[1];

      // 화면의 글자는 말줄임표로 잘려 있고, title 속성에 전문이 들어 있다.
      const title =
        pick(row, /<a class="link" title="([^"]*)"/i) ??
        pick(row, /<a class="link"[^>]*>([\s\S]*?)<\/a>/i);
      if (!title) continue;

      const tags = pickAll(row, /<span class="cell">#?([^<]+)<\/span>/gi);
      const dates = pickAll(row, /<td class="date">\s*<span>([^<]*)<\/span>/gi);
      const regionRaw = pick(row, /<td class="tplCo">([\s\S]*?)<\/td>/i);
      const deadlineText = dates[1] ?? null;

      posts.push({
        source: "godpeople",
        externalId,
        url: `${BASE}/?GO=recruit_view&rc_idxx=${externalId}`,
        title: stripTags(title),
        church,
        regionRaw,
        region: normalizeRegion(regionRaw),
        positions: normalizePositions(tags),
        departments: extractDepartments(tags),
        tagsRaw: tags,
        postedAt: parseDate(dates[0]),
        deadline: parseDate(deadlineText),
        deadlineText,
        collectedAt,
      });
    }
    return posts;
  },
};
