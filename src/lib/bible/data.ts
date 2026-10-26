import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyze } from "./morphology";
import { BOOKS, findBook, type Book } from "./books";
import type { AnalyzedWord, Lang, Verse, Word } from "./types";

const DATA = path.join(process.cwd(), "src", "data");

/** 저장 포맷: [본문형태, 사전형, 품사, 파싱코드] */
type RawWord = [string, string, string, string];
interface BookFile {
  osis: string;
  lang: Lang;
  v: Record<string, RawWord[]>;
}

const bookCache = new Map<string, Promise<BookFile>>();

function loadBook(lang: Lang, osis: string): Promise<BookFile> {
  const key = `${lang}/${osis}`;
  let hit = bookCache.get(key);
  if (!hit) {
    hit = readFile(path.join(DATA, "bible", lang, `${osis}.json`), "utf8")
      .then((t) => JSON.parse(t) as BookFile)
      .catch(() => ({ osis, lang, v: {} }));
    bookCache.set(key, hit);
  }
  return hit;
}

/* ----------------------------- 사전 ----------------------------- */

interface GreekEntry { s: string; g: string; k: string }
interface HebrewEntry { w: string; g: string; k: string }

let greekLex: Promise<Record<string, GreekEntry>> | null = null;
let hebrewLex: Promise<Record<string, HebrewEntry>> | null = null;

function loadLexicon(lang: Lang) {
  if (lang === "grc") {
    greekLex ??= readFile(path.join(DATA, "lexicon", "greek.json"), "utf8").then(JSON.parse);
    return greekLex;
  }
  hebrewLex ??= readFile(path.join(DATA, "lexicon", "hebrew.json"), "utf8").then(JSON.parse);
  return hebrewLex;
}

/** 악센트를 걷어내 사전 키를 맞춘다. */
export function normalizeGreek(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u1dc0-\u1dff]/g, "")
    .toLowerCase()
    .replace(/ς/g, "σ")
    .normalize("NFC");
}

/** OSHB 사전형("b/7225", "1254 a")에서 스트롱 번호만 뽑는다. */
export function hebrewStrong(lemma: string): string {
  const last = lemma.split("/").pop() ?? "";
  return (last.match(/\d+/)?.[0] ?? "").replace(/^0+/, "");
}

/**
 * MorphGNT의 사전형과 스트롱 사전의 표제어가 다른 고빈도 낱말.
 * (MorphGNT는 현대 사전형을, 스트롱은 1890년 표기를 쓴다.)
 */
const GREEK_ALIASES: Record<string, string> = {
  οιδα: "ειδω",
  φοβεομαι: "φοβεω",
  μωυσησ: "μωσευσ",
  δαυιδ: "δαβιδ",
  λοιποσ: "λοιπον",
  δεικνυμι: "δεικνυω",
  ελεαω: "ελεεω",
  επικαλεω: "επικαλεομαι",
  μαριαμ: "μαρια",
  πιμπλημι: "πληθω",
};

/** 표기 차이를 흡수하려고 조회 후보를 넓게 만든다. */
function greekCandidates(lemma: string): string[] {
  const base = normalizeGreek(lemma);
  const out = [base];

  // "ουτω(σ)" 처럼 선택적 어미를 괄호로 적은 형태 — 뺀 쪽과 넣은 쪽을 모두 본다.
  if (base.includes("(")) {
    out.push(base.replace(/\([^)]*\)/g, ""));
    out.push(base.replace(/[()]/g, ""));
  }

  const alias = GREEK_ALIASES[out[out.length - 1]] ?? GREEK_ALIASES[base];
  if (alias) out.push(alias);

  // 중간태 사전형 ↔ 능동태 사전형
  for (const candidate of [...out]) {
    if (candidate.endsWith("ομαι")) out.push(candidate.slice(0, -4) + "ω");
    else if (candidate.endsWith("ω")) out.push(candidate.slice(0, -1) + "ομαι");
  }
  return out;
}

async function glossFor(lang: Lang, lemma: string): Promise<string | undefined> {
  const lex = await loadLexicon(lang);
  if (lang === "grc") {
    const table = lex as Record<string, GreekEntry>;
    for (const key of greekCandidates(lemma)) {
      const e = table[key];
      if (e) return e.g || e.k || undefined;
    }
    return undefined;
  }
  const e = (lex as Record<string, HebrewEntry>)[hebrewStrong(lemma)];
  return e?.g || e?.k || undefined;
}

/* ---------------------------- 본문 조회 ---------------------------- */

function langOf(book: Book): Lang {
  return book.testament === "nt" ? "grc" : "hbo";
}

function toWord(raw: RawWord, ref: string): Word {
  const [text, lemma, pos, parse] = raw;
  return {
    ref,
    text,
    word: text.replace(/[·,.;:!?"'\u00b7\u037e]/g, ""),
    normalized: text,
    lemma,
    pos,
    parse,
  };
}

/** 한 절을 형태소 해석까지 마친 상태로 돌려준다. */
export async function getVerse(
  osis: string,
  chapter: number,
  verse: number
): Promise<Verse | null> {
  const book = findBook(osis);
  if (!book) return null;
  const lang = langOf(book);
  const file = await loadBook(lang, book.osis);
  const raws = file.v[`${chapter}:${verse}`];
  if (!raws) return null;

  const ref = `${book.osis} ${chapter}:${verse}`;
  const words: AnalyzedWord[] = await Promise.all(
    raws.map(async (raw) => {
      const analyzed = analyze(toWord(raw, ref), lang);
      const strong = lang === "hbo" ? hebrewStrong(raw[1]) : undefined;
      return { ...analyzed, strong, gloss: await glossFor(lang, raw[1]) };
    })
  );

  return { ref, book: book.osis, chapter, verse, lang, words };
}

/** 한 장을 통째로 돌려준다. 설교 본문 단위로 훑을 때 쓴다. */
export async function getChapter(osis: string, chapter: number): Promise<Verse[]> {
  const book = findBook(osis);
  if (!book) return [];
  const lang = langOf(book);
  const file = await loadBook(lang, book.osis);

  const verseNumbers = Object.keys(file.v)
    .filter((k) => k.startsWith(`${chapter}:`))
    .map((k) => Number(k.split(":")[1]))
    .sort((a, b) => a - b);

  const out: Verse[] = [];
  for (const v of verseNumbers) {
    const verse = await getVerse(book.osis, chapter, v);
    if (verse) out.push(verse);
  }
  return out;
}

/* ---------------------------- 라틴어 ---------------------------- */

interface LatinFile { osis: string; v: Record<string, string> }
const latinCache = new Map<string, Promise<LatinFile>>();

/**
 * 히브리어 시편 번호를 불가타(70인역) 번호로 바꾼다.
 *
 * 9·10편이 하나로, 114·115편이 하나로 합쳐지고 116편과 147편이 둘로 나뉘어
 * 그 사이가 하나씩 밀린다. 장 단위로만 맞추고 절 번호는 그대로 둔다 —
 * 합쳐진 편의 뒷부분은 절 번호가 어긋날 수 있다.
 */
export function vulgatePsalm(chapter: number): number {
  if (chapter === 10) return 9;
  if (chapter >= 11 && chapter <= 113) return chapter - 1;
  if (chapter === 114 || chapter === 115) return 113;
  if (chapter === 116) return 114;
  if (chapter >= 117 && chapter <= 146) return chapter - 1;
  if (chapter === 147) return 146;
  return chapter;
}

/**
 * 불가타 한 절. 형태소 데이터가 없어 글만 돌려준다.
 * 시편은 우리 번호를 받아 불가타 번호로 바꿔 찾는다.
 */
export async function getLatinVerse(osis: string, chapter: number, verse: number): Promise<string | null> {
  const book = findBook(osis);
  if (!book) return null;
  if (book.osis === "Ps") chapter = vulgatePsalm(chapter);
  let hit = latinCache.get(book.osis);
  if (!hit) {
    hit = readFile(path.join(DATA, "bible", "lat", `${book.osis}.json`), "utf8")
      .then((t) => JSON.parse(t) as LatinFile)
      .catch(() => ({ osis: book.osis, v: {} }));
    latinCache.set(book.osis, hit);
  }
  return (await hit).v[`${chapter}:${verse}`] ?? null;
}

/* ---------------------------- 70인역 ---------------------------- */

const lxxCache = new Map<string, Promise<LatinFile>>();

/** 브렌튼 70인역 한 절. 글만 있다. 시편은 우리 번호를 받아 그리스어 번호로 바꿔 찾는다. */
export async function getLxxVerse(osis: string, chapter: number, verse: number): Promise<string | null> {
  const book = findBook(osis);
  if (!book) return null;
  if (book.osis === "Ps") chapter = vulgatePsalm(chapter);
  let hit = lxxCache.get(book.osis);
  if (!hit) {
    hit = readFile(path.join(DATA, "bible", "lxx", `${book.osis}.json`), "utf8")
      .then((t) => JSON.parse(t) as LatinFile)
      .catch(() => ({ osis: book.osis, v: {} }));
    lxxCache.set(book.osis, hit);
  }
  return (await hit).v[`${chapter}:${verse}`] ?? null;
}

/* ---------------------------- 용례 검색 ---------------------------- */

export interface Occurrence {
  book: string;
  bookKo: string;
  chapter: number;
  verse: number;
  /** 해당 낱말을 «»로 감싼 절 본문 */
  snippet: string;
  parse: string;
}

/**
 * 같은 사전형이 성경 전체에서 어디에 쓰였는지 찾는다.
 * 설교 준비에서 "이 단어가 다른 데서는 어떻게 쓰였나"를 보는 용도다.
 */
export async function findOccurrences(
  lemma: string,
  lang: Lang,
  limit = 150
): Promise<{ verses: number; hits: number; results: Occurrence[] }> {
  const target = lang === "grc" ? normalizeGreek(lemma) : lemma;
  const books = BOOKS.filter((b) => langOf(b) === lang);

  let verses = 0;
  let hits = 0;
  const results: Occurrence[] = [];

  for (const book of books) {
    const file = await loadBook(lang, book.osis);
    for (const [key, raws] of Object.entries(file.v)) {
      const matches: number[] = [];
      for (let i = 0; i < raws.length; i++) {
        const candidate = lang === "grc" ? normalizeGreek(raws[i][1]) : raws[i][1];
        if (candidate === target) matches.push(i);
      }
      if (matches.length === 0) continue;

      verses++;
      hits += matches.length;
      if (results.length >= limit) continue;

      const [chapter, verse] = key.split(":").map(Number);
      const marked = new Set(matches);
      results.push({
        book: book.osis,
        bookKo: book.ko,
        chapter,
        verse,
        snippet: raws
          .map((r, i) => (marked.has(i) ? `«${r[0]}»` : r[0]))
          .join(" ")
          .replace(/\//g, ""),
        // 한 절에 여러 번 나오면 파싱이 서로 다를 수 있어 모두 적는다.
        parse: matches.map((i) => raws[i][3]).join(" / "),
      });
    }
  }

  return { verses, hits, results };
}
