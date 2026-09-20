export interface Book {
  /** OSIS 약어 (히브리어 데이터 키) */
  osis: string;
  ko: string;
  /** 한글 관용 약어 — 검색창에서 "요 3:16"으로 찾을 때 쓴다 */
  abbr: string;
  testament: "ot" | "nt";
  chapters: number;
  /** MorphGNT 책 번호 (신약 01~27) */
  gnt?: number;
}

export const BOOKS: Book[] = [
  { osis: "Gen", ko: "창세기", abbr: "창", testament: "ot", chapters: 50 },
  { osis: "Exod", ko: "출애굽기", abbr: "출", testament: "ot", chapters: 40 },
  { osis: "Lev", ko: "레위기", abbr: "레", testament: "ot", chapters: 27 },
  { osis: "Num", ko: "민수기", abbr: "민", testament: "ot", chapters: 36 },
  { osis: "Deut", ko: "신명기", abbr: "신", testament: "ot", chapters: 34 },
  { osis: "Josh", ko: "여호수아", abbr: "수", testament: "ot", chapters: 24 },
  { osis: "Judg", ko: "사사기", abbr: "삿", testament: "ot", chapters: 21 },
  { osis: "Ruth", ko: "룻기", abbr: "룻", testament: "ot", chapters: 4 },
  { osis: "1Sam", ko: "사무엘상", abbr: "삼상", testament: "ot", chapters: 31 },
  { osis: "2Sam", ko: "사무엘하", abbr: "삼하", testament: "ot", chapters: 24 },
  { osis: "1Kgs", ko: "열왕기상", abbr: "왕상", testament: "ot", chapters: 22 },
  { osis: "2Kgs", ko: "열왕기하", abbr: "왕하", testament: "ot", chapters: 25 },
  { osis: "1Chr", ko: "역대상", abbr: "대상", testament: "ot", chapters: 29 },
  { osis: "2Chr", ko: "역대하", abbr: "대하", testament: "ot", chapters: 36 },
  { osis: "Ezra", ko: "에스라", abbr: "스", testament: "ot", chapters: 10 },
  { osis: "Neh", ko: "느헤미야", abbr: "느", testament: "ot", chapters: 13 },
  { osis: "Esth", ko: "에스더", abbr: "에", testament: "ot", chapters: 10 },
  { osis: "Job", ko: "욥기", abbr: "욥", testament: "ot", chapters: 42 },
  { osis: "Ps", ko: "시편", abbr: "시", testament: "ot", chapters: 150 },
  { osis: "Prov", ko: "잠언", abbr: "잠", testament: "ot", chapters: 31 },
  { osis: "Eccl", ko: "전도서", abbr: "전", testament: "ot", chapters: 12 },
  { osis: "Song", ko: "아가", abbr: "아", testament: "ot", chapters: 8 },
  { osis: "Isa", ko: "이사야", abbr: "사", testament: "ot", chapters: 66 },
  { osis: "Jer", ko: "예레미야", abbr: "렘", testament: "ot", chapters: 52 },
  { osis: "Lam", ko: "예레미야애가", abbr: "애", testament: "ot", chapters: 5 },
  { osis: "Ezek", ko: "에스겔", abbr: "겔", testament: "ot", chapters: 48 },
  { osis: "Dan", ko: "다니엘", abbr: "단", testament: "ot", chapters: 12 },
  { osis: "Hos", ko: "호세아", abbr: "호", testament: "ot", chapters: 14 },
  { osis: "Joel", ko: "요엘", abbr: "욜", testament: "ot", chapters: 3 },
  { osis: "Amos", ko: "아모스", abbr: "암", testament: "ot", chapters: 9 },
  { osis: "Obad", ko: "오바댜", abbr: "옵", testament: "ot", chapters: 1 },
  { osis: "Jonah", ko: "요나", abbr: "욘", testament: "ot", chapters: 4 },
  { osis: "Mic", ko: "미가", abbr: "미", testament: "ot", chapters: 7 },
  { osis: "Nah", ko: "나훔", abbr: "나", testament: "ot", chapters: 3 },
  { osis: "Hab", ko: "하박국", abbr: "합", testament: "ot", chapters: 3 },
  { osis: "Zeph", ko: "스바냐", abbr: "습", testament: "ot", chapters: 3 },
  { osis: "Hag", ko: "학개", abbr: "학", testament: "ot", chapters: 2 },
  { osis: "Zech", ko: "스가랴", abbr: "슥", testament: "ot", chapters: 14 },
  { osis: "Mal", ko: "말라기", abbr: "말", testament: "ot", chapters: 4 },
  { osis: "Matt", ko: "마태복음", abbr: "마", testament: "nt", chapters: 28, gnt: 1 },
  { osis: "Mark", ko: "마가복음", abbr: "막", testament: "nt", chapters: 16, gnt: 2 },
  { osis: "Luke", ko: "누가복음", abbr: "눅", testament: "nt", chapters: 24, gnt: 3 },
  { osis: "John", ko: "요한복음", abbr: "요", testament: "nt", chapters: 21, gnt: 4 },
  { osis: "Acts", ko: "사도행전", abbr: "행", testament: "nt", chapters: 28, gnt: 5 },
  { osis: "Rom", ko: "로마서", abbr: "롬", testament: "nt", chapters: 16, gnt: 6 },
  { osis: "1Cor", ko: "고린도전서", abbr: "고전", testament: "nt", chapters: 16, gnt: 7 },
  { osis: "2Cor", ko: "고린도후서", abbr: "고후", testament: "nt", chapters: 13, gnt: 8 },
  { osis: "Gal", ko: "갈라디아서", abbr: "갈", testament: "nt", chapters: 6, gnt: 9 },
  { osis: "Eph", ko: "에베소서", abbr: "엡", testament: "nt", chapters: 6, gnt: 10 },
  { osis: "Phil", ko: "빌립보서", abbr: "빌", testament: "nt", chapters: 4, gnt: 11 },
  { osis: "Col", ko: "골로새서", abbr: "골", testament: "nt", chapters: 4, gnt: 12 },
  { osis: "1Thess", ko: "데살로니가전서", abbr: "살전", testament: "nt", chapters: 5, gnt: 13 },
  { osis: "2Thess", ko: "데살로니가후서", abbr: "살후", testament: "nt", chapters: 3, gnt: 14 },
  { osis: "1Tim", ko: "디모데전서", abbr: "딤전", testament: "nt", chapters: 6, gnt: 15 },
  { osis: "2Tim", ko: "디모데후서", abbr: "딤후", testament: "nt", chapters: 4, gnt: 16 },
  { osis: "Titus", ko: "디도서", abbr: "딛", testament: "nt", chapters: 3, gnt: 17 },
  { osis: "Phlm", ko: "빌레몬서", abbr: "몬", testament: "nt", chapters: 1, gnt: 18 },
  { osis: "Heb", ko: "히브리서", abbr: "히", testament: "nt", chapters: 13, gnt: 19 },
  { osis: "Jas", ko: "야고보서", abbr: "약", testament: "nt", chapters: 5, gnt: 20 },
  { osis: "1Pet", ko: "베드로전서", abbr: "벧전", testament: "nt", chapters: 5, gnt: 21 },
  { osis: "2Pet", ko: "베드로후서", abbr: "벧후", testament: "nt", chapters: 3, gnt: 22 },
  { osis: "1John", ko: "요한일서", abbr: "요일", testament: "nt", chapters: 5, gnt: 23 },
  { osis: "2John", ko: "요한이서", abbr: "요이", testament: "nt", chapters: 1, gnt: 24 },
  { osis: "3John", ko: "요한삼서", abbr: "요삼", testament: "nt", chapters: 1, gnt: 25 },
  { osis: "Jude", ko: "유다서", abbr: "유", testament: "nt", chapters: 1, gnt: 26 },
  { osis: "Rev", ko: "요한계시록", abbr: "계", testament: "nt", chapters: 22, gnt: 27 },
];

const BY_OSIS = new Map(BOOKS.map((b) => [b.osis.toLowerCase(), b]));
const BY_KO = new Map(BOOKS.flatMap((b) => [[b.ko, b], [b.abbr, b]] as const));

export function findBook(query: string): Book | undefined {
  const q = query.trim();
  return BY_KO.get(q) ?? BY_OSIS.get(q.toLowerCase());
}

export interface Reference {
  book: Book;
  chapter: number;
  verse: number;
}

/** "요 3:16", "요한복음 3:16", "John 3:16" 을 모두 받는다. */
export function parseReference(input: string): Reference | null {
  const m = input.trim().match(/^(.+?)\s*(\d+)\s*[:장]\s*(\d+)/);
  if (!m) return null;
  const book = findBook(m[1]);
  if (!book) return null;
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  if (chapter < 1 || chapter > book.chapters || verse < 1) return null;
  return { book, chapter, verse };
}

export function formatReference(ref: Reference): string {
  return `${ref.book.ko} ${ref.chapter}:${ref.verse}`;
}
