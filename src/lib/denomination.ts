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
  basis: "이름" | "게시판";
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
