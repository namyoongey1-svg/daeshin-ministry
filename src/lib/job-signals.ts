import type { JobListing } from "./scrape/listings";

/*
  공고를 읽는 데 도움이 되는 신호.

  공고에는 적혀 있지 않지만 모아 두면 보이는 것들이다 — 몇 번 다시 올라왔는지,
  올라온 지 얼마나 됐는지, 마감일이 지났는지. 목록에서는 짧은 배지로, 상세에서는
  한 문장으로 보여 주되 규칙은 한곳에 둔다. 두 화면이 다른 말을 하면 안 된다.

  단정하지 않는다. 재게시가 잦다고 꼭 사람을 못 구한 것은 아니고, 마감일이
  지났다고 꼭 끝난 것도 아니다. "가능성이 큽니다"까지만 말하고 해석은 보는
  사람에게 맡긴다.
*/

export interface Signal {
  kind: "closed" | "deadline" | "stale" | "repost" | "church" | "alsoOn";
  /** 목록 배지. 서너 글자. */
  short: string;
  /** 상세 화면의 한 문장 */
  long: string;
  /** warn 은 지원 전에 확인할 것, info 는 알아 두면 좋은 것 */
  tone: "warn" | "info";
}

/** 한국 날짜. 서버는 UTC 라 그대로 두면 아침 아홉 시까지 어제다. */
export function kstToday(now = Date.now()): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** 이만큼 지나야 "오래 떠 있다"고 본다. 일주일은 보통이고, 두 주면 눈에 띈다. */
const STALE_AFTER_DAYS = 14;

export function readSignals(
  job: JobListing,
  sourceLabel: (source: JobListing["source"]) => string,
  today = kstToday()
): Signal[] {
  const out: Signal[] = [];

  if (job.closedAt) {
    out.push({
      kind: "closed",
      short: "마감",
      long: `${longDate(job.closedAt.slice(0, 10))}에 게시판에서 내려갔습니다. 사람을 구했거나 글쓴이가 지웠을 수 있습니다.`,
      tone: "warn",
    });
  } else if (job.deadline && job.deadline < today) {
    out.push({
      kind: "deadline",
      short: "마감일 지남",
      long: `적어 둔 마감일(${job.deadlineText})이 지났지만 아직 게시판에 남아 있습니다. 지원 전에 원문에서 확인하세요.`,
      tone: "warn",
    });
  }

  const age = job.postedAt ? daysBetween(job.postedAt, today) : null;
  if (age !== null && age >= STALE_AFTER_DAYS && !job.closedAt) {
    out.push({
      kind: "stale",
      short: `${age}일째 모집 중`,
      long: `올라온 지 ${age}일이 지났습니다. 그동안 사람을 못 구했거나, 구하고도 글을 내리지 않은 것입니다.`,
      tone: "info",
    });
  }

  if (job.repostCount >= 2) {
    out.push({
      kind: "repost",
      short: `재게시 ${job.repostCount}회`,
      long: `같은 공고가 ${job.repostCount}번 올라왔습니다. 아직 사람을 못 구했을 가능성이 큽니다.`,
      tone: "info",
    });
  }

  if (job.churchPostings >= 3) {
    out.push({
      kind: "church",
      short: `1년 청빙 ${job.churchPostings}회`,
      long: `이 교회는 최근 1년 동안 서로 다른 공고를 ${job.churchPostings}건 올렸습니다. 부서를 늘리는 중일 수도, 사람이 자주 바뀌는 중일 수도 있습니다.`,
      tone: "info",
    });
  }

  if (job.alsoOn.length > 0) {
    const boards = job.alsoOn.map((a) => sourceLabel(a.source)).join("·");
    out.push({
      kind: "alsoOn",
      short: `${job.alsoOn.length + 1}곳에 게시`,
      long: `${boards}에도 같은 자리가 올라와 있습니다. 게시판마다 적어 둔 내용이 달라, 연락처가 한쪽에만 있는 일이 있습니다.`,
      tone: "info",
    });
  }

  return out;
}
