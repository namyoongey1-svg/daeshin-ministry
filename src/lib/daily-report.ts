import type { JobListing } from "./scrape/listings";

/*
  하루치 청빙공고 분석글.

  스레드에 매일 아침 올린다. 수집이 끝난 뒤 "어제 올라온 공고"를 센다 —
  오늘 것은 아직 다 안 올라왔으니 세면 날마다 적게 나온다.

  교회 이름은 쓰지 않는다. 숫자만 쓴다. "재게시 17회" 같은 것을 교회 이름과
  함께 올리면 사람을 못 구하는 교회를 공개적으로 짚는 셈이 된다. 개별 공고는
  사이트에서 보면 된다.

  스레드는 한 글이 500자다. 넘치면 올라가지 않으므로, 뒤에서부터 덜 중요한
  줄을 뺀다.
*/

export interface DailyReport {
  /** "2026-10-02" */
  day: string;
  count: number;
  /** 지난주 같은 요일 */
  lastWeek: number;
  text: string;
}

const LIMIT = 500;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** 한국 날짜로 n일 전. 수집은 한국 아침 7시에 돈다. */
export function kstDay(offsetDays: number, now = Date.now()): string {
  return new Date(now + 9 * 3600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function tally<T>(items: T[], pick: (item: T) => string[] | string | null | undefined) {
  const map = new Map<string, number>();
  for (const item of items) {
    const raw = pick(item);
    const keys = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const key of keys) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map].sort((a, b) => b[1] - a[1]);
}

/** "예장 통합" → "통합". 스레드는 좁아서 짧게 쓴다. */
function shortDenomination(name: string): string {
  return name
    .replace(/^예장 /, "")
    .replace("기독교대한성결교회", "기성")
    .replace("예수교대한성결교회", "예성")
    .replace("기독교대한감리회", "감리회")
    .replace("기독교대한하나님의성회", "순복음")
    .replace("기독교한국침례회", "침례");
}

const join = (rows: [string, number][], n: number) =>
  rows.slice(0, n).map(([k, v]) => `${k} ${v}`).join(" · ");

/**
 * 어제 하루의 분석글을 만든다.
 *
 * listings 는 게시판끼리 묶고 재게시를 접은 뒤의 목록이어야 한다. 같은 자리를
 * 세 게시판에 올린 것을 셋으로 세면 숫자가 부풀려진다.
 */
export function buildDailyReport(
  listings: JobListing[],
  openTotal: number,
  now = Date.now()
): DailyReport {
  const day = kstDay(1, now);
  const weekAgo = kstDay(8, now);
  const posted = listings.filter((l) => l.postedAt === day);
  const lastWeek = listings.filter((l) => l.postedAt === weekAgo).length;

  const [, m, d] = day.split("-").map(Number);
  // 한국 정오로 잡으면 UTC 로도 같은 날이라 요일이 어긋나지 않는다.
  const weekday = WEEKDAY[new Date(`${day}T12:00:00+09:00`).getUTCDay()];

  const denoms = tally(posted, (l) => (l.denomination ? shortDenomination(l.denomination.name) : null));
  const regions = tally(posted, (l) => l.place.sido);
  const employment = tally(posted, (l) => l.employment);
  const departments = tally(posted, (l) => l.departments);
  const positions = tally(posted, (l) => l.positions);

  // 중요한 줄부터. 500자를 넘으면 아래에서부터 뺀다.
  const lines: (string | null)[] = [
    `${m}월 ${d}일(${weekday}) 올라온 청빙공고`,
    "",
    // 지난주와 견주는 줄은 넣지 않는다. 9월 말에 게시판을 넷에서 열로 늘려,
    // 늘어난 것이 공고가 아니라 출처인데 "지난주보다 +108"로 읽힌다. 틀린 말을
    // 공개적으로 하게 된다. 출처가 한동안 그대로 있으면 그때 다시 넣는다.
    `새 공고 ${posted.length}건`,
    "",
    denoms.length ? `교단  ${join(denoms, 5)}` : null,
    regions.length ? `지역  ${join(regions, 5)}` : null,
    employment.length ? `근무  ${join(employment, 4)}` : null,
    positions.length ? `직분  ${join(positions, 4)}` : null,
    departments.length ? `많이 찾는 부서  ${departments.slice(0, 3).map(([k]) => k).join(" · ")}` : null,
    "",
    `지금 모집 중 ${openTotal.toLocaleString("ko-KR")}건 · 게시판 열 곳을 매일 모읍니다`,
    "daeshin-ministry.vercel.app/jobs",
  ];

  // 빠져도 글이 되는 줄의 차례. 앞에 있을수록 먼저 뺀다.
  const droppable = [
    (l: string) => l.startsWith("많이 찾는 부서"),
    (l: string) => l.startsWith("직분"),
    (l: string) => l.startsWith("근무"),
  ];

  let body = lines.filter((l): l is string => l !== null);
  for (const drop of droppable) {
    if (body.join("\n").length <= LIMIT) break;
    body = body.filter((l) => !drop(l));
  }

  return { day, count: posted.length, lastWeek, text: body.join("\n") };
}
