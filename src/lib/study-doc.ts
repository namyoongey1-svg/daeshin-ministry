import { parseReference, type Reference } from "./bible/books";
import { rng, shuffle, type DraftQuestion, type StudyLang } from "./study";

/*
  스터디 문서 형식.

  인도자가 매주 만드는 워드 문서는 한 절을 세 언어로 나란히 두고, 낱말마다 뜻과
  연상 팁을 단다.

    대신원어스터디 - 창세기 1장 1절
    9월 17일 본문: 창세기 1장 1절 (Genesis 1:1)
    1. 히브리어 (Hebrew - 마소라 사본)
    בְּרֵאשִׁית בָּרָא אֱלֹהִים …
    어휘 및 분해:
    • בְּרֵאשִׁית (bə·rê·šîṯ) : 태초에 (in the beginning)
    💡 연상 팁: '베'(~안에) + '레쉬트'(시작, 머리) …
    2. 헬라어 (Greek - 칠십인역)
    …

  이 모양을 그대로 읽어 구조로 만든다. 문서를 고쳐 쓰라고 하지 않는다 — 이미
  이렇게 쓰고 있고, 사람이 읽기 좋은 꼴이기 때문이다. 퀴즈는 여기 적힌 뜻과
  연상 팁에서 낸다. 영문 사전보다 인도자가 적은 한국어 뜻이 훨씬 낫다.
*/

export interface StudyWord {
  word: string;
  /** 음역. "(bə·rê·šîṯ)" 처럼 괄호에 적힌 것 */
  reading: string | null;
  meaning: string;
  tip: string | null;
}

export interface StudySection {
  lang: StudyLang;
  /** "Hebrew - 마소라 사본" 처럼 괄호에 적힌 출처 */
  source: string;
  text: string;
  words: StudyWord[];
}

export interface StudyPassage {
  /** "창세기 1장 1절" — 문서에 적힌 그대로 */
  ref: string;
  sections: StudySection[];
}

export interface StudyContent {
  title: string;
  passages: StudyPassage[];
}

export const LANG_LABEL: Record<StudyLang, string> = { hbo: "히브리어", grc: "헬라어", lat: "라틴어" };
const LANG_OF: Record<string, StudyLang> = { 히브리어: "hbo", 헬라어: "grc", 라틴어: "lat" };

const BULLET = /^[•·▪●\-]\s*(.+)$/;
const TIP = /^💡\s*(?:연상\s*팁)?\s*[:：]?\s*(.*)$/;
const LANG_HEAD = /^\s*\d+\s*[.)]\s*(히브리어|헬라어|라틴어)\s*(?:\((.*?)\))?/;
const PASSAGE_HEAD = /본문\s*[:：]\s*(.+?)\s*(?:\(|$)/;
const TITLE = /^대신\s*원어\s*스터디\s*[-–—]\s*(.+)$/;

/** "• 낱말 (읽기) : 뜻" 한 줄을 가른다. */
function splitWordLine(line: string): StudyWord | null {
  const m = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
  if (!m) return null;
  let word = m[1].trim();
  let reading: string | null = null;
  const r = word.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (r && r[1].trim()) {
    word = r[1].trim();
    reading = r[2].trim() || null;
  }
  return { word, reading, meaning: m[2].trim(), tip: null };
}

/** 문단 목록을 스터디 구조로 읽는다. 본문이 하나도 없으면 null. */
export function parseStudyDoc(lines: string[]): StudyContent | null {
  const content: StudyContent = { title: "", passages: [] };
  let passage: StudyPassage | null = null;
  let section: StudySection | null = null;
  let tipPending = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const t = line.match(TITLE);
    if (t && !content.title) {
      content.title = t[1].replace(/\s*\(암기\s*팁\s*포함\)\s*/g, "").trim();
      continue;
    }

    const p = line.match(PASSAGE_HEAD);
    if (p && !line.match(BULLET)) {
      passage = { ref: p[1].trim(), sections: [] };
      content.passages.push(passage);
      section = null;
      continue;
    }

    const h = line.match(LANG_HEAD);
    if (h) {
      // 본문 머리말 없이 언어부터 시작하면 제목의 구절을 본문으로 삼는다.
      if (!passage) {
        passage = { ref: content.title, sections: [] };
        content.passages.push(passage);
      }
      section = { lang: LANG_OF[h[1]], source: (h[2] ?? "").trim(), text: "", words: [] };
      passage.sections.push(section);
      continue;
    }

    if (!section) continue;
    if (/^어휘\s*(및|와)?\s*분해/.test(line)) continue;

    const tip = line.match(TIP);
    if (tip) {
      const last = section.words[section.words.length - 1];
      if (tip[1]) {
        if (last) last.tip = tip[1].trim();
      } else {
        tipPending = true;
      }
      continue;
    }
    if (tipPending) {
      const last = section.words[section.words.length - 1];
      if (last) last.tip = line;
      tipPending = false;
      continue;
    }

    const b = line.match(BULLET);
    if (b) {
      const w = splitWordLine(b[1]);
      if (w) section.words.push(w);
      continue;
    }

    // 머리말 다음 첫 줄이 본문이다.
    if (!section.text) section.text = line;
  }

  if (content.passages.length === 0 || content.passages.every((p) => p.sections.length === 0)) return null;
  if (!content.title) content.title = content.passages.map((p) => p.ref).join(" · ");
  return content;
}

/** "창세기 1장 1절" → 책·장·절. 못 읽으면 null. */
export function referenceOf(passage: StudyPassage): Reference | null {
  return parseReference(passage.ref);
}

/** 보기에 쓸 뜻. 영문 괄호와 [기본형 …] 꼬리를 뗀다. "태초에 (in the beginning)" → "태초에" */
export function shortMeaning(meaning: string): string {
  return meaning
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s*\((?=[^)]*[A-Za-z])[^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------ 퀴즈 */

/**
 * 뜻 문제와 거꾸로 문제를 섞어 낸다. 오답은 같은 언어, 같은 본문의 다른 낱말에서
 * 고른다 — 같은 절 안의 낱말이라 뜻이 서로 가까워 외운 사람만 가른다.
 * 풀이에는 인도자의 연상 팁을 붙인다. 틀린 사람에게 그게 제일 남는다.
 */
export function generateVocabQuestions(content: StudyContent, count: number, seed: number): DraftQuestion[] {
  const rand = rng(seed);
  type Item = { w: StudyWord; lang: StudyLang; ref: string; pool: StudyWord[] };
  const items: Item[] = [];
  for (const p of content.passages) {
    for (const s of p.sections) {
      const usable = s.words.filter((w) => shortMeaning(w.meaning).length > 0);
      for (const w of usable) items.push({ w, lang: s.lang, ref: p.ref, pool: usable });
    }
  }

  const note = (it: Item) =>
    [`${it.w.word}${it.w.reading ? ` (${it.w.reading})` : ""} — ${it.w.meaning}`, it.w.tip ? `💡 ${it.w.tip}` : null]
      .filter(Boolean)
      .join("\n");

  const toMeaning = (it: Item): DraftQuestion | null => {
    const mine = shortMeaning(it.w.meaning);
    const others = [...new Set(it.pool.filter((o) => o !== it.w).map((o) => shortMeaning(o.meaning)))].filter((m) => m && m !== mine);
    if (others.length < 2) return null;
    const choices = shuffle([mine, ...shuffle(others, rand).slice(0, 3)], rand);
    return {
      prompt: `«${it.w.word}» (${LANG_LABEL[it.lang]}, ${it.ref}) — 뜻은?`,
      choices,
      answer: choices.indexOf(mine),
      note: note(it),
    };
  };

  const toWord = (it: Item): DraftQuestion | null => {
    const others = [...new Set(it.pool.filter((o) => o !== it.w && shortMeaning(o.meaning) !== shortMeaning(it.w.meaning)).map((o) => o.word))];
    if (others.length < 2) return null;
    const choices = shuffle([it.w.word, ...shuffle(others, rand).slice(0, 3)], rand);
    return {
      prompt: `'${shortMeaning(it.w.meaning)}' — ${LANG_LABEL[it.lang]}로는? (${it.ref})`,
      choices,
      answer: choices.indexOf(it.w.word),
      note: note(it),
    };
  };

  // 연상 팁이 있는 낱말을 먼저 낸다. 인도자가 공들인 낱말이다.
  const ordered = shuffle(items, rand).sort((a, b) => Number(Boolean(b.w.tip)) - Number(Boolean(a.w.tip)));
  const out: DraftQuestion[] = [];
  const used = new Set<string>();
  let flip = 0;
  for (const it of ordered) {
    if (out.length >= count) break;
    const key = `${it.lang}:${it.w.word}`;
    if (used.has(key)) continue;
    const q = flip++ % 3 === 2 ? toWord(it) : toMeaning(it);
    if (!q) continue;
    used.add(key);
    out.push(q);
  }
  return out;
}
