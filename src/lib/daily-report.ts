import type { JobListing } from "./scrape/listings";

/*
  매일 아침 스레드에 올리는 글.

  글은 두 가지다.

  숫자 글 — 화·목요일. 어제 올라온 청빙공고를 센다. 오늘 것은 아직 다 안
  올라왔으니 세면 날마다 적게 나온다. 월요일에는 주간 요약이 따로 나간다.

  이야기 글 — 나머지 요일. 숫자 없이 사역자가 실제로 겪는 장면 하나를 묻는다.
  날마다 같은 틀의 숫자 표가 올라오면 사람이 아니라 봇처럼 읽힌다. 계정에서
  반응이 있었던 글은 운영자가 직접 쓴 자기소개 글이었고, 숫자 글에는 답글이
  거의 없었다(2026-10-11 확인).

  두 글 모두 질문이 첫 줄이다. 숫자는 질문의 근거로 뒤에 붙는다.

  운영자가 그날 하고 싶은 말이나, 지난 글에서 소개하고 싶은 답글이 있으면
  src/data/threads-notes.json 에 올리는 날짜로 적어 둔다. 그 줄이 글 맨 앞에
  붙는다. 자동으로 고르지 않는다 — 남의 답글을 사람이 보지 않고 옮기면 안 된다.

  교회 이름은 쓰지 않는다. 숫자만 쓴다. "재게시 17회" 같은 것을 교회 이름과
  함께 올리면 사람을 못 구하는 교회를 공개적으로 짚는 셈이 된다. 개별 공고는
  사이트에서 보면 된다.

  스레드는 한 글이 500자다. 넘치면 올라가지 않으므로, 뒤에서부터 덜 중요한
  줄을 뺀다.
*/

export interface DailyReport {
  /** "2026-10-02" — 센 날(어제). 같은 날을 두 번 올리지 않는 데 쓴다. */
  day: string;
  count: number;
  /** 지난주 같은 요일 */
  lastWeek: number;
  /** 숫자 글인가 이야기 글인가. 숫자 글만 공고가 0건이면 올리지 않는다. */
  kind: "stats" | "story";
  text: string;
}

/** 운영자가 올리는 날짜로 적어 두는 한마디. 둘 다 없어도 된다. */
export interface DayNote {
  /** 운영자 본인의 말. 글 맨 앞에 그대로 붙는다. */
  note?: string;
  /** 지난 글에 달린 답글 가운데 소개할 것. 이름은 빼고 적는다. */
  quote?: string;
}

const LIMIT = 500;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
/** 숫자 글을 올리는 요일. 월요일엔 주간 요약이 따로 나가므로 주 세 편이다. */
const STATS_DAYS = new Set(["화", "목"]);

/** 한국 날짜로 n일 전. 수집은 한국 아침 7시에 돈다. */
export function kstDay(offsetDays: number, now = Date.now()): string {
  return new Date(now + 9 * 3600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** "2026-10-02" → "금". 한국 정오로 잡으면 UTC 로도 같은 날이라 요일이 어긋나지 않는다. */
const weekdayOf = (day: string) => WEEKDAY[new Date(`${day}T12:00:00+09:00`).getUTCDay()];

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

/** 운영자의 한마디와 소개할 답글. 글 맨 앞에 붙인다. */
function noteLines(note: DayNote | undefined): (string | null)[] {
  const own = note?.note?.trim();
  const quote = note?.quote?.trim();
  return [
    own || null,
    own ? "" : null,
    quote ? "지난 글에 이런 답글이 달렸습니다." : null,
    quote ? `"${quote}"` : null,
    quote ? "" : null,
  ];
}

/**
 * 오늘 아침에 올릴 글을 만든다. 화·목요일은 숫자 글, 나머지는 이야기 글이다.
 *
 * listings 는 게시판끼리 묶고 재게시를 접은 뒤의 목록이어야 한다. 같은 자리를
 * 세 게시판에 올린 것을 셋으로 세면 숫자가 부풀려진다.
 */
export function buildDailyReport(
  listings: JobListing[],
  openTotal: number,
  now = Date.now(),
  note?: DayNote
): DailyReport {
  const today = kstDay(0, now);
  const day = kstDay(1, now);
  const weekAgo = kstDay(8, now);
  const posted = listings.filter((l) => l.postedAt === day);
  const lastWeek = listings.filter((l) => l.postedAt === weekAgo).length;
  const base = { day, count: posted.length, lastWeek };

  if (!STATS_DAYS.has(weekdayOf(today))) {
    const lines = [
      ...noteLines(note),
      dailyQuestion(today),
      "",
      // 답글을 다음 글에 옮길 수 있다는 것을 미리 밝혀 둔다.
      "좋은 답글은 이름을 빼고 다음 글에 소개할 수 있어요. 원치 않으시면 적어 주세요.",
    ];
    return { ...base, kind: "story", text: fit(lines, []) };
  }

  const [, m, d] = day.split("-").map(Number);
  const denoms = tally(posted, (l) => (l.denomination ? shortDenomination(l.denomination.name) : null));
  const regions = tally(posted, (l) => l.place.sido);
  const employment = tally(posted, (l) => l.employment);
  const departments = tally(posted, (l) => l.departments);
  const positions = tally(posted, (l) => l.positions);

  // 그날 데이터에서 참인 발견 하나와, 그 발견에 이어지는 질문을 함께 고른다.
  // 질문이 먼저, 숫자가 근거로 뒤에 온다. 발견이 없는 날은 요일 질문을 쓴다.
  const finding = pickFinding(dailyFindings(posted), dayIndex(day));

  const lines: (string | null)[] = [
    ...noteLines(note),
    finding ? finding.ask : dailyQuestion(today),
    finding ? finding.text : null,
    "",
    // 지난주와 견주는 줄은 넣지 않는다. 9월 말에 게시판을 넷에서 열로 늘려,
    // 늘어난 것이 공고가 아니라 출처인데 "지난주보다 +108"로 읽힌다. 틀린 말을
    // 공개적으로 하게 된다. 출처가 한동안 그대로 있으면 그때 다시 넣는다.
    `${m}월 ${d}일(${weekdayOf(day)}) 청빙공고 ${posted.length}건`,
    denoms.length ? `교단  ${join(denoms, 5)}` : null,
    regions.length ? `지역  ${join(regions, 5)}` : null,
    employment.length ? `근무  ${join(employment, 4)}` : null,
    positions.length ? `직분  ${join(positions, 4)}` : null,
    departments.length ? `많이 찾는 부서  ${departments.slice(0, 3).map(([k]) => k).join(" · ")}` : null,
    "",
    `지금 모집 중 ${openTotal.toLocaleString("ko-KR")}건, 게시판 열 곳을 매일 모읍니다`,
    "daeshin-ministry.vercel.app/jobs",
  ];

  return {
    ...base,
    kind: "stats",
    // 빠져도 글이 되는 줄의 차례. 앞에 있을수록 먼저 뺀다.
    text: fit(lines, ["많이 찾는 부서", "직분", "근무"]),
  };
}

/* ------------------------------------------------------------ 발견과 질문

  숫자 글 첫머리에 쓸 "발견"은 그날 데이터에서 참인 것만 고른다. 작은 숫자로
  큰 말을 하지 않으려고 공고가 열 건 미만이면 아무것도 고르지 않는다.

  발견마다 이어지는 질문을 하나씩 붙인다. 숫자를 사역자의 고충으로 잇는
  다리다. "파트가 많았다"는 숫자보다 "파트 하나로 생활이 되시나요?"에
  답글이 달린다.

  사례비는 셀 수 없다. 본문을 저장하지 않고, 제목에 사례를 적는 공고는 거의
  없다(3,461건 중 1건). 사례 이야기는 금요일 이야기 글에서 묻는다.

  교단 비율은 발견으로 쓰지 않는다. 통합이 많은 것은 장신대 게시판이 커서이지
  통합 교회가 사람을 많이 찾아서가 아니다. 우리 수집 범위를 시장인 것처럼
  말하게 된다.
*/

interface Finding {
  /** 숫자로 확인되는 한 줄 */
  text: string;
  /** 그 숫자에서 이어지는 질문 */
  ask: string;
}

const CAPITAL = new Set(["서울", "경기", "인천"]);

/** 날짜를 숫자로. 같은 문장이 이어지지 않게 돌리는 데만 쓴다. */
function dayIndex(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

function pickFinding<T>(findings: T[], seed: number): T | null {
  return findings.length ? findings[seed % findings.length] : null;
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

function dailyFindings(posted: JobListing[]): Finding[] {
  const n = posted.length;
  if (n < 10) return [];
  const out: Finding[] = [];

  const capital = posted.filter((l) => l.place.sido && CAPITAL.has(l.place.sido)).length;
  if (pct(capital, n) >= 40) {
    out.push({
      text: `어제 올라온 청빙공고 ${n}건 가운데 ${capital}건(${pct(capital, n)}%)이 수도권이었습니다.`,
      ask: "지방 교회 자리, 지원해 볼 마음이 있으세요? 망설여진다면 무엇 때문이에요?",
    });
  }

  const part = posted.filter((l) => l.employment === "파트").length;
  const full = posted.filter((l) => l.employment === "전임").length;
  if (part >= 3 && full >= 3) {
    out.push(
      part > full
        ? {
            text: `어제는 파트 자리가 ${part}건으로 전임(${full}건)보다 많았습니다.`,
            ask: "파트 사역 하나로 생활이 되시나요? 다른 일을 같이 하신다면 어떤 일인지 궁금합니다.",
          }
        : {
            text: `어제 전임 자리가 ${full}건 올라왔습니다. 파트(${part}건)보다 많은 날입니다.`,
            ask: "파트에서 전임으로 옮길 때 가장 걱정되는 건 뭐였어요? ① 사례 ② 시간 ③ 가족 ④ 공부",
          }
    );
  }

  const worship = posted.filter((l) => l.positions.includes("찬양사역자")).length;
  if (worship >= 5) {
    out.push({
      text: `어제 찬양사역자를 찾는 공고가 ${worship}건 있었습니다.`,
      ask: "찬양사역자분들, 주일 하루에 연습·리허설·예배까지 몇 시간을 쓰세요?",
    });
  }

  const [topDept] = tally(posted, (l) => l.departments);
  if (topDept && topDept[1] >= 3) {
    out.push({
      text: `어제 가장 많이 찾은 부서는 ${topDept[0]}였습니다. ${topDept[1]}건입니다.`,
      ask: `${topDept[0]} 맡아 보신 분, 그 부서에서 가장 힘든 건 뭐였어요?`,
    });
  }

  // 같은 글이 세 번 넘게 올라온 자리. 교회 이름 없이 수만 쓴다.
  const reposted = posted.filter((l) => l.repostCount >= 3).length;
  if (reposted >= 5) {
    out.push({
      text: `어제 공고 ${n}건 가운데 ${reposted}건은 세 번 넘게 다시 올라온 자리였습니다.`,
      ask: "같은 공고가 자꾸 다시 올라오면 ① 사정이 있겠지 한다 ② 피한다 ③ 먼저 알아본다. 어떻게 보세요?",
    });
  }

  const anyDenom = posted.filter((l) => l.acceptsAll).length;
  if (anyDenom >= 3) {
    out.push({
      text: `어제 공고 가운데 ${anyDenom}건은 교단을 가리지 않고 지원을 받았습니다.`,
      ask: "교단이 다른 교회에 지원해 보신 적 있으세요? 면접에서 교단 이야기가 나왔나요?",
    });
  }

  const abroad = posted.filter((l) => l.place.sido === "해외").length;
  if (abroad >= 2) {
    out.push({
      text: `어제는 해외 교회 공고도 ${abroad}건 올라왔습니다.`,
      ask: "해외 교회 사역, 생각해 보신 적 있으세요? 가장 걸리는 게 뭐예요?",
    });
  }

  return out;
}

/*
  요일마다 묻는 질문. 정답이 있는 질문이 아니라 각자 겪은 장면을 꺼내게 하는
  질문이어야 답글이 달린다. "마음은 어떠세요?"처럼 막연하게 묻지 않고, 장면
  하나를 주고 고르게 하거나 한 줄로 답할 수 있게 묻는다.

  사실을 단정하는 문장은 넣지 않는다 — 데이터와 어긋나면 틀린 말을 하게 된다.
  운영자의 경험을 지어내지 않는다 — "저는 ~했습니다"는 운영자가 notes 에
  직접 쓴다.

  사역자의 한 주 흐름을 따라 요일마다 다른 결로 묻는다. 월요일엔 어제 주일을,
  토요일엔 내일 주일을 묻는 식이다. 요일마다 여섯 개를 두고 주 번호로 돌린다.
  여섯 주가 지나야 같은 질문이 온다.
*/
const DAILY_QUESTIONS: Record<string, string[]> = {
  // 주일 다음 날. 몸도 마음도 가장 지쳐 있을 때다.
  월: [
    "월요일 오전 10시, 담임목사님께 '잠깐 교회 나올 수 있어?' 카톡이 왔다.\n① 바로 간다 ② 오후에 가겠다고 한다 ③ 오늘은 쉰다고 말씀드린다\n솔직히 몇 번이세요?",
    "어제 주일 마치고 집에 와서 제일 먼저 한 일이 뭐였어요? 씻기, 눕기, 아무것도 안 하기 중에 고르면요.",
    "어제 '수고했다'는 말, 누구에게 들으셨어요? 아무에게도 못 들었다면 그것도 답이 됩니다.",
    "예배 끝나고 한 교인이 '오늘 설교 좀 길었죠?'라고 한다면, 뭐라고 답하시겠어요?",
    "주일 사역 끝나면 몸이 먼저 지치세요, 마음이 먼저 지치세요? 회복하는 데 각각 며칠 걸리세요?",
    "월요일인데 쉬지 못하고 있다면, 지금 붙들고 있는 일은 뭐예요?",
  ],
  // 말씀을 붙들기 시작하는 날.
  화: [
    "화요일인데 이번 주 본문이 아직 안 잡혔다.\n① 정상이다 ② 조금 늦었다 ③ 이미 비상이다\n보통 무슨 요일에 정하세요?",
    "설교 준비에 AI를 쓰신다면 어디까지예요?\n① 안 쓴다 ② 자료 찾기까지 ③ 개요까지 ④ 원고 초안까지",
    "중고등부 설교 중에 맨 앞줄 학생이 엎드려 잔다. 그 자리에서 어떻게 하세요?",
    "원고를 다 써서 올라가세요, 개요만 들고 올라가세요? 바꿔 보신 적 있다면 왜 바꾸셨는지도 궁금합니다.",
    "내 마음에 먼저 와닿지 않은 본문으로 이번 주에 설교해야 한다면, 무엇부터 하세요?",
    "담임목사님이 '그 설교, 다음엔 이렇게 해 봐'라고 하셨다. 그 말이 힘이 되셨어요, 상처가 되셨어요?",
  ],
  // 사람을 만나는 날. 심방과 관계.
  수: [
    "병원 심방에서 환자분이 '왜 하나님이 저한테 이러실까요?' 하고 묻는다. 그 자리에서 뭐라고 하시겠어요?",
    "교인이 밤 11시에 개인 카톡을 보냈다.\n① 바로 답한다 ② 아침에 답한다 ③ 급한 일인지 보고 정한다\n어떻게 하세요?",
    "교인에게 들은 한마디가 일주일 내내 맴돈 적 있으세요? 그런 날은 어떻게 보내세요?",
    "회의에서 담임목사님 결정이 틀렸다고 느껴진다.\n① 그 자리에서 말씀드린다 ② 따로 찾아가 말씀드린다 ③ 그냥 따른다\n몇 번이세요?",
    "교회 안에 내 편이 되어 주는 사람이 한 명이라도 있으세요? 그분은 어떤 분이에요?",
    "장례식장에서 유족 앞에 섰는데 할 말이 떠오르지 않았던 적 있으세요? 그때 어떻게 하셨어요?",
  ],
  // 다음 세대. 부서 사역자가 가장 많이 겪는 장면들.
  목: [
    "매주 오던 중학생이 한 달째 안 보인다. 연락하면 '바빠요'라고만 한다. 다음 연락은 언제, 어떻게 하시겠어요?",
    "교사 한 분이 이번 달까지만 하겠다고 한다. 새 교사 부탁은 누구에게, 어떻게 꺼내세요?",
    "수련회 준비에서 가장 품이 많이 드는 건 뭐예요? 프로그램, 섭외, 예산, 학부모 연락 중에서요.",
    "예배 시간에 핸드폰 보는 학생이 있다.\n① 걷는다 ② 말로 주의 준다 ③ 그냥 둔다\n어떻게 하세요?",
    "부서 간식비가 모자라 내 돈을 쓴 적 있으세요? 한 달에 얼마쯤 되세요?",
    "학부모가 '우리 애가 교회 가기 싫대요'라고 한다면, 뭐라고 답하시겠어요?",
  ],
  // 생활. 사례비와 가정, 말하기 어려운 것들.
  금: [
    "사례비 이야기, 교회에 꺼내 보신 적 있으세요?\n① 있다 ② 하고 싶었는데 못 했다 ③ 생각도 안 해 봤다",
    "학비, 생활비, 사역 시간. 셋 중 하나를 줄여야 한다면 무엇을 줄이시겠어요?",
    "가족 행사와 교회 행사가 겹쳤다. 지난번엔 어느 쪽을 택하셨어요?",
    "사역 말고 다른 일도 하세요? 하신다면 교회에 말씀드렸는지도 궁금합니다.",
    "마지막으로 하루를 통째로 쉰 게 언제예요? 날짜가 기억나지 않는다면 그것도 답입니다.",
    "이번 달에 사역 때문에 내 돈으로 쓴 것 중 가장 큰 건 뭐예요? 간식, 교통비, 책 중에서요.",
  ],
  // 주일 전날.
  토: [
    "토요일 밤, 주일 준비가 끝나는 시간은?\n① 9시 전 ② 자정 전 ③ 자정 넘어서 ④ 주일 아침",
    "내일 주일을 앞두고 가장 마음에 걸리는 한 가지를 한 줄로 나눠 주세요.",
    "주일 찬양 콘티는 누가 정하세요? 담임목사님이 곡을 바꾸라고 하신 적 있으세요?",
    "토요일만 되면 괜히 불안해지는 분 계세요? 그 불안은 주로 무엇 때문이에요?",
    "준비가 덜 된 채로 주일 아침을 맞았다. 강단에 오르기 전 마지막 10분, 무엇을 하세요?",
    "내일 설교나 공과를 한 문장으로 말하면요?",
  ],
  // 주일 아침. 바쁜 날이라 짧게 묻는다.
  일: [
    "오늘 예배 앞두고 드리는 한 줄 기도를 나눠 주세요.",
    "처음 부르심을 받았던 날을 기억하세요? 그때 나이와 장소만 적어 주셔도 좋습니다.",
    "사역을 그만두고 싶었던 적 있으세요? 그때 붙잡아 준 건 사람이었나요, 말씀이었나요?",
    "요즘 내 영혼을 먹이는 건 무엇인가요? 책, 기도, 사람 가운데 하나만 꼽는다면요.",
    "기도가 안 되는 시기에도 놓지 않는 습관이 하나 있다면요?",
    "사역자에게도 목자가 필요합니다. 지금 내 목자는 누구세요? '없음'도 괜찮습니다.",
  ],
};

/** 그날 요일에 맞는 질문. 주 번호로 돌려 여섯 주 동안 같은 질문이 없다. */
function dailyQuestion(askDay: string): string {
  const pool = DAILY_QUESTIONS[weekdayOf(askDay)];
  return pool[Math.floor(dayIndex(askDay) / 7) % pool.length];
}

const WEEKLY_QUESTIONS = [
  "지난주에 지원서 내신 분 계세요? 연락 기다리는 동안 무엇을 하며 지내세요?",
  "A는 사례가 넉넉하지만 집에서 1시간 반, B는 사례가 적지만 15분 거리. 어디로 가시겠어요?",
  "면접에서 '사모님도 봉사하실 수 있나요?'라는 질문을 받는다면, 뭐라고 답하시겠어요?",
  "면접에서 받은 질문 중 아직도 기억나는 게 있으세요? 좋았던 질문이든 당황한 질문이든요.",
  "지금 자리를 떠나기로 마음먹은 결정적인 순간이 있었나요, 아니면 조금씩 쌓였나요?",
  "지금 교회에 처음 간 날, 누가 가장 먼저 인사해 주셨어요?",
  "사역지를 떠날 때 부서 아이들에게 어떻게 말하셨어요? 아직이라면 어떻게 말할 생각이세요?",
  "공고에 '사례 협의'라고만 적혀 있으면\n① 그래도 지원한다 ② 먼저 물어본다 ③ 넘긴다\n몇 번이세요?",
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
    // 일간 글처럼 질문이 먼저, 숫자는 그 뒤에 온다.
    WEEKLY_QUESTIONS[Math.floor(weekSeed) % WEEKLY_QUESTIONS.length],
    "",
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
