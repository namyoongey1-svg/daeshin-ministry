/** 익명 사역 Q&A의 공통 타입과 분류 */

export const TOPICS = [
  "사례비·처우",
  "청빙·이직",
  "목회 고민",
  "교회 행정",
  "설교 준비",
  "기타",
] as const;

export type Topic = (typeof TOPICS)[number];

/** questions_public 뷰가 내보내는 모양. 글쓴이 칸은 들어 있지 않다. */
export interface Question {
  id: string;
  topic: string;
  title: string;
  body: string;
  created_at: string;
  answer_count: number;
  /** 내가 쓴 글인가 */
  mine: boolean;
}

export interface Answer {
  id: string;
  question_id: string;
  body: string;
  created_at: string;
  mine: boolean;
}

/** "3분 전", "2일 전" — 익명 글이라 정확한 시각은 오히려 단서가 된다. */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = now - Date.parse(iso);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}일 전`;
  return `${Math.floor(diff / (30 * day))}달 전`;
}
