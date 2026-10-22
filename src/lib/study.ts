import { findBook, parseReference, type Book } from "./bible/books";
import type { AnalyzedWord, Feature, Lang, Verse } from "./bible/types";

/*
  원어 스터디.

  매주 모여 본문 한 단락을 원어로 읽는다. 그 단락을 사이트에 올려 두면 모임에
  못 온 사람도 같은 본문을 보고, 퀴즈로 복습한다.

  퀴즈는 사람이 내지 않는다. 본문의 낱말에서 바로 만든다 — "이 동사의 시제·태·
  법은?", "이 낱말의 사전형은?", "이 낱말의 뜻은?". 매주 문제를 손으로 내려면
  한 시간이 들고, 그러면 두 주 만에 그만두게 된다. 정답은 파싱 데이터가 이미
  알고 있다.

  오답 보기는 정답에서 자질 하나만 바꿔 만든다. "부정과거 능동 직설법"의 오답이
  "현재 능동 직설법"이어야 시제를 읽었는지 묻는 문제가 된다. 아무 조합이나
  섞으면 소거법으로 맞힌다. 그 언어에 없는 자질(헬라어 쌍수, 히브리어 중성)은
  오답으로도 내지 않는다 — 배운 사람에게는 공짜 소거가 되기 때문이다.
*/

export interface Passage {
  book: Book;
  chapter: number;
  from: number;
  to: number;
}

/** "요 1:1-5", "요한복음 1장 1-5절", "요 1:1" 을 받는다. */
export function parsePassage(input: string): Passage | null {
  const m = input.trim().match(/^(.*?\d+\s*[:장]\s*\d+)\s*(?:[-~–]\s*(\d+))?\s*절?\s*$/);
  if (!m) return null;
  const start = parseReference(m[1]);
  if (!start) return null;
  const to = m[2] ? Number(m[2]) : start.verse;
  if (to < start.verse || to - start.verse > 40) return null;
  return { book: start.book, chapter: start.chapter, from: start.verse, to };
}

export function formatPassage(p: Passage): string {
  const tail = p.to === p.from ? `${p.from}` : `${p.from}-${p.to}`;
  return `${p.book.ko} ${p.chapter}:${tail}`;
}

/** 저장된 행에서 다시 만든다. 책을 못 찾으면 null. */
export function passageFromRow(row: { book: string; chapter: number; verse_from: number; verse_to: number }): Passage | null {
  const book = findBook(row.book);
  if (!book) return null;
  return { book, chapter: row.chapter, from: row.verse_from, to: row.verse_to };
}

export interface DraftQuestion {
  prompt: string;
  choices: string[];
  answer: number;
  note: string;
}

/* ------------------------------------------------------------ 문제 만들기 */

/** 같은 입력이면 같은 문제가 나오게 하는 작은 난수. 미리보기와 저장본이 같아야 한다. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 자질 하나를 바꿔 오답을 만들 때 쓸 후보. 그 언어에 실제로 있는 값만. */
const ALTERNATIVES: Record<Lang, Record<string, string[]>> = {
  grc: {
    시제: ["현재", "미완료", "미래", "부정과거", "완료", "과거완료"],
    태: ["능동", "중간", "수동"],
    법: ["직설법", "명령법", "가정법", "희구법", "부정사", "분사"],
    격: ["주격", "속격", "여격", "대격", "호격"],
    수: ["단수", "복수"],
    성: ["남성", "여성", "중성"],
    인칭: ["1인칭", "2인칭", "3인칭"],
  },
  hbo: {
    어간: ["칼(기본 능동)", "니팔(수동·재귀)", "피엘(강조 능동)", "푸알(강조 수동)", "히필(사역 능동)", "호팔(사역 수동)", "히트파엘(재귀)"],
    형태: ["완료", "바브연속 완료", "미완료", "바브연속 미완료", "명령형", "부정사 연계형", "능동 분사", "수동 분사"],
    수: ["단수", "복수", "쌍수"],
    성: ["남성", "여성", "양성", "공성"],
    상태: ["절대형", "연계형", "관사 결합형"],
    인칭: ["1인칭", "2인칭", "3인칭"],
  },
};

/** 문제로 묻는 자질 묶음. 품사마다 무엇을 읽어야 하는지가 다르다. */
function askedLabels(word: AnalyzedWord): string[] {
  if (word.lang === "grc") {
    if (word.pos === "V-") return ["시제", "태", "법"];
    if (["N-", "A-", "RA", "RP", "RD", "RR"].includes(word.pos)) return ["격", "수", "성"];
    return [];
  }
  if (word.posLabel === "동사") return ["어간", "형태"];
  if (word.posLabel === "명사" || word.posLabel === "형용사") return ["성", "수", "상태"];
  return [];
}

function pick(features: Feature[], labels: string[]): Feature[] {
  return labels.map((l) => features.find((f) => f.label === l)).filter((f): f is Feature => Boolean(f));
}

/** 화면에 보일 꼴. 구두점과 히브리어 형태소 구분 기호를 뗀다. */
const display = (w: AnalyzedWord) => w.word.replace(/\//g, "");
const refLabel = (v: Verse, book: Book) => `${book.ko} ${v.chapter}:${v.verse}`;

/** 받침 유무에 맞는 조사. "법은" / "형태는" */
function topic(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  return hangul && (code - 0xac00) % 28 !== 0 ? "은" : "는";
}

/**
 * 영문 사전 풀이를 보기 한 줄로 다듬는다. 스트롱 사전은 "to complete fully;
 * from G1615 (…)" 처럼 어원까지 적어 두어, 그대로 내면 보기가 아니라 문단이 된다.
 */
function trimGloss(raw: string): string | null {
  let g = raw.replace(/\([^)]*\)/g, " ");
  g = g.split(";")[0].split(/,\s*i\.e\b/)[0].split(/\bi\.e\b/)[0];
  g = g.replace(/\s+/g, " ").replace(/[\s,.:]+$/g, "").trim();
  if (!g || g.length < 2 || /^(from|a prim|prol|apparently|probably)\b/i.test(g) || /[()]/.test(g)) return null;
  return g.length > 50 ? `${g.slice(0, 47)}…` : g;
}

/** 파싱 문제. 정답에서 자질 하나씩 바꾼 오답 셋을 붙인다. */
function parsingQuestion(word: AnalyzedWord, ref: string, rand: () => number): DraftQuestion | null {
  const labels = askedLabels(word);
  const feats = pick(word.features, labels);
  if (feats.length < 2) return null;
  const alternatives = ALTERNATIVES[word.lang];

  const answer = feats.map((f) => f.value).join(" ");
  const wrong = new Set<string>();
  // 자질을 돌아가며 하나씩 바꾼다. 세 개가 모일 때까지.
  const order = shuffle(feats.map((_, i) => i), rand);
  for (let round = 0; round < 4 && wrong.size < 3; round++) {
    for (const i of order) {
      if (wrong.size >= 3) break;
      const alts = (alternatives[feats[i].label] ?? []).filter((v) => v !== feats[i].value);
      if (alts.length === 0) continue;
      const swapped = feats.map((f, j) => (j === i ? alts[Math.floor(rand() * alts.length)] : f.value)).join(" ");
      if (swapped !== answer) wrong.add(swapped);
    }
  }
  if (wrong.size < 2) return null;

  const choices = shuffle([answer, ...wrong], rand);
  const what = feats.map((f) => f.label).join("·");
  const note = [`${display(word)} — ${word.summary}`, ...word.sermonNotes.slice(0, 1)].join("\n");
  return {
    prompt: `«${display(word)}» (${ref}) — 이 ${word.posLabel}의 ${what}${topic(what)}?`,
    choices,
    answer: choices.indexOf(answer),
    note,
  };
}

/**
 * 사전형 문제. 본문에 나온 같은 품사의 다른 낱말 사전형을 오답으로 쓴다.
 * 히브리어는 사전형이 스트롱 번호로 저장되어 있어 묻지 않는다 — "6440"을
 * 고르게 할 수는 없다.
 */
function lemmaQuestion(word: AnalyzedWord, ref: string, pool: AnalyzedWord[], rand: () => number): DraftQuestion | null {
  if (word.lang !== "grc" || word.lemma === display(word)) return null;
  const others = [...new Set(pool.filter((w) => w.posLabel === word.posLabel && w.lemma !== word.lemma).map((w) => w.lemma))];
  if (others.length < 2) return null;
  const wrong = shuffle(others, rand).slice(0, 3);
  const choices = shuffle([word.lemma, ...wrong], rand);
  const gloss = word.gloss ? trimGloss(word.gloss) : null;
  return {
    prompt: `«${display(word)}» (${ref}) — 이 낱말의 사전형(기본형)은?`,
    choices,
    answer: choices.indexOf(word.lemma),
    note: `${display(word)} → ${word.lemma}${gloss ? ` (${gloss})` : ""} · ${word.summary}`,
  };
}

/** 뜻 문제. 사전이 영문이라 영문 뜻을 그대로 쓴다 — 없는 것보다 낫다. */
function glossQuestion(word: AnalyzedWord, ref: string, pool: AnalyzedWord[], rand: () => number): DraftQuestion | null {
  const mine = word.gloss ? trimGloss(word.gloss) : null;
  if (!mine) return null;
  // 관사·전치사의 뜻("the", "in")을 오답으로 내면 소거가 너무 쉽다.
  const others = [
    ...new Set(
      pool
        .filter((w) => w.gloss && w.lemma !== word.lemma && !SKIP_POS.has(w.posLabel))
        .map((w) => trimGloss(w.gloss!))
        .filter((g): g is string => Boolean(g))
    ),
  ].filter((g) => g !== mine);
  if (others.length < 2) return null;
  const wrong = shuffle(others, rand).slice(0, 3);
  const choices = shuffle([mine, ...wrong], rand);
  // 헬라어는 사전형을 묻고, 히브리어는 사전형이 번호라 본문 꼴 그대로 묻는다.
  const prompt = word.lang === "grc" ? `«${word.lemma}» 의 뜻은? (영문 사전)` : `«${display(word)}» (${ref}) — 이 낱말의 뜻은? (영문 사전)`;
  return {
    prompt,
    choices,
    answer: choices.indexOf(mine),
    note: `${word.lang === "grc" ? word.lemma : display(word)} — ${mine}`,
  };
}

/** 관사·접속사·전치사처럼 외울 것이 적은 낱말은 뜻·사전형 문제에서 뺀다. */
const SKIP_POS = new Set(["관사", "접속사", "전치사", "불변화사", "감탄사", "접미사", "대명사", "인칭대명사", "지시대명사", "관계대명사", "의문·부정대명사"]);

/**
 * 본문에서 문제를 뽑는다. 동사 파싱을 먼저, 그다음 명사 파싱, 사전형, 뜻 순으로
 * 섞어 가며 count 개를 채운다. 같은 사전형은 종류마다 한 번만 묻는다.
 */
export function generateQuestions(verses: Verse[], book: Book, count: number, seed: number): DraftQuestion[] {
  const rand = rng(seed);
  const pool = verses.flatMap((v) => v.words);
  const where = new Map<AnalyzedWord, string>();
  for (const v of verses) for (const w of v.words) where.set(w, refLabel(v, book));

  const verbs = shuffle(pool.filter((w) => (w.lang === "grc" ? w.pos === "V-" : w.posLabel === "동사")), rand);
  const nominals = shuffle(pool.filter((w) => askedLabels(w).length > 0 && !verbs.includes(w)), rand);
  const content = shuffle(pool.filter((w) => !SKIP_POS.has(w.posLabel)), rand);

  type Maker = { kind: string; word: AnalyzedWord; make: () => DraftQuestion | null };
  const lanes: Maker[][] = [
    verbs.map((w) => ({ kind: "p", word: w, make: () => parsingQuestion(w, where.get(w)!, rand) })),
    nominals.map((w) => ({ kind: "p", word: w, make: () => parsingQuestion(w, where.get(w)!, rand) })),
    content.map((w) => ({ kind: "l", word: w, make: () => lemmaQuestion(w, where.get(w)!, pool, rand) })),
    content.map((w) => ({ kind: "g", word: w, make: () => glossQuestion(w, where.get(w)!, pool, rand) })),
  ];
  const cursors = lanes.map(() => 0);
  const used = new Set<string>();
  const out: DraftQuestion[] = [];

  // 종류를 돌아가며 하나씩 꺼낸다. 한 종류가 바닥나면 건너뛴다.
  let stuck = 0;
  for (let k = 0; out.length < count && stuck < lanes.length; k = (k + 1) % lanes.length) {
    const lane = lanes[k];
    let made: DraftQuestion | null = null;
    while (cursors[k] < lane.length && !made) {
      const m = lane[cursors[k]++];
      // 같은 사전형을 같은 종류로 두 번 묻지 않는다. ἦν 이 다섯 번 나와도 파싱은 한 번.
      const key = `${m.kind}:${m.word.lemma}`;
      if (used.has(key)) continue;
      const candidate = m.make();
      if (!candidate) continue;
      used.add(key);
      made = candidate;
    }
    if (made) {
      out.push(made);
      stuck = 0;
    } else {
      stuck++;
    }
  }
  return out;
}

export interface StudyRow {
  id: string;
  title: string;
  passage: string;
  book: string;
  chapter: number;
  verse_from: number;
  verse_to: number;
  notes: string;
  quiz_code: string | null;
  published: boolean;
  created_by: string;
  created_at: string;
}
