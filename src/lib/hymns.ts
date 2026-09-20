import hymnData from "@/data/hymns.json";

/**
 * 새찬송가 목록.
 *
 * 번호와 제목, 분류만 담는다. **가사는 담지 않는다** — 한국찬송가공회가
 * 저작권을 가진 본문이라 사이트에 실을 수 없다. 주보에 적을 때 필요한 것은
 * 번호와 제목뿐이고, 그건 목록을 가리키는 사실 정보다.
 */
export interface Hymn {
  /** 새찬송가 번호 */
  n: number;
  /** 제목 */
  t: string;
  /** 분류 — 송영, 경배, 예배 마침 … */
  cat: string;
  /** 통일찬송가 번호. 옛 찬송가를 쓰는 교회를 위해 둔다. */
  tong: number | null;
}

export const HYMNS = hymnData as Hymn[];

const BY_NUMBER = new Map(HYMNS.map((h) => [h.n, h]));

export function findHymn(n: number): Hymn | undefined {
  return BY_NUMBER.get(n);
}

/** 번호로도 제목으로도 찾는다. 주보 쓰다 제목이 헷갈릴 때 쓴다. */
export function searchHymns(query: string, limit = 12): Hymn[] {
  const q = query.trim();
  if (!q) return [];

  const asNumber = Number(q);
  if (Number.isInteger(asNumber) && asNumber > 0) {
    const exact = findHymn(asNumber);
    const near = HYMNS.filter(
      (h) => h.n !== asNumber && String(h.n).startsWith(q)
    ).slice(0, limit - (exact ? 1 : 0));
    return exact ? [exact, ...near] : near;
  }

  const lowered = q.toLowerCase();
  return HYMNS.filter((h) => h.t.toLowerCase().includes(lowered)).slice(0, limit);
}

/**
 * 주보 비고 칸에 적은 찬송가 번호에 제목을 붙인다.
 *
 *   "찬송가 21장"  →  "찬송가 21장 (주 예수 이름 높이어)"
 *   "21장"         →  "찬송가 21장 (주 예수 이름 높이어)"
 *
 * 이미 제목이 붙어 있거나 번호를 못 찾으면 손대지 않는다.
 */
export function tidyHymn(note: string): string {
  const text = note.trim();
  if (!text || text.includes("(")) return note;

  const m = text.match(/^(?:찬송가\s*)?(\d{1,3})\s*장$/);
  if (!m) return note;

  const hymn = findHymn(Number(m[1]));
  return hymn ? `찬송가 ${hymn.n}장 (${hymn.t})` : note;
}
