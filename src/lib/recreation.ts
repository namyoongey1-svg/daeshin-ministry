/*
  교회 레크리에이션 나눔.

  수련회나 공동체 모임을 준비할 때마다 같은 것을 처음부터 다시 짠다.
  해 본 사람이 적어 두면 다음 사람이 그대로 쓸 수 있다.

  인원·장소·시간·준비물을 본문과 따로 받는다. 본문에 섞어 적으면 "우리가
  할 수 있는 놀이인가"를 알려고 글을 끝까지 읽어야 한다. 중고등부 30명,
  실내, 20분짜리를 찾는 사람이 목록에서 바로 걸러 낼 수 있어야 한다.
*/

export const CATEGORIES = [
  "아이스브레이킹",
  "팀 대항",
  "성경 퀴즈",
  "찬양 게임",
  "협동",
  "정적인 놀이",
  "기타",
] as const;

export const PLACES = ["실내", "야외", "상관없음"] as const;

export const AGE_GROUPS = [
  "전체",
  "유초등부",
  "중고등부",
  "청년부",
  "장년부",
  "어른아이 함께",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Place = (typeof PLACES)[number];
export type AgeGroup = (typeof AGE_GROUPS)[number];

export interface Recreation {
  id: string;
  title: string;
  category: string;
  min_people: number | null;
  max_people: number | null;
  place: string;
  minutes: number | null;
  age_group: string;
  supplies: string;
  body: string;
  created_at: string;
  like_count: number;
  liked: boolean;
  mine: boolean;
}

/** "15~30명" / "10명 이상" / "인원 상관없음" */
export function describePeople(min: number | null, max: number | null): string {
  if (min && max) return min === max ? `${min}명` : `${min}~${max}명`;
  if (min) return `${min}명 이상`;
  if (max) return `${max}명까지`;
  return "인원 상관없음";
}

/** 목록에서 한 줄로 훑을 수 있게 조건을 붙여 적는다. */
export function describeSetup(item: Recreation): string {
  return [
    describePeople(item.min_people, item.max_people),
    item.place,
    item.minutes ? `${item.minutes}분` : null,
    item.age_group === "전체" ? null : item.age_group,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * 고른 조건에 드는가.
 *
 * 적어 두지 않은 칸은 걸러 내지 않는다. 인원을 안 적은 놀이가 30명을 찾는
 * 사람에게서 사라지면, 정작 쓸 만한 것을 못 보게 된다. 지역을 다룰 때와
 * 같은 규칙이다.
 */
export function matchesFilter(
  item: Recreation,
  filter: { category?: string; place?: string; age?: string; people?: number }
): boolean {
  if (filter.category && item.category !== filter.category) return false;
  if (filter.place && item.place !== "상관없음" && item.place !== filter.place) return false;
  if (filter.age && item.age_group !== "전체" && item.age_group !== filter.age) return false;
  if (filter.people) {
    if (item.min_people && filter.people < item.min_people) return false;
    if (item.max_people && filter.people > item.max_people) return false;
  }
  return true;
}
