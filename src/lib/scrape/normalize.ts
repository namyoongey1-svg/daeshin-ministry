import { POSITIONS, REGIONS, type Position, type Region } from "@/lib/jobs";

/**
 * 출처마다 지역을 적는 방식이 다르다.
 *   갓피플  "경기", "서울 외", "전국"
 *   백석대  "[서울시 용산구]", "[청주시 상당구]", "[울산광역시 동구]"
 * 광역 단위가 없는 표기도 있어서 시·군 이름까지 받아 둔다.
 */
const REGION_KEYS: [Region, string[]][] = [
  ["서울", ["서울"]],
  ["인천", ["인천"]],
  ["경기", [
    "경기", "수원", "성남", "분당", "용인", "고양", "일산", "부천", "안양", "평촌",
    "안산", "화성", "남양주", "의정부", "파주", "김포", "광명", "군포", "이천",
    "시흥", "하남", "구리", "오산", "양주", "포천", "여주", "동두천", "과천",
  ]],
  ["강원", ["강원", "춘천", "원주", "강릉", "속초", "동해", "삼척", "태백"]],
  ["충북", ["충북", "충청북도", "청주", "충주", "제천", "음성", "진천"]],
  ["충남·대전·세종", [
    "충남", "충청남도", "대전", "세종", "천안", "아산", "논산", "공주",
    "서산", "당진", "보령", "계룡",
  ]],
  ["전북", ["전북", "전라북도", "전주", "익산", "군산", "정읍", "남원", "김제"]],
  ["전남·광주", [
    "전남", "전라남도", "광주", "목포", "여수", "순천", "나주", "광양", "무안",
  ]],
  ["경북·대구", [
    "경북", "경상북도", "대구", "포항", "경주", "구미", "안동", "김천",
    "영주", "상주", "경산", "칠곡",
  ]],
  ["경남·부산·울산", [
    "경남", "경상남도", "부산", "울산", "창원", "진주", "김해", "양산",
    "거제", "통영", "사천", "밀양",
  ]],
  ["제주", ["제주", "서귀포"]],
  ["해외", [
    "해외", "미국", "캐나다", "일본", "중국", "호주", "뉴질랜드", "필리핀",
    "베트남", "태국", "독일", "영국", "프랑스", "괌", "LA", "뉴욕",
  ]],
];

/** 광역 단위를 못 찾으면 null. "전국"처럼 특정할 수 없는 표기도 null이다. */
export function normalizeRegion(raw: string | null | undefined): Region | null {
  if (!raw) return null;
  const text = raw.replace(/[[\]()]/g, " ");
  if (/전국|전지역/.test(text)) return null;

  for (const [region, keys] of REGION_KEYS) {
    if (keys.some((k) => text.includes(k))) return region;
  }
  return REGIONS.includes(text.trim() as Region) ? (text.trim() as Region) : null;
}

/**
 * 직분 표기를 우리 분류로 옮긴다.
 * 먼저 잡히는 항목이 이기므로, 좁은 표기를 넓은 표기보다 앞에 둔다.
 */
const POSITION_KEYS: [Position, string[]][] = [
  ["담임목사", ["담임목사", "담임 목사", "위임목사", "담임"]],
  ["교육전도사", ["교육전도사", "교육 전도사", "파트전도사"]],
  ["찬양사역자", ["찬양", "예배인도", "워십", "반주", "지휘", "성가"]],
  ["행정간사", ["행정", "사무", "총무", "비서", "회계", "관리집사"]],
  ["선교사", ["선교사", "선교"]],
  ["부목사", ["부목사", "교육목사", "협동목사", "부교역자", "목사"]],
  ["전도사", ["전임전도사", "심방전도사", "전도사", "강도사"]],
];

/** 부서를 가리키는 꼬리표 — 직분과 섞이면 필터가 어지러워지므로 따로 둔다. */
const DEPARTMENT_KEYS = [
  "영아부", "유아유치부", "유아부", "유치부", "아동부", "유초등부", "초등부",
  "중고등부", "중등부", "고등부", "청소년부", "청년부", "대학부", "장년부",
  "노년부", "주일학교", "영어부", "다음세대", "새가족", "미디어",
];

export function normalizePositions(tags: string[]): Position[] {
  const found = new Set<Position>();
  for (const tag of tags) {
    for (const [position, keys] of POSITION_KEYS) {
      if (keys.some((k) => tag.includes(k))) {
        found.add(position);
        break;
      }
    }
  }
  return POSITIONS.filter((p) => found.has(p));
}

// "유초등부"가 "초등부"로도 잡히지 않도록 긴 이름부터 본다.
const DEPARTMENTS_BY_LENGTH = [...DEPARTMENT_KEYS].sort((a, b) => b.length - a.length);

export function extractDepartments(tags: string[]): string[] {
  const found = new Set<string>();
  for (const tag of tags) {
    const hit = DEPARTMENTS_BY_LENGTH.find((dept) => tag.includes(dept));
    if (hit) found.add(hit);
  }
  return [...found];
}

/**
 * 게시판마다 날짜를 다르게 적는다.
 *   "2026.09.18" · "2026-10-10" · "09-18" · "17:38"(오늘) · "채용시까지"
 * 연도가 없으면 기준일로 메우되, 미래가 되면 작년으로 돌린다.
 */
export function parseDate(raw: string | null | undefined, now = new Date()): string | null {
  if (!raw) return null;
  // "09-18(목)"처럼 요일이 붙어 오는 게시판이 있다.
  const text = raw.replace(/\([^)]*\)/g, "").trim();

  const full = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (full) return iso(Number(full[1]), Number(full[2]), Number(full[3]));

  // 시각만 있으면 오늘 올라온 글이다.
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    return iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  const short = text.match(/^(\d{1,2})[.\-/](\d{1,2})$/);
  if (short) {
    const month = Number(short[1]);
    const day = Number(short[2]);
    const candidate = new Date(now.getFullYear(), month - 1, day);
    const year = candidate > now ? now.getFullYear() - 1 : now.getFullYear();
    return iso(year, month, day);
  }
  return null;
}

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 제목 앞머리의 "[○○교회]" 같은 표기에서 교회명을 떼어 낸다. */
export function splitBracket(title: string): { bracket: string | null; rest: string } {
  const m = title.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  return m ? { bracket: m[1].trim(), rest: m[2].trim() } : { bracket: null, rest: title.trim() };
}
