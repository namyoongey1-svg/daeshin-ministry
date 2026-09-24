import { inferEmployment } from "./normalize";
import { parsePlace, placeLabel, type Place } from "@/lib/region";
import type { ScrapedPost } from "./types";
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
  };
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
export function buildListings(posts: ScrapedPost[]): JobListing[] {
  const listings = collapseReposts(posts);
  const counts = countByChurch(listings);
  return listings.map((listing) =>
    listing.church
      ? { ...listing, churchPostings: counts.get(listing.church) ?? 1 }
      : listing
  );
}
