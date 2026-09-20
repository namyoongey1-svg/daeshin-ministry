/** 청빙공고 — Supabase 연결 전까지 쓰는 표본 데이터와 공통 타입 */

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

export const SAMPLE_JOBS: JobPost[] = [
  {
    id: "1", church: "은혜대신교회", presbytery: "서울노회", region: "서울",
    position: "교육전도사", employment: "파트", payMin: 90, payMax: 110,
    payNote: "", housing: false,
    duties: "주일 중고등부 교육 및 수요 예배 보조. 신대원 재학생 지원 가능.",
    deadline: "2026-10-15", createdAt: "2026-09-18",
  },
  {
    id: "2", church: "새언약교회", presbytery: "경기중앙노회", region: "경기",
    position: "부목사", employment: "전임", payMin: 280, payMax: 320,
    payNote: "", housing: true,
    duties: "청년부 전담, 주중 심방. 목사 안수 3년 이상.",
    deadline: "2026-10-30", createdAt: "2026-09-16",
  },
  {
    id: "3", church: "소망대신교회", presbytery: "부산노회", region: "경남·부산·울산",
    position: "찬양사역자", employment: "파트", payMin: null, payMax: null,
    payNote: "당회 논의 중이며 면접 시 구체적으로 안내드립니다.",
    housing: false,
    duties: "주일 1·2부 찬양 인도 및 찬양팀 훈련.",
    deadline: "2026-11-05", createdAt: "2026-09-12",
  },
];

export function formatPay(job: JobPost): string {
  if (job.payMin === null && job.payMax === null) return "면접 시 협의";
  if (job.payMin !== null && job.payMax !== null) {
    return job.payMin === job.payMax
      ? `월 ${job.payMin}만원`
      : `월 ${job.payMin}~${job.payMax}만원`;
  }
  return `월 ${job.payMin ?? job.payMax}만원`;
}
