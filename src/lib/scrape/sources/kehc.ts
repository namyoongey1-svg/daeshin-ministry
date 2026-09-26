import { fetchText, stripTags } from "../html";
import {
  extractDepartments,
  findChurchIn,
  normalizePositions,
  parseShortDate,
} from "../normalize";
import { findPlaceIn } from "@/lib/region";
import type { Position } from "@/lib/jobs";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "https://kehc.org/home";
const LIST = `${BASE}/job`;

/**
 * 기독교대한성결교회 총회 구인구직.
 *
 * robots.txt 가 /site_resource, /system, /uploads 만 막아 두어 게시판은 열려 있다.
 *
 * 다른 곳보다 나은 점이 둘 있다.
 *
 * 하나, 상태 칸이 따로 있어 아직 사람을 구하는 중인지 알 수 있다. 장신대의
 * 초빙공고·초빙완료와 같은 구실이다. 끝난 자리는 담지 않는다.
 *
 * 둘, 분류 칸에 직분이 적혀 있다. 제목에서 캐낼 때보다 정확하다 —
 * "목사님을 모십니다"라고 적힌 글이 실제로는 전도사 자리인 일이 있다.
 *
 * 상세 주소는 목록의 `read_post(27764)` 가 `/home/recruit/read_post/27764` 로
 * 간다. 게시판 이름(job)과 상세 주소(recruit)가 다르니 헷갈리기 쉽다.
 */
export const kehc: SourceAdapter = {
  id: "kehc",
  label: "기독교대한성결교회 총회 구인구직",
  homepage: LIST,
  pageSize: 48,

  async fetchPage(page) {
    /*
      쪽 넘김이 `?page=` 가 아니라 경로로 간다. `?page=2` 는 조용히 1쪽을
      그대로 돌려주어, 그대로 두면 48건에서 더 늘지 않는다.

      그리고 경로의 숫자는 쪽 번호가 아니라 건너뛸 행 수다. page/1 은 두 번째
      쪽이 아니라 한 건 밀린 목록이다. 공지 두 건은 어느 쪽에서나 맨 위에
      붙박이로 따라오므로, 실제로 넘어가는 것은 쪽마다 48건이다.
    */
    const html = await fetchText(`${BASE}/recruit/view_list/page/${(page - 1) * 48}`);
    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];
    const seen = new Set<string>();

    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const externalId = row.match(/read_post\((\d+)\)/)?.[1];
      if (!externalId || seen.has(externalId)) continue;

      const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? []).map((c) => stripTags(c));
      // 번호 · 상태 · 분류 · 제목 · 작성자 · 날짜 · 조회
      if (cells.length < 6) continue;
      // 번호 칸이 "공지"인 행은 안내글이다.
      if (!/^\d+$/.test(cells[0])) continue;
      // 이미 사람을 구한 자리는 담지 않는다.
      if (cells[1] !== "진행중") continue;

      const title = stripTags(row.match(/<a[^>]*read_post\(\d+\)[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "")
        .replace(/^[[(]\s*끌어올림[^\])]{0,12}[\])]\s*/, "")
        .trim();
      if (!title) continue;
      seen.add(externalId);

      posts.push({
        source: "kehc",
        externalId,
        url: `${BASE}/recruit/read_post/${externalId}`,
        title,
        church: findChurchIn(title),
        regionRaw: findPlaceIn(title),
        region: null,
        // 분류 칸을 제목보다 앞에 둔다. 적어 둔 값이 캐낸 값보다 믿을 만하다.
        positions: mergePositions(cells[2], title),
        departments: extractDepartments([title]),
        tagsRaw: cells[2] ? [cells[2]] : [],
        postedAt: parseShortDate(cells[5]),
        deadline: null,
        deadlineText: null,
        collectedAt,
      });
    }

    return posts;
  },
};

/**
 * 분류 칸과 제목에서 읽은 직분을 합친다.
 *
 * 분류는 "목사"처럼 한 낱말이라 우리 직분 이름과 바로 맞지 않는다.
 * 담임인지 부교역자인지는 제목을 봐야 알 수 있어, 둘을 함께 쓴다.
 */
function mergePositions(category: string, title: string): Position[] {
  const fromTitle = normalizePositions([title]);
  const fromCategory = normalizePositions([category]);
  return [...new Set([...fromTitle, ...fromCategory])];
}
