/*
  지역 분류.

  예전에는 "충남·대전·세종" 처럼 묶어 뒀다. 공고 수가 적을 때는 그래도 됐지만,
  대전에서 사역할 사람에게 천안 공고를 섞어 보여 주는 셈이었다. 17개 시·도로
  나누고, 원문에 구·군까지 적혀 있으면 그것도 따로 잡는다.

  원문 표기는 출처마다 제각각이다.
    "경기도 안양시"  "서울시 송파구"  "대전 중구"  "울산광역시 동구"
    "성남시 분당구"  "청주시 상당구"   ← 시·도가 아예 없는 표기
    "인천.서구"      ← 구분자가 점
*/

export const SIDO = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "해외",
] as const;

export type Sido = (typeof SIDO)[number];

/** 시·도를 가리키는 다른 표기들. 긴 것부터 봐야 "경기도"가 "경기"로 잘리지 않는다. */
const SIDO_ALIASES: [Sido, string[]][] = [
  ["서울", ["서울특별시", "서울시", "서울"]],
  ["부산", ["부산광역시", "부산시", "부산"]],
  ["대구", ["대구광역시", "대구시", "대구"]],
  ["인천", ["인천광역시", "인천시", "인천"]],
  ["광주", ["광주광역시", "광주시"]], // "광주시"만 쓰면 경기 광주와 겹쳐 아래에서 따로 가린다
  ["대전", ["대전광역시", "대전시", "대전"]],
  ["울산", ["울산광역시", "울산시", "울산"]],
  ["세종", ["세종특별자치시", "세종시", "세종"]],
  ["경기", ["경기도", "경기"]],
  ["강원", ["강원특별자치도", "강원도", "강원"]],
  ["충북", ["충청북도", "충북"]],
  ["충남", ["충청남도", "충남"]],
  ["전북", ["전북특별자치도", "전라북도", "전북"]],
  ["전남", ["전라남도", "전남"]],
  ["경북", ["경상북도", "경북"]],
  ["경남", ["경상남도", "경남"]],
  ["제주", ["제주특별자치도", "제주도", "제주"]],
  ["해외", ["해외", "국외"]],
];

/**
 * 시·군 이름만 적힌 표기를 시·도로 되돌린다.
 *
 * "성남시 분당구"처럼 광역 단위 없이 적는 게시판이 있다.
 */
const CITY_SIDO: Record<string, Sido> = {};
function city(sido: Sido, ...names: string[]) {
  for (const n of names) CITY_SIDO[n] = sido;
}

city("경기",
  "수원", "성남", "용인", "고양", "부천", "안산", "안양", "남양주", "화성", "평택",
  "의정부", "시흥", "파주", "광명", "김포", "군포", "광주", "이천", "양주", "오산",
  "구리", "안성", "포천", "의왕", "하남", "여주", "동두천", "과천", "양평", "가평", "연천",
  "분당", "일산", "평촌", "동탄");
city("강원", "춘천", "원주", "강릉", "동해", "태백", "속초", "삼척", "홍천", "횡성",
  "영월", "평창", "정선", "철원", "화천", "양구", "인제", "고성", "양양");
city("충북", "청주", "충주", "제천", "보은", "옥천", "영동", "증평", "진천", "괴산", "음성", "단양");
city("충남", "천안", "공주", "보령", "아산", "서산", "논산", "계룡", "당진",
  "금산", "부여", "서천", "청양", "홍성", "예산", "태안");
city("전북", "전주", "군산", "익산", "정읍", "남원", "김제", "완주", "진안",
  "무주", "장수", "임실", "순창", "고창", "부안");
city("전남", "목포", "여수", "순천", "나주", "광양", "담양", "곡성", "구례", "고흥",
  "보성", "화순", "장흥", "강진", "해남", "영암", "무안", "함평", "영광", "장성", "완도", "진도", "신안");
city("경북", "포항", "경주", "김천", "안동", "구미", "영주", "영천", "상주", "문경",
  "경산", "군위", "의성", "청송", "영양", "영덕", "청도", "고령", "성주", "칠곡",
  "예천", "봉화", "울진", "울릉");
city("경남", "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령",
  "함안", "창녕", "남해", "하동", "산청", "함양", "거창", "합천", "마산", "진해");
city("제주", "서귀포");

/** 서울 25개 구. "강남구 대치동"처럼 구부터 적는 공고가 있다. */
const SEOUL_GU = [
  "종로", "중", "용산", "성동", "광진", "동대문", "중랑", "성북", "강북", "도봉",
  "노원", "은평", "서대문", "마포", "양천", "강서", "구로", "금천", "영등포", "동작",
  "관악", "서초", "강남", "송파", "강동",
];

/** 해외는 나라·도시 이름으로 적혀 온다. 국내 지명과 겹치지 않는 말만 골랐다. */
const OVERSEAS_NAMES =
  /해외|국외|미국|미주|캐나다|중국|일본|호주|뉴질랜드|베트남|필리핀|태국|인도|독일|영국|프랑스|러시아|몽골|캄보디아|대만|홍콩|싱가포르|남미|북미|유럽|아프리카|칠레|브라질|멕시코|아르헨티나|남아프리카|케냐|우즈베키스탄|카자흐|키르기스/;

export interface Place {
  sido: Sido | null;
  /** 원문에 적혀 있을 때만. "강남구", "성남시 분당구" */
  sigungu: string | null;
}

const EMPTY: Place = { sido: null, sigungu: null };

/**
 * 원문 지역 표기를 시·도와 시·군·구로 나눈다.
 *
 * "전국"과 "○○ 외"는 지역이 아니다. 갓피플의 "서울 외"는 서울이 아니라 서울
 * 바깥이라는 뜻이라, 그대로 두면 수도권 밖 교회가 전부 서울로 잡힌다.
 */
export function parsePlace(raw: string | null | undefined): Place {
  if (!raw) return EMPTY;

  const text = raw.replace(/[[\]()]/g, " ").replace(/[.·,]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return EMPTY;
  if (/전국|전지역/.test(text)) return EMPTY;
  if (/\s*외$/.test(text)) return EMPTY;
  // 나라 이름이 보이면 국내 지명을 더 찾지 않는다.
  const abroad = text.match(OVERSEAS_NAMES);
  if (abroad) {
    // "호주 골드코스트에서 동역자 모십니다" 처럼 제목째 넘어오면 나라만 남긴다.
    const detail = text === "해외" ? null : text.length <= 12 ? text : abroad[0];
    return { sido: "해외", sigungu: detail };
  }

  let rest = text;
  let sido: Sido | null = null;

  for (const [name, aliases] of SIDO_ALIASES) {
    const hit = aliases.find((a) => rest.startsWith(a));
    if (!hit) continue;
    // "광주시 오포읍"은 경기 광주다. 뒤에 구가 붙으면 광역시로 본다.
    if (name === "광주" && hit === "광주시" && !/\s\S+구\b/.test(rest)) break;
    sido = name;
    rest = rest.slice(hit.length).trim();
    break;
  }

  if (!sido) {
    // 시·도 없이 "성남시 분당구"처럼 적힌 표기. "전라도 군산시"처럼 앞에 모를 말이
    // 붙은 경우도 있어 칸을 모두 훑는다.
    const words = rest.split(" ");
    for (let i = 0; i < words.length; i++) {
      const bare = words[i].replace(/(특별자치시|특별자치도|광역시|특별시|시|군)$/, "");
      const found = CITY_SIDO[bare];
      if (!found) continue;
      // 시 이름은 남겨 둔다. "분당구"만 있으면 어느 시인지 알 수 없다.
      return { sido: found, sigungu: keepPlaceWords(words.slice(i).join(" ")) };
    }

    // "강남구 대치동"처럼 구부터 적힌 경우
    const gu = words[0].replace(/구$/, "");
    if (SEOUL_GU.includes(gu)) return { sido: "서울", sigungu: keepPlaceWords(words.join(" ")) };

    return EMPTY;
  }

  return { sido, sigungu: keepPlaceWords(rest) };
}

/**
 * 시·도 뒤에 남은 말에서 진짜 시·군·구만 끊어 낸다.
 *
 * 그냥 남은 말을 다 담으면, 지역 칸이 없어 제목에서 지역을 읽는 게시판에서
 * 제목이 통째로 지역이 된다.
 *   "[용인] 광림남교회 교회학교 전도사님(파트)을 정중히 모십니다"
 *   → "경기 용인 광림남교회 교회학교 전도사님 파트 을 정중히 모십니다"
 * 앞에서부터 지명으로 읽히는 낱말만 가져오고, 아닌 말이 나오면 거기서 멈춘다.
 */
function keepPlaceWords(rest: string): string | null {
  const out: string[] = [];
  for (const word of rest.split(" ").filter(Boolean)) {
    const bare = word.replace(/(시|군|구)$/, "");
    const isPlace =
      /(시|군|구)$/.test(word) || bare in CITY_SIDO || SEOUL_GU.includes(bare);
    if (!isPlace) break;
    out.push(word);
  }
  return out.join(" ") || null;
}

/**
 * 문장 안에 섞인 지명을 찾는다.
 *
 * 지역 칸이 따로 없는 게시판은 제목에 몰아 적는다.
 *   "대전 전민새생명교회 부교역자 초빙"
 *   "부산 기장군 정관신도시에 위치한 …"
 *   "[캐나다 에드몬톤 명성장로교회]"
 * 교회 이름이 아니라 진짜 지명인지는 parsePlace 가 판단한다.
 */
export function findPlaceIn(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/[[\]()]/g, " ").replace(/\s+/g, " ");

  // "성남시 분당구"처럼 둘이 붙어 나오면 함께 넘긴다.
  const pair = cleaned.match(/[가-힣]{2,6}(?:시|군)\s+[가-힣]{2,6}(?:구|군)/);
  if (pair && parsePlace(pair[0]).sido) return pair[0];

  // 시·군·구로 끝나는 낱말
  for (const word of cleaned.match(/[가-힣]{2,10}(?:특별자치시|특별자치도|광역시|특별시|시|군|구)/g) ?? []) {
    if (parsePlace(word).sido) return word;
  }

  // 나라 이름이 보이면 해외다. 맞은 말만 돌려준다 — "호주에"가 아니라 "호주".
  const abroad = cleaned.match(OVERSEAS_NAMES);
  if (abroad) return abroad[0];

  // 시·도 이름만 적힌 경우. "서울"과 "서울대학교"는 다르므로 뒤에 올 수 있는
  // 조사만 허용하고, 다른 글자가 이어지면 지명으로 보지 않는다.
  // 공백은 이미 하나로 줄여 두었으므로 \s 대신 진짜 빈칸을 쓴다. 템플릿 문자열
  // 안에서 \s 는 정규식이 보기 전에 그냥 s 가 되어 조용히 틀린다.
  const 조사 = "(?:에서|에게|에|의|은|는|이|가|으로|로|시|도)?";
  for (const name of SIDO) {
    if (name === "해외") continue;
    if (new RegExp("(^|[ ·,])" + name + 조사 + "(?=[ ·,]|$)").test(cleaned)) return name;
  }

  return null;
}

/** 화면에 적는 이름. "서울 강남구" */
export function placeLabel(place: Place): string {
  if (!place.sido) return "";
  return place.sigungu ? `${place.sido} ${place.sigungu}` : place.sido;
}

/** 필터 값으로 쓰는 문자열. "서울" 또는 "서울|강남구" */
export function placeKey(sido: Sido, sigungu?: string | null): string {
  return sigungu ? `${sido}|${sigungu}` : sido;
}

export function parseKeys(raw: string | null | undefined): { sido: string; sigungu: string | null }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [sido, sigungu] = chunk.split("|");
      return { sido, sigungu: sigungu || null };
    });
}

/** 고른 지역 중 하나라도 맞으면 통과. 시·도만 골랐으면 그 안의 모든 구·군이 맞는다. */
export function matchesPlace(place: Place, selected: ReturnType<typeof parseKeys>): boolean {
  if (selected.length === 0) return true;
  if (!place.sido) return false;
  return selected.some(
    (s) => s.sido === place.sido && (!s.sigungu || s.sigungu === place.sigungu)
  );
}
