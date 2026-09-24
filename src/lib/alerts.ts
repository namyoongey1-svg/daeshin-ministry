import type { Employment, Position, Region } from "./jobs";
import type { JobListing } from "./scrape/listings";
import { denominationFit } from "./denomination";

/**
 * 새 공고 알림 구독.
 *
 * 비워 둔 칸은 "전체"를 뜻한다. 셋 다 비우면 올라오는 모든 공고를 받는다.
 */
export interface JobAlert {
  id: string;
  region: Region | null;
  denomination: string | null;
  position: Position | null;
  employment: Employment | null;
  active: boolean;
  last_notified_at: string | null;
  created_at: string;
}

/** 저장할 때 쓰는 모양 — 빈 문자열은 null로 눕힌다. */
export interface AlertInput {
  region: string | null;
  /** 바라는 교단. 교단이 안 적힌 공고는 걸러 내지 않는다. */
  denomination: string | null;
  position: string | null;
  employment: string | null;
}

export function normalizeAlertInput(form: {
  region?: string;
  denomination?: string;
  position?: string;
  employment?: string;
}): AlertInput {
  const clean = (v?: string) => {
    const t = (v ?? "").trim();
    return t === "" ? null : t;
  };
  return {
    region: clean(form.region),
    denomination: clean(form.denomination),
    position: clean(form.position),
    employment: clean(form.employment),
  };
}

/** 사람이 읽을 수 있는 한 줄로. "경기 · 교육전도사 · 파트" */
export function describeAlert(alert: AlertInput): string {
  const parts = [alert.region, alert.denomination, alert.position, alert.employment].filter(Boolean);
  return parts.length ? parts.join(" · ") : "모든 새 공고";
}

/** 이 공고가 구독 조건에 드는가. 비워 둔 칸은 아무거나 통과시킨다. */
export function matchesAlert(post: JobListing, alert: AlertInput): boolean {
  if (alert.region && post.region !== alert.region) return false;
  // 교단을 모르는 공고는 빼지 않는다. 목록 거르기와 같은 규칙이다 — 안 적혀
  // 있다는 이유로 메일에서 빼면, 정작 맞는 자리를 영영 못 보게 된다.
  if (alert.denomination && denominationFit(post, alert.denomination) === "다름") return false;
  if (alert.position && !post.positions.includes(alert.position as Position)) return false;
  if (alert.employment && post.employment !== alert.employment) return false;
  return true;
}

/**
 * 구독 조건에 새로 든 공고만 고른다.
 *
 * `since` 이후에 올라온 것만 본다. 처음 구독한 사람에게 지난 공고를 몰아
 * 보내지 않도록, 부르는 쪽에서 구독 시각을 넘긴다.
 */
export function newMatches(
  posts: JobListing[],
  alert: AlertInput,
  since: string | null
): JobListing[] {
  const floor = since ? Date.parse(since) : 0;
  return posts.filter((post) => {
    if (!matchesAlert(post, alert)) return false;
    if (!post.postedAt) return false;
    // 날짜만 있는 값이라 그날 0시로 읽힌다. 같은 날 공고를 놓치지 않도록
    // 하루를 더해 비교한다.
    return Date.parse(post.postedAt) + 24 * 60 * 60 * 1000 > floor;
  });
}
