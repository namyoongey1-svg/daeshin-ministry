/** 청빙공고 분류 체계 — 수집 데이터와 직접 등록 공고가 함께 쓴다. */

export const POSITIONS = [
  "담임목사", "부목사", "전도사", "교육전도사", "찬양사역자", "선교사", "행정간사",
] as const;

export const EMPLOYMENT = ["전임", "파트", "협동"] as const;

export const REGIONS = [
  "서울", "경기", "인천", "강원", "충북", "충남·대전·세종", "전북",
  "전남·광주", "경북·대구", "경남·부산·울산", "제주", "해외",
] as const;

export type Position = (typeof POSITIONS)[number];
export type Employment = (typeof EMPLOYMENT)[number];
export type Region = (typeof REGIONS)[number];

export interface JobPost {
  id: string;
  church: string;
  presbytery: string;
  region: Region;
  position: Position;
  employment: Employment;
  /** 월 사례비(만원). 비공개면 null이고 사유를 적는다. */
  payMin: number | null;
  payMax: number | null;
  payNote: string;
  housing: boolean;
  duties: string;
  deadline: string;
  createdAt: string;
}
