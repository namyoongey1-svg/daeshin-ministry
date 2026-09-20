export type Lang = "grc" | "hbo";

/** 형태소 코드 한 항목: "시제 = 부정과거 (A)" */
export interface Feature {
  label: string;
  value: string;
  code: string;
}

/** 원어 본문의 낱말 하나 */
export interface Word {
  /** BBCCVV 형식 절 식별자. 예: "430301" = 요한복음 3장 1절 */
  ref: string;
  /** 본문에 나타난 형태 (구두점 포함) */
  text: string;
  /** 구두점을 뺀 형태 */
  word: string;
  /** 악센트를 정규화한 형태 (검색용) */
  normalized: string;
  /** 사전형 */
  lemma: string;
  /** 품사 코드 (헬라어 2자, 히브리어 1자) */
  pos: string;
  /** 형태소 파싱 코드 원문 */
  parse: string;
  /** 스트롱 번호 (있을 때) */
  strong?: string;
}

/** 해석이 끝난 낱말 */
export interface AnalyzedWord extends Word {
  lang: Lang;
  posLabel: string;
  features: Feature[];
  /** "동사 · 부정과거 능동 직설법 3인칭 단수" */
  summary: string;
  /** 설교 준비에 쓸 문법적 함의 */
  sermonNotes: string[];
  gloss?: string;
}

export interface Verse {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
  lang: Lang;
  words: AnalyzedWord[];
}
