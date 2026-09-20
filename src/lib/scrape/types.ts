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
  collectedAt: string;
}

export interface SourceAdapter {
  id: SourceId;
  label: string;
  homepage: string;
  /** 한 페이지에 실리는 건수 — 진행 표시에 쓴다. */
  pageSize: number;
  /** 1부터 시작. 더 없으면 빈 배열을 돌려준다. */
  fetchPage(page: number): Promise<ScrapedPost[]>;
}
