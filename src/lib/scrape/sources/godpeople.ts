import { fetchText, pick, pickAll, stableId, stripTags } from "../html";
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
 *
 * 주의: 목록의 rc_idxx는 고정 글번호가 아니라 요청마다 새로 발급되는 토큰이다.
 * (같은 공고를 두 번 받으면 토큰이 서로 다르다.) 링크로는 계속 쓸 수 있지만
 * 식별자로는 못 쓰므로, 교회명과 제목으로 안정적인 id를 따로 만든다.
 */
export const godpeople: SourceAdapter = {
  id: "godpeople",
  label: "갓피플취업",
  homepage: REFERER,
  pageSize: PER_PAGE,
  activeListing: true,

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

      const tokenMatch = row.match(/<td id='([A-Za-z0-9]+)' class="tplTit/i);
      if (!tokenMatch) continue;
      const token = tokenMatch[1];

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
        externalId: stableId(church, title),
        url: `${BASE}/?GO=recruit_view&rc_idxx=${token}`,
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
