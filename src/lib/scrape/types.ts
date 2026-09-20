import type { Position, Region } from "@/lib/jobs";

export type SourceId = "godpeople" | "baekseok" | "aats";

/**
 * 외부 청빙게시판에서 모아 오는 한 건.
 *
 * 일부러 담지 않는 것: 게시물 본문, 담당자 이름·전화·이메일.
 * 본문은 저작물이고 연락처는 개인정보라, 원문 링크로 보낸다.
 * 여기 있는 항목은 모두 "어느 교회가 어떤 사람을 언제까지 찾는가"라는 사실이다.
 */
export interface ScrapedPost {
  source: SourceId;
  /** 출처 안에서의 고유 식별자. 중복 제거 키로 쓴다. */
  externalId: string;
  /** 원문 링크 — 사용자는 여기로 가서 본문과 연락처를 본다. */
  url: string;
  title: string;
  church: string | null;
  /** 출처가 적어 놓은 지역 문자열 그대로 */
  regionRaw: string | null;
  region: Region | null;
  positions: Position[];
  /** 유초등부·중고등부처럼 부서를 가리키는 꼬리표 */
  departments: string[];
  /** 출처가 붙여 둔 꼬리표 원문 — 분류가 틀렸을 때 확인용이다. */
  tagsRaw: string[];
  /** ISO 날짜. 연도를 알 수 없으면 추정하지 않고 null로 둔다. */
  postedAt: string | null;
  deadline: string | null;
  /** "채용시까지"처럼 날짜가 아닌 마감 표기 */
  deadlineText: string | null;
  /** 처음 수집한 시각. 다시 볼 때마다 바꾸지 않는다 — 아래 주석 참고. */
  collectedAt: string;
  /**
   * 마지막 수집 때 출처 목록에 이 공고가 몇 줄로 올라와 있었는가.
   * 교회가 목록 위로 올리려고 같은 글을 다시 올리면 2 이상이 된다.
   */
  listingCount?: number;
  /**
   * 출처 목록에서 사라진 시각. 갓피플처럼 목록이 "현재 모집 중"을 뜻하는
   * 곳에서만 채워진다. 게시판형 출처(백석대·총신대)는 지난 글도 계속 남아
   * 있어 사라짐을 마감으로 볼 수 없다.
   */
  closedAt?: string | null;
}

export interface SourceAdapter {
  id: SourceId;
  label: string;
  homepage: string;
  /** 한 페이지에 실리는 건수 — 진행 표시에 쓴다. */
  pageSize: number;
  /**
   * 목록이 "현재 모집 중인 공고 전체"를 뜻하는가.
   * 참이면 끝까지 훑어, 목록에서 빠진 공고를 마감으로 표시한다.
   */
  activeListing?: boolean;
  /** 1부터 시작. 더 없으면 빈 배열을 돌려준다. */
  fetchPage(page: number): Promise<ScrapedPost[]>;
}
