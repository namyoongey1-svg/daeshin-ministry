import { fetchText, stripTags } from "../html";
import { extractDepartments, findChurchIn, normalizePositions, parseDate } from "../normalize";
import { findPlaceIn } from "@/lib/region";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "https://www.mtu.ac.kr/mtu/board";
const BOARD = 162;

/**
 * 감리교신학대학교 취업게시판.
 *
 * 이 학교는 robots.txt 를 읽을 수가 없다. /robots.txt 를 부르면 규칙 대신
 * "보안 정책에 의해 차단되었습니다"라는 안내가 온다. 무엇을 허락했는지 기계가
 * 알 길이 없어 한동안 넣지 않았다. 2026년 9월 학교에서 수집 허락을 받아
 * 넣는다. 허락이 없으면 다시 빼야 하는 곳이라 까닭을 여기 적어 둔다.
 *
 * 제목 앞 대괄호가 연회와 지방이다.
 *   "[서울/도봉] 영천감리교회에서 담임목사님을 모십니다"
 *   "[동부/철원서] 철원엘림교회에서 교육전도사님을 모십니다"
 * 지역으로 그대로 쓰지는 않는다. 앞쪽은 연회 이름이라 행정 구역과 다르고,
 * 뒤쪽 지방 이름에 지명이 섞여 있을 뿐이다. 지역은 다른 곳과 같이 제목
 * 문장에서 찾는다 — "철원엘림교회"의 철원이 그렇게 잡힌다.
 *
 * 취업게시판이라 이름은 넓지만 올라오는 것은 거의 교역자 청빙이다. 청빙이
 * 아닌 글은 직분이 하나도 안 잡혀 목록에서 자연히 아래로 밀린다.
 */
export const mtu: SourceAdapter = {
  id: "mtu",
  label: "감리교신학대 취업게시판",
  homepage: `${BASE}/list.do?mId=${BOARD}`,
  pageSize: 20,

  async fetchPage(page) {
    const html = await fetchText(`${BASE}/list.do?mId=${BOARD}&page=${page}`);
    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];
    const seen = new Set<string>();

    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const externalId = row.match(/brdIdx=(\d+)/)?.[1];
      if (!externalId || seen.has(externalId)) continue;

      // 번호 칸이 비어 있는 행은 맨 위에 붙박이로 걸린 안내글이다.
      const num = stripTags(row.match(/<td class="number">([\s\S]*?)<\/td>/)?.[1] ?? "");
      if (!/^\d+$/.test(num)) continue;

      const title = stripTags(row.match(/class="fn_btn_view"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "")
        .replace(/^[[(]\s*끌어올림[^\])]{0,12}[\])]\s*/, "")
        .trim();
      if (!title) continue;
      seen.add(externalId);

      posts.push({
        source: "mtu",
        externalId,
        url: `${BASE}/view.do?mId=${BOARD}&brdIdx=${externalId}`,
        title,
        church: findChurchIn(title),
        regionRaw: findPlaceIn(title),
        region: null,
        positions: normalizePositions([title]),
        departments: extractDepartments([title]),
        tagsRaw: [],
        postedAt: parseDate(stripTags(row.match(/<td class="date">([\s\S]*?)<\/td>/)?.[1] ?? "")),
        deadline: null,
        deadlineText: null,
        collectedAt,
      });
    }

    return posts;
  },
};
