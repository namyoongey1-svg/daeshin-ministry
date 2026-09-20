import { fetchText, pick, pickAll, stripTags } from "../html";
import { normalizeRegion, parseDate, splitBracket } from "../normalize";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "https://www.bu.ac.kr";
const LIST = `${BASE}/bbs/graduateschool/1110/artclList.do`;
const VIEW = (id: string) => `${BASE}/bbs/graduateschool/1110/${id}/artclView.do`;

/** 목록 칸에 섞여 들어오는 안내 문구 — 제목에서 걷어낸다. */
const NOISE = /새글|첨부파일이\s*\d+\s*개\s*있음/g;

/**
 * 백석대학교 신학대학원 정보나눔터 — 교목실이 올리는 사역자 청빙.
 *
 * 제목이 "[서울시 용산구] 두란노서원" 꼴이라 지역과 교회명이 그대로 나뉜다.
 * 직분은 본문에만 있어 수집하지 않는다(본문은 원문 링크로 본다).
 */
export const baekseok: SourceAdapter = {
  id: "baekseok",
  label: "백석대 신대원 정보나눔터",
  homepage: `${BASE}/graduateschool/3938/subview.do`,
  pageSize: 15,

  async fetchPage(page) {
    const html = await fetchText(`${LIST}?page=${page}`);
    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];

    for (const row of html.split(/<tr\b/i).slice(1)) {
      // 상단 고정 공지는 청빙이 아니다.
      if (/_artclNotice/i.test(row)) continue;

      const idMatch = row.match(/jf_viewArtcl\([^)]*'(\d+)'\s*\)/i);
      if (!idMatch) continue;
      const externalId = idMatch[1];

      const rawTitle = pick(row, /class="artclLinkView"[^>]*>([\s\S]*?)<\/a>/i);
      if (!rawTitle) continue;
      const title = stripTags(rawTitle.replace(NOISE, ""));
      if (!title) continue;

      const { bracket, rest } = splitBracket(title);
      const dates = pickAll(row, /class="_artclTdRdate"[^>]*>([^<]*)</gi);

      posts.push({
        source: "baekseok",
        externalId,
        url: VIEW(externalId),
        title,
        church: rest || null,
        regionRaw: bracket,
        region: normalizeRegion(bracket),
        positions: [],
        departments: [],
        tagsRaw: [],
        postedAt: parseDate(dates[0]),
        deadline: null,
        deadlineText: null,
        collectedAt,
      });
    }
    return posts;
  },
};
