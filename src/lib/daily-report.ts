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

  // 첫 줄은 표 제목이 아니라 그날의 발견 한 줄이다. 스레드에서 반응을 얻는
  // 글은 "청빙광고에서 AI 구독료 항목을 발견했다" 같은 한 가지 이야기로
  // 시작한다. 숫자 표로 시작하면 넘겨 버린다.
  const hook = pickFinding(dailyFindings(posted), dayIndex(day));

  const lines: (string | null)[] = [
    hook,
    hook ? "" : null,
    // 지난주와 견주는 줄은 넣지 않는다. 9월 말에 게시판을 넷에서 열로 늘려,
    // 늘어난 것이 공고가 아니라 출처인데 "지난주보다 +108"로 읽힌다. 틀린 말을
    // 공개적으로 하게 된다. 출처가 한동안 그대로 있으면 그때 다시 넣는다.
    `${m}월 ${d}일(${weekday}) 청빙공고 ${posted.length}건`,
    denoms.length ? `교단  ${join(denoms, 5)}` : null,
    regions.length ? `지역  ${join(regions, 5)}` : null,
    employment.length ? `근무  ${join(employment, 4)}` : null,
    positions.length ? `직분  ${join(positions, 4)}` : null,
    departments.length ? `많이 찾는 부서  ${departments.slice(0, 3).map(([k]) => k).join(" · ")}` : null,
    "",
    // 끝에 질문을 둔다. 답글이 달려야 더 많은 사람에게 보인다. 같은 질문이
    // 이어지지 않게 날짜로 돌려 쓴다.
    DAILY_QUESTIONS[dayIndex(day) % DAILY_QUESTIONS.length],
    "",
    `지금 모집 중 ${openTotal.toLocaleString("ko-KR")}건, 게시판 열 곳을 매일 모읍니다`,
    "daeshin-ministry.vercel.app/jobs",
  ];

  return {
    day,
    count: posted.length,
    lastWeek,
    // 빠져도 글이 되는 줄의 차례. 앞에 있을수록 먼저 뺀다.
    text: fit(lines, ["많이 찾는 부서", "직분", "근무"]),
  };
}

/* ------------------------------------------------------------ 발견과 질문

  첫 줄에 쓸 "발견"은 그날 데이터에서 참인 것만 고른다. 작은 숫자로 큰 말을
  하지 않으려고 공고가 열 건 미만이면 아무것도 고르지 않는다.

  교단 비율은 발견으로 쓰지 않는다. 통합이 많은 것은 장신대 게시판이 커서이지
  통합 교회가 사람을 많이 찾아서가 아니다. 우리 수집 범위를 시장인 것처럼
  말하게 된다.
*/

const CAPITAL = new Set(["서울", "경기", "인천"]);

/** 날짜를 숫자로. 같은 문장이 이어지지 않게 돌리는 데만 쓴다. */
function dayIndex(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

function pickFinding(findings: string[], seed: number): string | null {
  return findings.length ? findings[seed % findings.length] : null;
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

function dailyFindings(posted: JobListing[]): string[] {
  const n = posted.length;
  if (n < 10) return [];
  const out: string[] = [];

  const capital = posted.filter((l) => l.place.sido && CAPITAL.has(l.place.sido)).length;
  if (pct(capital, n) >= 40) {
    out.push(`어제 올라온 청빙공고 ${n}건 가운데 ${capital}건(${pct(capital, n)}%)이 수도권이었습니다.`);
  }

  const part = posted.filter((l) => l.employment === "파트").length;
  const full = posted.filter((l) => l.employment === "전임").length;
  if (part >= 3 && full >= 3) {
    out.push(
      part > full
        ? `어제는 파트 자리가 ${part}건으로 전임(${full}건)보다 많았습니다.`
        : `어제 전임 자리가 ${full}건 올라왔습니다. 파트(${part}건)보다 많은 날입니다.`
    );
  }

  const worship = posted.filter((l) => l.positions.includes("찬양사역자")).length;
  if (worship >= 5) out.push(`어제 찬양사역자를 찾는 공고가 ${worship}건 있었습니다.`);

  const [topDept] = tally(posted, (l) => l.departments);
  if (topDept && topDept[1] >= 3) {
    out.push(`어제 가장 많이 찾은 부서는 ${topDept[0]}였습니다. ${topDept[1]}건입니다.`);
  }

  const abroad = posted.filter((l) => l.place.sido === "해외").length;
  if (abroad >= 2) out.push(`어제는 해외 교회 공고도 ${abroad}건 올라왔습니다.`);

  return out;
}

/**
 * 끝에 붙이는 질문. 정답이 있는 질문이 아니라 각자 겪은 이야기를 꺼내게 하는
 * 질문이어야 답글이 달린다. 사실을 단정하는 문장은 넣지 않는다 — 데이터와
 * 어긋나면 틀린 말을 하게 된다.
 */
const DAILY_QUESTIONS = [
  "청빙공고 볼 때 제일 먼저 확인하시는 게 뭐예요?",
  "지금 자리 찾고 계신 분들은 어느 지역을 보고 계세요?",
  "파트로 사역하시는 분들, 한 주에 몇 시간쯤 쓰시나요?",
  "교단이 다른 교회에 지원해 보신 적 있으세요?",
  "청빙공고에 꼭 들어갔으면 하는 항목이 있다면요?",
  "처음 사역지는 어떻게 구하셨어요?",
  "중고등부 자리가 늘 많은데, 왜 그렇다고 보세요?",
];

const WEEKLY_QUESTIONS = [
  "지난주에 지원서 내신 분 계세요? 어떤 자리였는지 궁금합니다.",
  "자리를 고를 때 사례·지역·교단 가운데 무엇을 먼저 보세요?",
  "청빙 과정에서 가장 힘들었던 순간은 언제였어요?",
  "면접에서 받은 질문 중 기억에 남는 게 있으세요?",
];

/** 500자에 맞춘다. 넘치면 droppable 에 적은 줄을 앞에서부터 하나씩 뺀다. */
function fit(lines: (string | null)[], droppable: string[]): string {
  let body = lines.filter((l): l is string => l !== null);
  for (const prefix of droppable) {
    if (body.join("\n").length <= LIMIT) break;
    body = body.filter((l) => !l.startsWith(prefix));
  }
  return body.join("\n");
}

/* ----------------------------------------------------------------- 주간 요약

  월요일 아침에 지난주(월~일)를 묶어 한 편 더 올린다.

  일간 글은 하루치라 요일 탓에 출렁인다. 금요일엔 많고 일요일엔 거의 없다.
  한 주를 묶어 보아야 어느 교단·지역에서 사람을 많이 찾는지가 보인다.

  일간 글에 없는 것 둘을 더 센다.

  하나, 그 주에 올라온 공고 가운데 벌써 마감된 것. 금방 사람을 구했을 가능성이 크다.
  둘, 세 번 넘게 다시 올라온 공고. 아직 사람을 못 구했을 가능성이 크다.
  둘 다 수만 쓰고 교회 이름은 쓰지 않는다.

  지난주와 견주는 줄은 일간 글과 같은 까닭으로 넣지 않는다.
*/

export interface WeeklyReport {
  /** 월요일 날짜. 같은 주를 두 번 올리지 않는 데 쓴다. */
  weekStart: string;
  weekEnd: string;
  count: number;
  text: string;
}

/** 지금이 한국 시각으로 월요일인가 */
export function isKstMonday(now = Date.now()): boolean {
  return new Date(now + 9 * 3600_000).getUTCDay() === 1;
}

export function buildWeeklyReport(
  listings: JobListing[],
  openTotal: number,
  now = Date.now()
): WeeklyReport {
  // 월요일 아침에 돌므로 어제(일요일)가 끝, 일주일 전(월요일)이 시작이다.
  // 다른 요일에 돌려도 "어제까지 이레"를 센다 — 손으로 시험할 때 쓴다.
  const weekEnd = kstDay(1, now);
  const weekStart = kstDay(7, now);
  const days = Array.from({ length: 7 }, (_, i) => kstDay(7 - i, now));

  const posted = listings.filter((l) => l.postedAt && l.postedAt >= weekStart && l.postedAt <= weekEnd);
  const closed = posted.filter((l) => l.closedAt).length;
  const reposted = posted.filter((l) => l.repostCount >= 3).length;

  const perDay = days.map((day) => ({
    day,
    n: posted.filter((l) => l.postedAt === day).length,
  }));
  const busiest = perDay.reduce((a, b) => (b.n > a.n ? b : a));
  const weekdayOf = (day: string) => WEEKDAY[new Date(`${day}T12:00:00+09:00`).getUTCDay()];
  const md = (day: string) => {
    const [, m, d] = day.split("-").map(Number);
    return `${m}/${d}`;
  };

  const denoms = tally(posted, (l) => (l.denomination ? shortDenomination(l.denomination.name) : null));
  const regions = tally(posted, (l) => l.place.sido);
  const employment = tally(posted, (l) => l.employment);
  const positions = tally(posted, (l) => l.positions);
  const departments = tally(posted, (l) => l.departments);

  const weekSeed = dayIndex(weekStart) / 7;
  const weekFindings = [
    busiest.n ? `지난주 청빙공고 ${posted.length}건을 세어 보니 ${weekdayOf(busiest.day)}요일에 가장 많이 올라왔습니다.` : null,
    reposted >= 10
      ? `지난주 공고 ${posted.length}건 가운데 ${reposted}건은 세 번 넘게 다시 올라왔습니다.`
      : null,
    ...(posted.length >= 10
      ? (() => {
          const capital = posted.filter((l) => l.place.sido && CAPITAL.has(l.place.sido)).length;
          return pct(capital, posted.length) >= 40
            ? [`지난주 청빙공고의 ${pct(capital, posted.length)}%가 수도권 교회였습니다.`]
            : [];
        })()
      : []),
  ].filter((x): x is string => Boolean(x));
  const weekHook = pickFinding(weekFindings, Math.floor(weekSeed));

  const lines: (string | null)[] = [
    weekHook,
    weekHook ? "" : null,
    `지난주 청빙공고 요약 (${md(weekStart)}~${md(weekEnd)})`,
    `새 공고 ${posted.length}건 · 하루 평균 ${Math.round(posted.length / 7)}건`,
    busiest.n ? `가장 많이 올라온 날  ${weekdayOf(busiest.day)}요일 ${busiest.n}건` : null,
    "",
    denoms.length ? `교단  ${join(denoms, 6)}` : null,
    regions.length ? `지역  ${join(regions, 6)}` : null,
    employment.length ? `근무  ${join(employment, 4)}` : null,
    positions.length ? `직분  ${join(positions, 4)}` : null,
    departments.length ? `많이 찾는 부서  ${departments.slice(0, 4).map(([k]) => k).join(" · ")}` : null,
    "",
    // "구한 자리입니다"라고 단정하지 않는다. 마감은 게시판에서 글이 사라졌다는
    // 뜻일 뿐이라, 글쓴이가 그냥 지웠을 수도 있다.
    closed ? `벌써 마감된 공고 ${closed}건 — 금방 사람을 구했을 가능성이 큽니다` : null,
    reposted ? `세 번 넘게 다시 올라온 공고 ${reposted}건 — 아직 찾는 중일 가능성이 큽니다` : null,
    closed || reposted ? "" : null,
    WEEKLY_QUESTIONS[Math.floor(weekSeed) % WEEKLY_QUESTIONS.length],
    "",
    `지금 모집 중 ${openTotal.toLocaleString("ko-KR")}건`,
    "daeshin-ministry.vercel.app/jobs",
  ];

  return {
    weekStart,
    weekEnd,
    count: posted.length,
    text: fit(lines, ["많이 찾는 부서", "가장 많이 올라온 날", "직분", "근무", "벌써 마감된"]),
  };
}
