/*
  행사 포스터.

  교회 포스터는 디자이너가 만드는 일이 드물다. 대부분 교역자가 파워포인트로
  급하게 만들어 단톡방에 올린다. 그래서 "예쁘게 꾸미는 도구"가 아니라
  "빠뜨리는 것 없이 채우면 반듯하게 나오는 틀"로 만들었다.

  포스터에서 사람들이 실제로 찾는 것은 넷뿐이다 — 무엇을, 언제, 어디서,
  누가 오면 되는지. 그 넷을 크게 두고 나머지는 작게 둔다.
*/

export const SHAPES = {
  a4: { label: "A4 세로 (인쇄)", width: 1240, height: 1754 },
  square: { label: "정사각형 (단톡방·인스타)", width: 1200, height: 1200 },
  wide: { label: "가로 (예배당 스크린)", width: 1920, height: 1080 },
} as const;

export type ShapeId = keyof typeof SHAPES;

/** 배경·글자 한 쌍. 교회 인쇄물에서 튀지 않는 조합만 골랐다. */
export const THEMES = {
  deep: { label: "짙은 녹색", bg: "#0f3d30", fg: "#ffffff", accent: "#8fd4b4", sub: "#c9e5d8" },
  ink: { label: "먹빛", bg: "#14161a", fg: "#ffffff", accent: "#e5c07b", sub: "#c9ccd1" },
  paper: { label: "종이 (인쇄용)", bg: "#faf8f3", fg: "#1a1a1a", accent: "#0f6b4f", sub: "#5c5c5c" },
  wine: { label: "포도주", bg: "#3d1220", fg: "#ffffff", accent: "#e8b4c0", sub: "#e0cdd3" },
  dawn: { label: "새벽", bg: "#1b2a4a", fg: "#ffffff", accent: "#f0c674", sub: "#c3cde0" },
} as const;

export type ThemeId = keyof typeof THEMES;

export interface Poster {
  shape: ShapeId;
  theme: ThemeId;
  /** 맨 위 작은 글씨 — 주최나 행사 갈래 */
  eyebrow: string;
  title: string;
  subtitle: string;
  /** 언제 — 여러 줄 */
  when: string;
  /** 어디서 */
  where: string;
  /** 누가 — 대상 */
  who: string;
  verse: string;
  verseRef: string;
  /** 맨 아래 — 문의처나 교회 이름 */
  footer: string;
}

/** 행사별 기본값. 비워 둔 칸을 무엇으로 채워야 하는지가 이 도구의 절반이다. */
export const PRESETS: { label: string; value: Partial<Poster> }[] = [
  {
    label: "여름성경학교",
    value: {
      eyebrow: "여름성경학교",
      title: "우리는\n하나님의 작품",
      subtitle: "2026 여름성경학교",
      when: "7월 28일(화) ~ 30일(목)\n오전 9시 ~ 오후 3시",
      where: "본당 및 교육관",
      who: "유치부 · 초등부 (7세 ~ 초6)",
      verse: "우리는 그가 만드신 바라",
      verseRef: "에베소서 2:10",
      theme: "deep",
    },
  },
  {
    label: "수련회",
    value: {
      eyebrow: "청년부 수련회",
      title: "다시,\n처음처럼",
      when: "8월 14일(금) ~ 16일(주일)\n2박 3일",
      where: "○○수양관",
      who: "청년부 전체 · 회비 7만원",
      verse: "너는 내게 부르짖으라 내가 네게 응답하겠고",
      verseRef: "예레미야 33:3",
      theme: "dawn",
    },
  },
  {
    label: "부활절",
    value: {
      eyebrow: "부활주일",
      title: "그가 살아나셨다",
      when: "4월 5일 주일\n오전 11시",
      where: "본당",
      who: "온 교우",
      verse: "그가 여기 계시지 아니하고 그가 말씀하시던 대로 살아나셨느니라",
      verseRef: "마태복음 28:6",
      theme: "paper",
    },
  },
  {
    label: "성탄절",
    value: {
      eyebrow: "성탄축하예배",
      title: "임마누엘",
      when: "12월 25일(금)\n오전 11시",
      where: "본당",
      who: "온 교우와 이웃",
      verse: "하나님이 우리와 함께 계시다",
      verseRef: "마태복음 1:23",
      theme: "wine",
    },
  },
  {
    label: "전도집회",
    value: {
      eyebrow: "총동원 주일",
      title: "한 영혼",
      subtitle: "함께 초청합시다",
      when: "10월 18일 주일\n오전 11시",
      where: "본당",
      who: "온 교우 · 초청 대상",
      verse: "추수할 것은 많되 일꾼이 적으니",
      verseRef: "마태복음 9:37",
      theme: "ink",
    },
  },
];

export function emptyPoster(): Poster {
  return {
    shape: "a4",
    theme: "deep",
    eyebrow: "",
    title: "",
    subtitle: "",
    when: "",
    where: "",
    who: "",
    verse: "",
    verseRef: "",
    footer: "",
  };
}

const MAX = 300;

function text(raw: unknown, limit = MAX): string {
  return typeof raw === "string" ? raw.slice(0, limit) : "";
}

/** 저장본을 지금 모양으로 맞춘다. 브라우저 저장본만 쓰므로 가볍게 둔다. */
export function revivePoster(raw: unknown): Poster {
  const base = emptyPoster();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Record<string, unknown>;
  return {
    shape: (input.shape as ShapeId) in SHAPES ? (input.shape as ShapeId) : base.shape,
    theme: (input.theme as ThemeId) in THEMES ? (input.theme as ThemeId) : base.theme,
    eyebrow: text(input.eyebrow, 60),
    title: text(input.title, 80),
    subtitle: text(input.subtitle, 80),
    when: text(input.when, 120),
    where: text(input.where, 80),
    who: text(input.who, 120),
    verse: text(input.verse, 200),
    verseRef: text(input.verseRef, 60),
    footer: text(input.footer, 120),
  };
}

/** 아직 채우지 않아 포스터에서 비어 보일 칸 */
export function missingFields(poster: Poster): string[] {
  const need: [keyof Poster, string][] = [
    ["title", "제목"],
    ["when", "언제"],
    ["where", "어디서"],
    ["who", "누가"],
  ];
  return need.filter(([key]) => !poster[key].toString().trim()).map(([, label]) => label);
}
