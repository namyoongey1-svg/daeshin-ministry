import { fetchText, stripTags } from "../html";
import { extractDepartments, normalizePositions, parseDate } from "../normalize";
import { findPlaceIn } from "@/lib/region";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "https://minitries.co.kr";
/** 부교역자 청빙 게시판. q 는 이 게시판의 목록 상태를 담은 값이다. */
const LIST = `${BASE}/index/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9`;

/**
 * 청빙넷 부교역자 청빙 게시판.
 *
 * robots.txt 가 `Allow: /` 이고 sitemap 도 내어 주는 곳이라 수집이 막혀 있지 않다.
 * 게시판이 서버에서 그대로 내려와 목록만 읽으면 된다.
 *
 * 다른 곳과 달리 지역·직분 꼬리표가 없고 전부 제목 한 줄에 들어 있다.
 *   "대전 전민새생명교회 부교역자 초빙 (전임사역자)"
 *   "노원구 중계동에서 교육목사 또는 교육전도사님 초빙합니다"
 *   "호주에 있는 퍼스우리교회에서 전임 사역지를 구합니다"
 * 그래서 제목에서 교회명과 지역을 읽어 낸다. 지역은 저장하지 않고 원문만
 * 넘긴다 — 나누는 규칙은 화면에서 한 곳(region.ts)이 맡는다.
 */
export const minitries: SourceAdapter = {
  id: "minitries",
  label: "청빙넷 부교역자 청빙",
  homepage: `${BASE}/index`,
  pageSize: 20,

  async fetchPage(page) {
    const html = await fetchText(`${LIST}&page=${page}`);
    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];

    // 한 글이 ul.li_body 한 덩어리다.
    for (const block of html.split(/<ul[^>]*class="[^"]*li_body/i).slice(1)) {
      const idx = block.match(/[?&]idx=(\d+)/)?.[1];
      if (!idx) continue;

      const title = stripTags(cell(block, "tit")).replace(/\s*\bN\b\s*$/, "").trim();
      if (!title) continue;

      // 관리자 공지는 청빙이 아니다.
      const writer = stripTags(cell(block, "name"));
      if (writer === "관리자") continue;

      const church = findChurch(title);
      const regionRaw = findPlaceIn(title);

      posts.push({
        source: "minitries",
        externalId: idx,
        url: `${LIST}&bmode=view&idx=${idx}&t=board`,
        title,
        church,
        regionRaw,
        region: null,
        positions: normalizePositions([title]),
        departments: extractDepartments([title]),
        tagsRaw: [],
        postedAt: parseDate(stripTags(cell(block, "time"))),
        deadline: null,
        deadlineText: null,
        collectedAt,
      });
    }
    return posts;
  },
};

/** class 이름이 정확히 그 칸인 li 의 속을 꺼낸다. */
function cell(block: string, name: string): string {
  const re = new RegExp(`<li[^>]*class="[^"]*\\b${name}\\b[^"]*"[^>]*>([\\s\\S]*?)</li>`, "i");
  return block.match(re)?.[1] ?? "";
}

/**
 * 제목에서 교회 이름을 찾는다.
 *
 * "○○교회"가 가장 흔하고, 선교회·기도원·복지관도 올라온다. 앞에 붙은 지역
 * 이름까지 삼키지 않도록 교회 이름에 흔히 쓰는 글자만 거슬러 올라간다.
 */
function findChurch(title: string): string | null {
  const m = title.match(/([가-힣A-Za-z0-9·\s]{1,18}?(?:교회|선교회|기도원|복지관|선교단체|신학교))/);
  if (!m) return null;
  // "대전 전민새생명교회" 처럼 앞에 지역이 붙어 오면 떼어 낸다.
  const name = m[1].trim().split(/\s+/).pop() ?? "";
  return name.length >= 3 ? name : m[1].trim();
}

