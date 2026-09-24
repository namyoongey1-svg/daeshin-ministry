import { SIDO, parseKeys, type Sido } from "./region";
import { sameDenomination } from "./denomination";
import type { JobListing } from "./scrape/listings";
import type { Employment, Position } from "./jobs";

/*
  조건에 맞는 공고를 점수로 추려 준다.

  거르기와 다른 점이 둘 있다.

  하나, 조건에 다 맞지 않아도 버리지 않는다. "경기 파트 교육전도사"를 찾는
  사람에게 인천 공고를 감추는 것은 친절이 아니다. 아래로 내려 주면 된다.
  다만 하나도 걸리지 않은 것까지 남기면 그건 추천이 아니라 전체 목록이라,
  적은 조건 중 최소 하나는 맞거나 가까워야 줄에 세운다.

  둘, 왜 위에 있는지 적어 준다. 점수만 보여 주면 왜 이 공고가 첫 줄인지 알
  수 없고, 알 수 없으면 믿지 않는다. 무엇이 맞았고 무엇이 달랐는지 그대로 적는다.
*/

export interface Wish {
  /** "서울,경기|성남시 분당구" 꼴. 비우면 전 지역 */
  region: string;
  position: string;
  employment: string;
  department: string;
  /** 바라는 교단. 교회는 같은 교단 사람만 뽑는 일이 많다. */
  denomination: string;
}

export interface Reason {
  label: string;
  kind: "맞음" | "가까움" | "미표기" | "다름";
}

export interface Match {
  post: JobListing;
  score: number;
  reasons: Reason[];
}

/**
 * 붙어 있는 시·도.
 *
 * 경기에서 자리를 찾는 사람은 서울·인천도 함께 본다. 실제로 출퇴근이 되는
 * 거리라서다. 같은 점수를 주지는 않고 "가까움"으로 따로 표시한다.
 */
const NEAR: Partial<Record<Sido, Sido[]>> = {
  서울: ["경기", "인천"],
  경기: ["서울", "인천", "강원", "충북", "충남"],
  인천: ["서울", "경기"],
  강원: ["경기", "충북", "경북"],
  충북: ["대전", "세종", "충남", "경기", "강원", "경북"],
  충남: ["대전", "세종", "충북", "경기", "전북"],
  대전: ["세종", "충남", "충북"],
  세종: ["대전", "충남", "충북"],
  전북: ["전남", "광주", "충남", "경남"],
  전남: ["광주", "전북", "경남"],
  광주: ["전남", "전북"],
  대구: ["경북", "경남"],
  경북: ["대구", "강원", "충북", "경남"],
  경남: ["부산", "울산", "대구", "경북", "전남"],
  부산: ["경남", "울산"],
  울산: ["부산", "경남", "경북"],
};

/** 점수 배분. 지역이 가장 무겁다 — 사역지는 결국 살 곳을 정하는 일이다. */
const WEIGHT = {
  지역정확: 40,
  지역시도: 32,
  지역인접: 12,
  지역미표기: 4,
  // 지역 다음으로 무겁다. 교단이 다르면 아예 안 받는 교회가 흔해, 직분보다
  // 먼저 걸리는 조건인 경우가 많다.
  교단: 30,
  교단미표기: 6,
  /**
   * 교단이 확실히 다를 때 깎는 점수.
   *
   * 다른 칸은 안 맞아도 0점만 주고 끝내는데 교단만 깎는다. 교회가 아예
   * 안 받는 일이 흔해 사실상 지원할 수 없는 자리이기 때문이다. 깎지 않으면
   * 지역과 근무 형태만으로 "잘 맞음"까지 올라와, 헛걸음할 공고를 첫 줄에
   * 올려 주는 셈이 된다.
   */
  교단다름: 20,
  직분: 26,
  직분미표기: 6,
  근무형태: 18,
  근무형태미표기: 5,
  부서: 14,
  부서미표기: 4,
  최근일주일: 10,
  최근한달: 5,
} as const;

const DAY = 24 * 60 * 60 * 1000;

function scoreRegion(post: JobListing, wish: Wish): [number, Reason] | null {
  const wanted = parseKeys(wish.region);
  if (wanted.length === 0) return null;

  const { sido, sigungu } = post.place;
  if (!sido) {
    return [WEIGHT.지역미표기, { label: "지역 미표기", kind: "미표기" }];
  }

  // 구·군까지 고른 사람에게는 그 구가 맞을 때 가장 높은 점수를 준다.
  const exact = wanted.find((w) => w.sido === sido && w.sigungu && w.sigungu === sigungu);
  if (exact) return [WEIGHT.지역정확, { label: `${sido} ${sigungu}`, kind: "맞음" }];

  const sameSido = wanted.find((w) => w.sido === sido);
  if (sameSido) {
    // 시·도만 고른 사람에게는 그 안 어디든 맞는 것이다.
    if (!sameSido.sigungu) return [WEIGHT.지역시도, { label: sido, kind: "맞음" }];
    // 구까지 골랐는데 다른 구면, 같은 시·도인 만큼만 준다.
    return [WEIGHT.지역시도 - 8, { label: `${sido} (다른 구)`, kind: "가까움" }];
  }

  const near = wanted.some((w) => (NEAR[w.sido as Sido] ?? []).includes(sido));
  if (near) return [WEIGHT.지역인접, { label: `${sido} (가까운 지역)`, kind: "가까움" }];

  return [0, { label: sido, kind: "다름" }];
}

export function scorePost(post: JobListing, wish: Wish, now = Date.now()): Match {
  const reasons: Reason[] = [];
  let score = 0;

  const region = scoreRegion(post, wish);
  if (region) {
    score += region[0];
    reasons.push(region[1]);
  }

  if (wish.denomination) {
    const verdict = sameDenomination(wish.denomination, post.denomination);
    if (verdict === "맞음") {
      score += WEIGHT.교단;
      // 무엇을 보고 그렇게 봤는지 그대로 적는다. 게시판으로 짐작한 것을
      // 확정처럼 보여 주면, 교회의 소속 교단이 다를 때 헛걸음하게 된다.
      reasons.push({
        label: post.denomination?.basis === "게시판" ? `${wish.denomination} 쪽` : wish.denomination,
        kind: "맞음",
      });
    } else if (verdict === "미표기") {
      score += WEIGHT.교단미표기;
      reasons.push({ label: "교단 미표기", kind: "미표기" });
    } else {
      score -= WEIGHT.교단다름;
      reasons.push({ label: post.denomination!.name, kind: "다름" });
    }
  }

  if (wish.position) {
    if (post.positions.includes(wish.position as Position)) {
      score += WEIGHT.직분;
      reasons.push({ label: wish.position, kind: "맞음" });
    } else if (post.positions.length === 0) {
      score += WEIGHT.직분미표기;
      reasons.push({ label: "직분 미표기", kind: "미표기" });
    } else {
      reasons.push({ label: post.positions.join("·"), kind: "다름" });
    }
  }

  if (wish.employment) {
    if (post.employment === (wish.employment as Employment)) {
      score += WEIGHT.근무형태;
      reasons.push({ label: wish.employment, kind: "맞음" });
    } else if (!post.employment) {
      score += WEIGHT.근무형태미표기;
      reasons.push({ label: "형태 미표기", kind: "미표기" });
    } else {
      reasons.push({ label: post.employment, kind: "다름" });
    }
  }

  if (wish.department) {
    if (post.departments.includes(wish.department)) {
      score += WEIGHT.부서;
      reasons.push({ label: wish.department, kind: "맞음" });
    } else if (post.departments.length === 0) {
      score += WEIGHT.부서미표기;
      reasons.push({ label: "부서 미표기", kind: "미표기" });
    } else {
      reasons.push({ label: post.departments.join("·"), kind: "다름" });
    }
  }

  // 오래된 공고는 이미 사람을 구했을 가능성이 높다.
  if (post.postedAt) {
    const age = now - Date.parse(post.postedAt);
    if (age <= 7 * DAY) {
      score += WEIGHT.최근일주일;
      reasons.push({ label: "이번 주", kind: "맞음" });
    } else if (age <= 30 * DAY) {
      score += WEIGHT.최근한달;
    }
  }

  return { post, score, reasons };
}

export interface Recommendation {
  matches: Match[];
  /** 조건을 하나라도 적었는가 */
  asked: boolean;
  /** 적은 조건이 전부 진짜로 맞은 건수 */
  perfect: number;
  /** "잘 맞음" 위로 올라온 건수. 사람이 실제로 열어 볼 만한 수 */
  strong: number;
}

/** "이번 주"는 사람이 적은 조건이 아니라 덤이다. 맞았는지 셀 때 빼야 한다. */
const isAsked = (r: Reason) => r.label !== "이번 주";

/**
 * 조건에 가까운 순서로 줄을 세운다.
 *
 * 적은 조건 중 하나도 맞거나 가깝지 않으면 뺀다. 비어 있는 칸에도 점수를 조금
 * 주는데, 그것만으로 올리면 지역도 직분도 안 맞은 공고가 추천으로 딸려 온다.
 * 실제로 그렇게 두니 865건 중 857건이 "추천"으로 나왔다 — 그건 추천이 아니라
 * 그냥 전체 목록이다.
 */
export function recommend(posts: JobListing[], wish: Wish, now = Date.now()): Recommendation {
  const asked = Boolean(
    wish.region || wish.denomination || wish.position || wish.employment || wish.department
  );
  if (!asked) return { matches: [], asked: false, perfect: 0, strong: 0 };

  const asks = [wish.region, wish.denomination, wish.position, wish.employment, wish.department].filter(
    Boolean
  ).length;

  const matches = posts
    .map((post) => scorePost(post, wish, now))
    .filter((m) => m.reasons.some((r) => isAsked(r) && (r.kind === "맞음" || r.kind === "가까움")))
    .sort((a, b) => b.score - a.score || (b.post.postedAt ?? "").localeCompare(a.post.postedAt ?? ""));

  return {
    matches,
    asked: true,
    // 적은 조건이 전부 "맞음"일 때만 센다. 비어 있는 칸을 맞았다고 세면
    // "조건에 다 맞는 것 477건" 같은 숫자가 나와 사람을 속인다.
    perfect: matches.filter(
      (m) => m.reasons.filter((r) => isAsked(r) && r.kind === "맞음").length === asks
    ).length,
    strong: matches.filter((m) => m.score >= 45).length,
  };
}

/** 점수를 사람이 읽는 말로. 숫자는 그 자체로 뜻이 없다. */
export function fitLabel(score: number): string {
  if (score >= 70) return "아주 잘 맞음";
  if (score >= 45) return "잘 맞음";
  if (score >= 25) return "비슷함";
  return "조금 맞음";
}

/** 조건을 한 줄로. 알림 화면과 같은 말을 쓴다. */
export function describeWish(wish: Wish): string {
  const parts = [
    parseKeys(wish.region).map((k) => (k.sigungu ? `${k.sido} ${k.sigungu}` : k.sido)).join(", "),
    wish.denomination,
    wish.position,
    wish.employment,
    wish.department,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "전체";
}

export const ALL_SIDO = SIDO;
