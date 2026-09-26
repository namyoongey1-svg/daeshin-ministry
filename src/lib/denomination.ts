import type { SourceId } from "./scrape/types";

/*
  교단.

  교회는 같은 교단 사람만 뽑는 일이 많다. 구직자에게는 지역이나 직분만큼
  중요한 조건인데, 수집한 공고에는 교단 칸이 아예 없다.

  이름에서 읽어 내는 것은 거의 안 된다. 822건 중 58건(7%)만 교회 이름이나
  제목에 교단이 드러난다. "호산나교회"는 어느 교단인지 이름으로 알 수 없다.

  대신 어느 게시판에 올렸는지가 훨씬 세다. 백석대 신대원 게시판에 올린 교회는
  백석 출신을 찾는 것이고, 총신대 총동창회 게시판은 합동이다. 교회의 소속
  교단과 정확히 같지는 않지만, 구직자가 알고 싶은 것 — "내가 지원할 만한
  자리인가" — 에는 오히려 이쪽이 더 가깝다. 그래서 무엇을 근거로 했는지
  함께 적어 화면에서 밝힌다.
*/

/** 고를 수 있는 교단. 직접 등록할 때 이 목록에서 고른다. */
export const DENOMINATIONS = [
  "예장 합동",
  "예장 통합",
  "예장 대신",
  "예장 백석",
  "예장 고신",
  "예장 합신",
  "예장 개혁",
  "기장",
  "기독교대한감리회",
  "기독교대한성결교회",
  "예수교대한성결교회",
  "기독교한국침례회",
  "기독교대한하나님의성회",
  "대한성공회",
  "구세군",
  "독립교단",
  "기타",
] as const;

export type Denomination = (typeof DENOMINATIONS)[number];

export interface Guess {
  name: Denomination;
  /** 무엇을 보고 그렇게 본 것인가. 화면에서 이 말을 그대로 쓴다. */
  basis: "본문" | "이름" | "게시판";
}

/**
 * 게시판별 교단.
 *
 * 신학교 동문 게시판은 그 교단 사람이 보는 곳이라, 거기 올렸다는 것 자체가
 * 어느 교단을 찾는지 말해 준다. 갓피플과 청빙넷은 여러 교단이 함께 쓰는
 * 곳이라 아무것도 알 수 없고, 모르는 것을 지어내지 않는다.
 */
const BOARD: Partial<Record<SourceId, Denomination>> = {
  baekseok: "예장 백석",
  aats: "예장 합동",
  puts: "예장 통합",
};

/**
 * 이름에 드러나는 교단.
 *
 * 긴 이름부터 본다. "기독교대한성결교회"를 "성결"로 먼저 잡으면 안 된다.
 */
const IN_NAME: [Denomination, RegExp][] = [
  ["기독교대한성결교회", /기독교대한성결교회/],
  ["예수교대한성결교회", /예수교대한성결교회/],
  ["기독교대한감리회", /기독교대한감리회|감리교회|감리교(?!육)/],
  ["기장", /한국기독교장로회/],
  ["기독교한국침례회", /기독교한국침례회|침례교회|침례교/],
  ["기독교대한하나님의성회", /하나님의성회|순복음/],
  ["대한성공회", /성공회/],
  ["구세군", /구세군/],
  // 예장은 계열까지 적어 두는 교회가 드물어, 이름만으로는 갈래를 못 가른다.
  // 아래 장로회 표기는 "예장"이라는 것까지만 알려 주므로 여기서 잡지 않는다.
];

/**
 * 공고 하나의 교단을 짐작한다.
 *
 * 이름에 또렷이 적혀 있으면 그것이 먼저다 — "기독교대한감리회 ○○교회"는
 * 어느 게시판에 올렸든 감리교다. 이름에 없으면 게시판을 본다.
 * 둘 다 없으면 null 이다. 모르는 것을 "독립교단"으로 적으면, 실제로는
 * 예장인 교회가 독립교단으로 둔갑해 구직자를 잘못 이끈다.
 */
export function guessDenomination(
  church: string | null | undefined,
  title: string,
  source: SourceId,
  /** 같은 자리가 함께 올라와 있는 다른 게시판들 */
  alsoOn: readonly SourceId[] = []
): Guess | null {
  const text = `${church ?? ""} ${title}`;
  for (const [name, re] of IN_NAME) {
    if (re.test(text)) return { name, basis: "이름" };
  }
  // 합쳐진 공고는 대표로 남은 게시판만 보면 신호를 놓친다. 갓피플과 백석대에
  // 함께 올린 자리는 갓피플 쪽이 대표가 되는데, 교단을 말해 주는 것은
  // 백석대 쪽이다.
  for (const id of [source, ...alsoOn]) {
    const board = BOARD[id];
    if (board) return { name: board, basis: "게시판" };
  }
  return null;
}

/** 화면에 적는 말. "예장 백석 (백석대 게시판 기준)" */
export function describeGuess(guess: Guess | null): string {
  if (!guess) return "교단 미표기";
  return guess.basis === "게시판" ? `${guess.name} 쪽` : guess.name;
}

/**
 * 같은 교단으로 볼 수 있는가.
 *
 * 모르는 공고는 어긋난 것으로 치지 않는다. 교단을 고른 사람에게 교단이
 * 안 적힌 공고를 통째로 숨기면 목록의 절반이 사라진다.
 */
export function sameDenomination(
  wanted: string,
  guess: Guess | null
): "맞음" | "미표기" | "다름" {
  if (!wanted) return "미표기";
  if (!guess) return "미표기";
  return guess.name === wanted ? "맞음" : "다름";
}

/* ------------------------------------------------------------ 본문에서 읽기

  청빙넷과 백석대는 본문에 교단 칸이 따로 있다.

    백석대   "2． 교단 : 장로교(합동)"
    청빙넷   "소속교단/교파 예장합동, 황동노회"
             "지원가능교단/교파 합동, 합신, 대신, 백석, 아신 지원 가능"

  본문은 저장하지 않는다. 저작권이 있는 남의 글이고 담당자 연락처가 섞여
  있어서다. 교단이라는 사실 하나만 뽑아 두고 나머지는 버린다.

  갓피플은 상세 페이지를 자바스크립트로 그려 본문이 오지 않고, 총신대는
  본문은 오지만 교단 칸이 없다. 총신대는 게시판만으로 이미 합동인 것을 안다.

  "지원가능교단"이 뜻밖의 수확이다. 교회의 소속 교단보다 구직자에게 더
  쓸모 있다 — 알고 싶은 것은 "저 교회가 무슨 교단인가"가 아니라 "내가
  지원할 수 있는가"이기 때문이다.
*/

/** 본문에 적힌 말을 우리 목록의 이름으로 맞춘다. 긴 것부터 본다. */
const NORMALIZE: [RegExp, Denomination][] = [
  [/한국독립교회|독립교회선교단체|KAICAM|독립교단|독립교회/i, "독립교단"],
  [/한국기독교장로회|기장/, "기장"],
  [/감리/, "기독교대한감리회"],
  [/예수교대한성결/, "예수교대한성결교회"],
  [/성결/, "기독교대한성결교회"],
  [/침례/, "기독교한국침례회"],
  [/순복음|기하성|하나님의성회/, "기독교대한하나님의성회"],
  [/성공회/, "대한성공회"],
  [/구세군/, "구세군"],
  // 예장 계열은 갈래 이름이 곧 교단이다. "장로교(합동)"의 괄호 안이 핵심이다.
  [/합동/, "예장 합동"],
  [/통합/, "예장 통합"],
  [/고신/, "예장 고신"],
  [/합신/, "예장 합신"],
  [/백석/, "예장 백석"],
  [/대신/, "예장 대신"],
  // "개혁주의 교단의 신학대학원 졸업생"은 신학 성향을 말하는 것이지 예장 개혁이
  // 아니다. 그대로 두면 합동 교회가 개혁 교단을 찾는 것처럼 뒤집힌다.
  [/개혁(?!주의)/, "예장 개혁"],
];

export function normalizeDenomination(raw: string): Denomination | null {
  const text = raw.trim();
  if (!text) return null;
  for (const [re, name] of NORMALIZE) if (re.test(text)) return name;
  return null;
}

export interface FromBody {
  /** 교회가 속한 교단 */
  own: Denomination | null;
  /** 지원을 받아 주는 교단들 */
  accepts: Denomination[];
  /** 교단을 가리지 않는다고 적혀 있는가 */
  acceptsAll: boolean;
}

const OWN_FIELD = [
  /소속\s*교단\s*[/·]?\s*교파\s*[:：\-–]?\s*([^\n]{1,40})/,
  // 칸 이름은 "교단"보다 "교단명"이 훨씬 흔하고, 구분자로 붙임표를 쓰기도 한다.
  //   "2. 교단명 : 백석 ( 서울강북노회 )"   "2. 교단명 - 합신 (동서울노회)"
  // 처음에 "교단 :" 만 보다가 백석대 266건 중 238건을 놓쳤다.
  /(?:소속\s*)?교단\s*(?:명|\/\s*교파)?\s*[:：\-–]\s*([^\n]{1,40})/,
];

const ACCEPT_FIELD = [
  /지원\s*가능\s*교단\s*[/·]?\s*교파\s*[:：\-–]?\s*([^\n]{1,90})/,
  /지원\s*가능\s*한?\s*교단\s*(?:명)?\s*[:：\-–]?\s*([^\n]{1,90})/,
];

/**
 * 본문 글자에서 교단만 뽑는다.
 *
 * 뽑고 나면 본문은 버린다. 부르는 쪽이 글자를 들고 있지 않도록 이 함수가
 * 결과만 돌려주게 두었다.
 */
export function readFromBody(text: string): FromBody {
  const grab = (patterns: RegExp[]) => {
    for (const re of patterns) {
      const hit = text.match(re)?.[1];
      // "예) 장로교, 감리교" 같은 안내 문구가 딸려 오면 거기서 끊는다.
      if (hit) return hit.split(/예\)|예시/)[0].replace(/\d+\s*$/, "").trim();
    }
    return "";
  };

  const ownRaw = grab(OWN_FIELD);
  const acceptRaw = grab(ACCEPT_FIELD);

  // "교단명 : 초교파 교회" 처럼 소속 칸에 적어 두기도 한다. 교단 이름이 아니라
  // 가리지 않는다는 뜻이므로 소속이 아니라 지원 가능 쪽으로 읽는다.
  const 가림없음 = /초교파|교단\s*무관|모든\s*교단|교단\s*불문/;
  const acceptsAll = 가림없음.test(acceptRaw) || 가림없음.test(ownRaw);
  const accepts: Denomination[] = [];
  if (!acceptsAll) {
    // "합동, 합신, 대신, 백석" 처럼 여럿이 온다. 하나씩 끊어 맞춘다.
    for (const piece of acceptRaw.split(/[,·/]|및|그리고/)) {
      const name = normalizeDenomination(piece);
      if (name && !accepts.includes(name)) accepts.push(name);
    }
  }

  return {
    own: 가림없음.test(ownRaw) ? null : normalizeDenomination(ownRaw),
    accepts,
    acceptsAll,
  };
}

/** 교단을 따질 때 필요한 것만 추린 모양. JobListing 과 등록 공고가 함께 쓴다. */
export interface HasDenomination {
  denomination: Guess | null;
  accepts: Denomination[];
  acceptsAll: boolean;
}

/**
 * 이 공고가 내 교단을 받아 주는가.
 *
 * 소속 교단이 같은지보다 "지원 가능 교단"에 내가 들어 있는지가 먼저다.
 * 합동 교회가 "합동, 합신, 대신, 백석 지원 가능"이라고 적어 두었다면,
 * 대신 교단 사람에게 이 자리는 맞는 자리다. 소속만 보면 다른 교단이라고
 * 내쳐 버리게 된다.
 */
export function denominationFit(
  post: HasDenomination,
  wanted: string
): "맞음" | "미표기" | "다름" {
  if (!wanted) return "미표기";
  if (post.acceptsAll) return "맞음";
  if (post.accepts.length > 0) {
    return post.accepts.includes(wanted as Denomination) ? "맞음" : "다름";
  }
  if (!post.denomination) return "미표기";
  return post.denomination.name === wanted ? "맞음" : "다름";
}

/** 화면에 적는 "지원 가능" 한 줄. 받아 주는 교단이 적혀 있을 때만. */
export function describeAccepts(post: HasDenomination): string | null {
  if (post.acceptsAll) return "교단 가리지 않음";
  if (post.accepts.length === 0) return null;
  return `${post.accepts.join("·")} 지원 가능`;
}
