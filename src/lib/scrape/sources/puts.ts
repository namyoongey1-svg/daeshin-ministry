import { fetchText, stripTags } from "../html";
import { extractDepartments, findChurchIn, normalizePositions, parseDate } from "../normalize";
import { findPlaceIn } from "@/lib/region";
import type { ScrapedPost, SourceAdapter } from "../types";

const BASE = "https://www.puts.ac.kr/www/board";
const BOARD = "jangshin_jboard04";
const LIST = `${BASE}/list.general.asp?design=lounge&m1=4&m2=4&m3=1&bd_name=${BOARD}`;

/**
 * 장신대 초빙게시판.
 *
 * 여기만 robots.txt 가 `User-agent: * / Disallow: /` 다. 그래서 오래 넣지
 * 않고 있었다. 2026년 9월, 경건교육실(02-450-0756)에서 수집 허락을 받아
 * 넣는다. 허락이 없으면 다시 빼야 하는 곳이므로 까닭을 여기 적어 둔다.
 *
 * 허락을 받았어도 기계가 읽는 표시는 여전히 막혀 있으니, 다른 곳보다 느리게
 * 돈다. 한 쪽에 50건씩 실려 와 몇 번만 부르면 끝난다.
 *
 * 페이지가 EUC-KR 이다. 그대로 읽으면 글자가 전부 깨진다.
 *
 * 다른 곳보다 나은 점이 둘 있다.
 *
 * 하나, 작성자 칸이 "교회명/담임목사" 꼴이라 교회 이름을 제목에서 캐내지
 * 않아도 된다. 제목에서 캐면 "대전 전민새생명교회"의 "대전"까지 딸려 온다.
 *
 * 둘, 말머리가 초빙공고와 초빙완료로 나뉘어 있어 사람을 구했는지 알 수 있다.
 * 다른 게시판은 글이 사라지기 전까지 알 길이 없어, 이미 끝난 자리에 지원하는
 * 일이 생긴다. 초빙완료는 아예 담지 않는다 — 어제 담았던 글이 오늘 완료로
 * 바뀌면 수집분에서 빠지고, 그러면 마감으로 넘어간다.
 */
export const puts: SourceAdapter = {
  id: "puts",
  label: "장신대 초빙게시판",
  homepage: `${BASE}/list.general.asp?design=lounge&m1=4&m2=4&m3=1&bd_name=${BOARD}`,
  pageSize: 50,

  async fetchPage(page) {
    const html = await fetchText(`${LIST}&page=${page}&pagesize=50`, { encoding: "euc-kr" });
    const collectedAt = new Date().toISOString();
    const posts: ScrapedPost[] = [];

    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const seq = row.match(/view\.general\.asp\?seq=(\d+)/)?.[1];
      if (!seq) continue;

      // 운영진 공지는 글번호 자리에 "공지"가 들어간다. 청빙이 아니다.
      if (!/<span class="num">\s*\d+/.test(row)) continue;

      // 말머리. 초빙완료는 이미 사람을 구한 자리다.
      const tag = row.match(/class="grp"[^>]*>\s*([^<]+?)\s*</)?.[1];
      if (tag !== "초빙공고") continue;

      const title = readTitle(row);
      if (!title) continue;

      const writer = stripTags(row.match(/<span class="name">([\s\S]*?)<\/span>/)?.[1] ?? "");
      // 작성자 칸이 "대양교회/김성환" 이면 거기서, 학생이 대신 올려
      // "신학과/정은선" 이면 제목에서 찾는다.
      const church = churchFrom(writer) ?? findChurchIn(title);

      posts.push({
        source: "puts",
        externalId: seq,
        url: `${BASE}/view.general.asp?seq=${seq}&design=lounge&m1=4&m2=4&m3=1&bd_name=${BOARD}`,
        title,
        church,
        regionRaw: findPlaceIn(title),
        region: null,
        positions: normalizePositions([title]),
        departments: extractDepartments([title]),
        tagsRaw: [],
        postedAt: parseDate(stripTags(row.match(/<span class="date">([^<]*)<\/span>/)?.[1] ?? "")),
        deadline: null,
        deadlineText: null,
        collectedAt,
      });
    }

    return posts;
  },
};

/** 제목 칸에서 말머리와 새글 딱지를 걷어낸 알맹이. */
function readTitle(row: string): string {
  const cell = row.match(/<div class="tit">([\s\S]*?)<\/div>/)?.[1] ?? "";
  return stripTags(cell.replace(/<span[^>]*class="grp"[^>]*>[\s\S]*?<\/span>/, ""))
    // 다시 올린 글이라는 표시일 뿐 제목이 아니다. 대괄호로도 소괄호로도 쓴다.
    .replace(/^[[(]\s*끌어올림[^\])]{0,12}[\])]\s*/, "")
    .trim();
}

/**
 * "대양교회/김성환" 에서 교회 이름만.
 *
 * 학생이 대신 올리면 "신학과/정은선" 처럼 학과가 들어온다. 교회로 읽히는
 * 말일 때만 받고, 아니면 제목에서 찾게 넘긴다.
 */
function churchFrom(text: string): string | null {
  const head = text.split("/")[0]?.trim();
  if (!head) return null;
  const m = head.match(/([가-힣A-Za-z0-9·\s]{2,20}?(?:교회|선교회|기도원|복지관|신학교|수도원))\s*$/);
  return m ? m[1].trim() : null;
}
