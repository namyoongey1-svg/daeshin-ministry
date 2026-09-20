import type { Feature, Lang, Word, AnalyzedWord } from "./types";

/* ------------------------------------------------------------------ */
/* 헬라어 — MorphGNT / SBLGNT 코드 체계                                 */
/* ------------------------------------------------------------------ */

const GREEK_POS: Record<string, string> = {
  "N-": "명사",
  "A-": "형용사",
  "RA": "관사",
  "RD": "지시대명사",
  "RI": "의문·부정대명사",
  "RP": "인칭대명사",
  "RR": "관계대명사",
  "C-": "접속사",
  "D-": "부사",
  "I-": "감탄사",
  "P-": "전치사",
  "V-": "동사",
  "X-": "불변화사",
};

/** MorphGNT 파싱 코드 8자리의 각 자리 의미 */
const GREEK_SLOTS: { label: string; map: Record<string, string> }[] = [
  { label: "인칭", map: { "1": "1인칭", "2": "2인칭", "3": "3인칭" } },
  {
    label: "시제",
    map: {
      P: "현재", I: "미완료", F: "미래", A: "부정과거",
      X: "완료", Y: "과거완료",
    },
  },
  { label: "태", map: { A: "능동", M: "중간", P: "수동" } },
  {
    label: "법",
    map: {
      I: "직설법", D: "명령법", S: "가정법", O: "희구법",
      N: "부정사", P: "분사",
    },
  },
  {
    label: "격",
    map: { N: "주격", G: "속격", D: "여격", A: "대격", V: "호격" },
  },
  { label: "수", map: { S: "단수", P: "복수" } },
  { label: "성", map: { M: "남성", F: "여성", N: "중성" } },
  { label: "급", map: { C: "비교급", S: "최상급" } },
];

function decodeGreek(pos: string, parse: string): Feature[] {
  const out: Feature[] = [];
  for (let i = 0; i < GREEK_SLOTS.length; i++) {
    const code = parse[i];
    if (!code || code === "-") continue;
    const slot = GREEK_SLOTS[i];
    const value = slot.map[code];
    if (value) out.push({ label: slot.label, value, code });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 히브리어 — OSHB(Open Scriptures Hebrew Bible) 코드 체계              */
/* ------------------------------------------------------------------ */

const HEBREW_POS: Record<string, string> = {
  A: "형용사", C: "접속사", D: "부사", N: "명사",
  P: "대명사", R: "전치사", S: "접미사", T: "불변화사", V: "동사",
};

const HEBREW_STEM: Record<string, string> = {
  q: "칼(기본 능동)", N: "니팔(수동·재귀)", p: "피엘(강조 능동)",
  P: "푸알(강조 수동)", h: "히필(사역 능동)", H: "호팔(사역 수동)",
  t: "히트파엘(재귀)", o: "폴렐", r: "히트폴렐", v: "필펠",
};

const HEBREW_CONJ: Record<string, string> = {
  p: "완료", q: "바브연속 완료", i: "미완료", w: "바브연속 미완료",
  h: "청유형", j: "단축형", v: "명령형",
  a: "부정사 절대형", c: "부정사 연계형",
  r: "능동 분사", s: "수동 분사",
};

const HEBREW_NOUN_TYPE: Record<string, string> = {
  c: "보통명사", p: "고유명사", g: "지명",
};

const HEBREW_STATE: Record<string, string> = {
  a: "절대형", c: "연계형", d: "관사 결합형",
};

const GENDER: Record<string, string> = { m: "남성", f: "여성", b: "양성", c: "공성" };
const NUMBER: Record<string, string> = { s: "단수", p: "복수", d: "쌍수" };
const PERSON: Record<string, string> = { "1": "1인칭", "2": "2인칭", "3": "3인칭" };

/**
 * OSHB 코드를 해석한다. 예)
 *   HVqp3ms  → 동사 · 칼 완료 3인칭 남성 단수
 *   HNcmsa   → 명사 · 보통명사 남성 단수 절대형
 * 접두사는 "/"로 이어진다 (예: HC/Vqw3ms).
 */
function decodeHebrew(morph: string): Feature[] {
  const out: Feature[] = [];
  // 언어 표시자(H)와 접두 세그먼트를 떼고 마지막(주) 세그먼트를 본다.
  const body = morph.replace(/^H/, "");
  const segments = body.split("/");
  const main = segments[segments.length - 1] ?? "";
  if (!main) return out;

  const pos = main[0];
  let rest = main.slice(1);

  if (pos === "V") {
    const stem = rest[0];
    const conj = rest[1];
    if (HEBREW_STEM[stem]) out.push({ label: "어간", value: HEBREW_STEM[stem], code: stem });
    if (HEBREW_CONJ[conj]) out.push({ label: "형태", value: HEBREW_CONJ[conj], code: conj });
    rest = rest.slice(2);
  } else if (pos === "N") {
    const type = rest[0];
    if (HEBREW_NOUN_TYPE[type]) {
      out.push({ label: "종류", value: HEBREW_NOUN_TYPE[type], code: type });
      rest = rest.slice(1);
    }
  }

  for (const ch of rest) {
    if (PERSON[ch]) out.push({ label: "인칭", value: PERSON[ch], code: ch });
    else if (GENDER[ch]) out.push({ label: "성", value: GENDER[ch], code: ch });
    else if (NUMBER[ch]) out.push({ label: "수", value: NUMBER[ch], code: ch });
    else if (HEBREW_STATE[ch]) out.push({ label: "상태", value: HEBREW_STATE[ch], code: ch });
  }

  if (segments.length > 1) {
    out.push({ label: "결합", value: `접두 ${segments.length - 1}개`, code: segments.slice(0, -1).join("/") });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 설교 준비용 문법 해설                                                */
/* ------------------------------------------------------------------ */

/** 문법 자질 → 강단에서 쓸 수 있는 함의. 과잉 해석을 막는 주의 문구를 함께 둔다. */
const SERMON_NOTES: Record<string, string> = {
  "시제:부정과거":
    "사건을 하나의 완결된 점으로 본다. 과정이 아니라 '이미 일어난 일'로 제시할 때 쓴다. (다만 부정과거 자체가 '단 한 번'을 뜻하지는 않는다 — 문맥으로 확인할 것)",
  "시제:현재":
    "지속·반복되는 행위. '계속해서 ~하고 있다'로 살릴 수 있다.",
  "시제:미완료":
    "과거에 계속되던 행위. 장면을 늘려 묘사할 때 쓰인다.",
  "시제:완료":
    "과거에 완료된 행위가 지금도 효력을 갖는다. '이미 이루어졌고 지금도 유효하다'는 적용의 근거가 된다.",
  "시제:미래": "앞으로 일어날 일에 대한 선언·약속.",
  "태:중간":
    "행위의 결과가 주어 자신에게 돌아온다. '스스로', '자신을 위하여'의 뉘앙스를 살펴보라.",
  "태:수동":
    "주어가 행위를 받는다. 행위자가 생략되었다면 하나님을 가리키는 신적 수동태일 수 있다.",
  "법:명령법":
    "명령·권면. 현재 명령은 '계속 ~하라', 부정과거 명령은 '지금 ~하라'에 가깝다.",
  "법:가정법":
    "아직 실현되지 않은 일. 권면·목적·조건절에서 자주 나타난다.",
  "법:분사":
    "주동사에 딸린 행위. 시간(~할 때)·이유(~하므로)·수단(~함으로) 중 무엇인지 문맥으로 정해야 한다.",
  "법:부정사": "목적·결과·설명을 나타낸다. 주동사와의 논리 관계를 확인하라.",
  "격:속격": "소유·기원·내용 등 폭이 넓다. 어느 쪽인지 문맥이 정한다.",
  "격:여격": "간접목적·수단·장소·시간을 나타낸다.",
  "격:호격": "부르는 말. 청중을 직접 지목하는 대목이라 설교 도입에 쓰기 좋다.",
  "어간:히필(사역 능동)": "'~하게 하다'는 사역의 뜻. 주어가 행위를 일으킨다.",
  "어간:니팔(수동·재귀)": "수동 또는 재귀. 주어가 행위를 받거나 스스로에게 행한다.",
  "어간:피엘(강조 능동)": "행위의 강조·반복, 또는 상태로 만듦.",
  "어간:히트파엘(재귀)": "자신에게 되돌아오는 행위.",
  "형태:바브연속 미완료": "내러티브를 이어가는 기본 형태. '그리고 ~하였다'로 사건이 진행된다.",
  "형태:완료": "완결된 행위나 상태.",
};

function collectNotes(features: Feature[]): string[] {
  const notes: string[] = [];
  for (const f of features) {
    const note = SERMON_NOTES[`${f.label}:${f.value}`];
    if (note) notes.push(note);
  }
  return notes;
}

/* ------------------------------------------------------------------ */

/** 자질을 읽기 좋은 한 줄로 만든다. */
function buildSummary(posLabel: string, features: Feature[]): string {
  const order = ["종류", "어간", "시제", "태", "법", "형태", "인칭", "격", "성", "수", "상태", "급", "결합"];
  const rank = (label: string) => {
    const i = order.indexOf(label);
    return i === -1 ? order.length : i;
  };
  const sorted = [...features].sort((a, b) => rank(a.label) - rank(b.label));
  const tail = sorted.map((f) => f.value).join(" ");
  return tail ? `${posLabel} · ${tail}` : posLabel;
}

/** 원어 낱말 하나를 해석한다. */
export function analyze(word: Word, lang: Lang): AnalyzedWord {
  const features = lang === "grc" ? decodeGreek(word.pos, word.parse) : decodeHebrew(word.parse);
  const posLabel =
    lang === "grc"
      ? GREEK_POS[word.pos] ?? word.pos
      : HEBREW_POS[word.parse.replace(/^H/, "").split("/").pop()?.[0] ?? ""] ?? "미분류";

  return {
    ...word,
    lang,
    posLabel,
    features,
    summary: buildSummary(posLabel, features),
    sermonNotes: collectNotes(features),
  };
}

export { GREEK_POS, HEBREW_POS, SERMON_NOTES };
