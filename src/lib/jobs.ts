/** 청빙공고 분류 체계 — 수집 데이터와 직접 등록 공고가 함께 쓴다. */

export const POSITIONS = [
  "담임목사", "부목사", "전도사", "교육전도사", "찬양사역자", "선교사", "행정간사",
] as const;

export const EMPLOYMENT = ["전임", "준전임", "파트", "협동"] as const;

/**
 * 지역은 17개 시·도로 나눈다.
 *
 * 예전에는 "충남·대전·세종"처럼 묶어 둔 자리가 있었다. 공고가 적을
 * 때는 그래도 됐지만, 대전에서 사역할 사람에게 천안 공고를 섞어 보여 주는
 * 셈이었다. 시·군·구까지는 src/lib/region.ts 가 다룬다.
 */
export { SIDO as REGIONS } from "./region";
import type { Sido } from "./region";
export type Region = Sido;

export type Position = (typeof POSITIONS)[number];
export type Employment = (typeof EMPLOYMENT)[number];

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
