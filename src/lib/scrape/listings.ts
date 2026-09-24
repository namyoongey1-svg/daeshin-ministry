import { inferEmployment } from "./normalize";
import { parsePlace, placeLabel, type Place } from "@/lib/region";
import { guessDenomination, type Denomination, type Guess } from "@/lib/denomination";
import type { ScrapedPost, SourceId } from "./types";
import type { Employment } from "@/lib/jobs";

/*
  수집한 글을 화면에 내보낼 모양으로 다듬는다.

  파일을 읽거나 Supabase에 붙는 일은 여기서 하지 않는다. 순수 계산만 두어야
  알림을 보내는 스크립트에서도 같은 규칙을 그대로 쓸 수 있다.
*/

/** 화면에 내보내는 한 건 — 같은 공고의 재게시를 하나로 묶은 결과다. */
export interface JobListing extends ScrapedPost {
  /** 같은 내용이 올라온 횟수. 1이면 한 번만 올라온 공고다. */
  repostCount: number;
  /** 태그와 제목에서 읽어 낸 근무 형태. 못 알아보면 null */
  employment: Employment | null;
  /** 화면에 쓸 위치. 구까지 알면 구까지 */
  location: string;
  /** 시·도와 시·군·구로 나눈 위치. 필터가 이것을 본다. */
  place: Place;
  /**
   * 이 교회가 최근 1년 안에 올린 서로 다른 청빙공고 수.
   *
   * 여러 번 찾는다는 것이 곧 나쁜 교회라는 뜻은 아니다. 부서를 늘리는 중일
   * 수도 있고, 사람이 자주 바뀌는 중일 수도 있다. 다만 공고에는 적히지 않는
   * 사실이라, 숫자만 보여 주고 해석은 보는 사람에게 맡긴다.
   */
  churchPostings: number;
  /**
   * 같은 자리가 걸려 있는 다른 게시판.
   *
   * 한 교회가 갓피플에도 청빙넷에도 같은 자리를 올린다. 목록에서는 하나로
   * 접되 원문 링크는 버리지 않는다 — 게시판마다 적어 둔 내용이 달라서,
   * 접힌 쪽에만 연락처가 있는 일이 있다.
   */
  alsoOn: { source: SourceId; url: string }[];
  /**
   * 짐작한 교단. 모르면 null.
   *
   * 게시판마다 교단 칸이 없어 이름과 출처에서 읽어 낸다. 무엇을 보고 그렇게
   * 봤는지(basis)까지 들고 다녀야 화면에서 "백석대 게시판 기준"이라고 밝힐 수
   * 있다 — 교회의 소속 교단과 늘 같지는 않기 때문이다.
   */
  denomination: Guess | null;
  /**
   * 이 교회가 지원을 받아 주는 교단들. 본문에 적혀 있을 때만 채워진다.
   *
   * 소속 교단보다 이쪽이 구직자에게 더 쓸모 있다. 알고 싶은 것은 "저 교회가
   * 무슨 교단인가"가 아니라 "내가 지원할 수 있는가"이기 때문이다.
   */
  accepts: Denomination[];
  /** 교단을 가리지 않는다고 적혀 있는가 */
  acceptsAll: boolean;
}

/**
 * 수집 데이터에는 없는, 화면에서 필요한 값을 붙인다.
 *
 * 지역은 출처가 "서울 외"처럼 두루뭉술하게 적어 두는 일이 많다. 그럴 때는
 * 제목 문장에서 한 번 더 찾아본다. ("…군포시 부곡동에서 사역자를…")
 */
export function decorate(
  post: ScrapedPost,
  repostCount: number,
  churchPostings = 1
): JobListing {
  // 저장된 region 을 그대로 믿지 않고 원문 표기에서 다시 읽는다. 예전에 "서울 외"를
  // 서울로 잘못 넣어 둔 값들이 남아 있어, 여기서 고쳐야 다시 수집하지 않아도 맞는다.
  const fromRaw = parsePlace(post.regionRaw);
  const place = fromRaw.sido ? fromRaw : parsePlace(post.title);
  return {
    ...post,
    region: place.sido,
    place,
    repostCount,
    employment: inferEmployment([...post.tagsRaw, post.title], post.positions),
    location: placeLabel(place),
    churchPostings,
    alsoOn: [],
    // 합친 뒤에 다시 매긴다. 다른 게시판이 교단을 말해 줄 수 있어서다.
    denomination: guessDenomination(post.church, post.title, post.source),
    accepts: [],
    acceptsAll: false,
  };
}

const DAY = 24 * 60 * 60 * 1000;
/**
 * 같은 자리로 볼 수 있는 최대 간격.
 *
 * 게시판마다 올리는 날이 며칠씩 어긋난다. 한 달 반을 넘기면 지난번에 못
 * 구해 다시 올린 것으로 보고 따로 센다.
 */
const SAME_SPELL = 45 * DAY;

/** 자리에 대해 아무것도 알려 주지 않는 글. 백석대 게시판은 "[지역] 교회명"만 올린다. */
function isStub(l: JobListing): boolean {
  return l.positions.length === 0 && !l.employment && l.departments.length === 0;
}

function within(a: JobListing, b: JobListing): boolean {
  if (!a.postedAt || !b.postedAt) return false;
  return Math.abs(Date.parse(a.postedAt) - Date.parse(b.postedAt)) <= SAME_SPELL;
}

/** 한쪽이 구까지 안 적었으면 시·도만 맞아도 같은 곳으로 본다. */
function samePlace(a: JobListing, b: JobListing): boolean {
  if (a.place.sido !== b.place.sido) return false;
  if (!a.place.sigungu || !b.place.sigungu) return true;
  return a.place.sigungu === b.place.sigungu;
}

function subset(a: string[], b: string[]): boolean {
  return a.every((x) => b.includes(x));
}

/**
 * 같은 자리인가.
 *
 * 제목이 닮았는지로는 가릴 수 없다. 한 교회가 여러 자리를 올릴 때 "○○교회
 * 부교역자 초빙"이라는 같은 문구를 쓰기 때문이다. 실제로 전임사역자 공고와
 * 파트사역자 공고가 제목 닮음 0.70으로 가장 닮은 짝이었다 — 서로 다른 자리다.
 *
 * 그래서 읽어 낸 자리 정보만 본다. 근무 형태와 부서는 똑같아야 하고, 직분은
 * 한쪽이 다른 쪽에 들어가면 된다. 게시판마다 제목 표현이 달라 읽히는 직분
 * 수가 어긋나는데(청빙넷 "부목사", 갓피플 "부목사·전도사"), 똑같기를 요구하면
 * 실제 데이터에서 한 건도 안 걸린다.
 */
function sameRole(a: JobListing, b: JobListing): boolean {
  if (a.employment !== b.employment) return false;
  if (a.departments.join() !== b.departments.join()) return false;
  return subset(a.positions, b.positions) || subset(b.positions, a.positions);
}

/** 자리 정보를 더 많이 담은 쪽. 같으면 최근 것. */
function richer(a: JobListing, b: JobListing): JobListing {
  const weigh = (l: JobListing) =>
    l.positions.length + l.departments.length + (l.employment ? 1 : 0);
  if (weigh(a) !== weigh(b)) return weigh(a) > weigh(b) ? a : b;
  return (a.postedAt ?? "") >= (b.postedAt ?? "") ? a : b;
}

/** 접힌 글의 링크와, 더 정확한 지역 표기를 대표 글에 옮긴다. */
function absorb(keep: JobListing, drop: JobListing): JobListing {
  // 백석대 글은 자리 정보는 없어도 구까지 적어 둔다. 갓피플이 "대전"이라고만
  // 한 자리가 "대전 유성구"로 또렷해진다.
  const place = !keep.place.sigungu && drop.place.sigungu ? drop.place : keep.place;
  return {
    ...keep,
    place,
    region: place.sido,
    location: placeLabel(place),
    // 더하지 않는다. 재게시 횟수는 "같은 게시판에 몇 번 다시 올렸나"라서
    // 아직 사람을 못 구했다는 신호로 읽힌다. 세 게시판에 한 번씩 올린 것을
    // 3회로 세면 없는 다급함을 지어내는 셈이다.
    repostCount: Math.max(keep.repostCount, drop.repostCount),
    alsoOn: [...keep.alsoOn, { source: drop.source, url: drop.url }, ...drop.alsoOn],
  };
}

/**
 * 게시판을 가로질러 같은 자리를 하나로 묶는다.
 *
 * 교회 이름만으로 묶으면 안 된다. 호산나교회도 예수로교회도 전국에 여럿이라,
 * 파주 예수로교회와 서울 예수로교회가 한 줄이 되어 버린다. 이름과 지역이
 * 함께 맞을 때만 후보로 본다.
 *
 * 알맹이 없는 글은 다른 글을 이어 주는 다리가 되지 못하게 한다. 한 교회가
 * 전임·파트·여전도사 셋을 따로 올렸는데 백석대 글 하나가 그 셋 모두와
 * 맞으면, 다리로 두는 순간 서로 다른 자리 셋이 한 줄로 뭉친다.
 */
export function mergeAcrossSources(listings: JobListing[]): JobListing[] {
  const groups = new Map<string, JobListing[]>();
  const loose: JobListing[] = [];
  for (const l of listings) {
    if (!l.church || !l.place.sido) {
      loose.push(l);
      continue;
    }
    const key = `${l.church}|${l.place.sido}`;
    const arr = groups.get(key);
    if (arr) arr.push(l);
    else groups.set(key, [l]);
  }

  const out = [...loose];
  for (const arr of groups.values()) {
    let rich = arr.filter((l) => !isStub(l));
    const stubs = arr.filter(isStub);

    // 하나, 알맹이 있는 글끼리 같은 자리면 묶는다.
    for (let i = 0; i < rich.length; i++) {
      for (let j = i + 1; j < rich.length; j++) {
        const a = rich[i], b = rich[j];
        if (a.source === b.source || !samePlace(a, b) || !within(a, b)) continue;
        if (!sameRole(a, b)) continue;
        const keep = richer(a, b);
        rich[i] = absorb(keep, keep === a ? b : a);
        rich.splice(j, 1);
        j--;
      }
    }

    // 둘, 알맹이 없는 글은 가장 잘 맞는 글 하나에만 접어 넣는다.
    const leftover: JobListing[] = [];
    for (const stub of stubs) {
      const host = rich.find(
        (r) => r.source !== stub.source && samePlace(r, stub) && within(r, stub)
      );
      if (!host) {
        leftover.push(stub);
        continue;
      }
      rich = rich.map((r) => (r === host ? absorb(host, stub) : r));
    }

    out.push(...rich, ...leftover);
  }

  return out.sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * 교회별로 최근 1년 안에 올린 서로 다른 공고 수를 센다.
 * 재게시는 이미 묶인 뒤라 한 번으로 친다.
 */
export function countByChurch(
  listings: JobListing[],
  now = Date.now()
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    if (!listing.church) continue;
    if (listing.postedAt && now - Date.parse(listing.postedAt) > YEAR_MS) continue;
    counts.set(listing.church, (counts.get(listing.church) ?? 0) + 1);
  }
  return counts;
}

/**
 * 교회들은 목록 위로 올리려고 같은 공고를 여러 번 다시 올린다.
 * 화면에서는 하나로 묶되, 몇 번 올라와 있는지는 함께 알린다.
 * 재게시가 잦다는 것은 아직 사람을 못 구했다는 뜻이라 구직자에게 쓸모가 있다.
 */
export function collapseReposts(posts: ScrapedPost[]): JobListing[] {
  const groups = new Map<string, JobListing>();

  for (const post of posts) {
    const key = `${post.source}|${post.church ?? ""}|${post.title}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, decorate(post, post.listingCount ?? 1));
      continue;
    }

    const count = existing.repostCount + (post.listingCount ?? 1);
    // 가장 최근 것을 대표로 남긴다.
    if ((post.postedAt ?? "") > (existing.postedAt ?? "")) {
      groups.set(key, decorate(post, count));
    } else {
      existing.repostCount = count;
    }
  }

  return [...groups.values()].sort((a, b) =>
    (b.postedAt ?? "").localeCompare(a.postedAt ?? "")
  );
}

/** 묶은 뒤 교회별 횟수까지 채운 목록. 화면과 알림이 함께 쓴다. */
/**
 * 본문에서 읽어 둔 교단을 덮어씌운다.
 *
 * 게시판으로 짐작한 값보다 본문에 적힌 값이 세다. 백석대 게시판에 올렸다고
 * 다 백석 교회가 아니다 — 실제로 읽어 보면 합동·고신·독립교단이 더 많다.
 * 게시판 신호는 "이 교단 사람을 찾는다"는 뜻이지 교회의 소속이 아니었다.
 */
export function applyDenominations(
  listings: JobListing[],
  book: Record<string, { own: Denomination | null; accepts: Denomination[]; acceptsAll: boolean }>
): JobListing[] {
  return listings.map((listing) => {
    const entry = book[`${listing.source}:${listing.externalId}`];
    if (!entry) return listing;
    return {
      ...listing,
      denomination: entry.own ? { name: entry.own, basis: "본문" } : listing.denomination,
      accepts: entry.accepts,
      acceptsAll: entry.acceptsAll,
    };
  });
}

export function buildListings(posts: ScrapedPost[]): JobListing[] {
  const listings = mergeAcrossSources(collapseReposts(posts));
  const counts = countByChurch(listings);
  return listings.map((listing) => ({
    ...listing,
    churchPostings: listing.church ? counts.get(listing.church) ?? 1 : listing.churchPostings,
    // 합쳐진 공고는 대표 게시판만 보면 교단 신호를 놓친다.
    denomination: guessDenomination(
      listing.church,
      listing.title,
      listing.source,
      listing.alsoOn.map((a) => a.source)
    ),
  }));
}
