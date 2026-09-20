/**
 * 공개 라이선스 원어 성경 데이터를 내려받아 앱이 읽는 JSON으로 바꾼다.
 *
 *   헬라어 본문+형태소 : MorphGNT / SBLGNT      (CC BY-SA 4.0)
 *   히브리어 본문+형태소: OpenScriptures OSHB    (CC BY 4.0)
 *   헬라어 사전        : Strong's Greek         (CC BY-SA, 1890 원본은 퍼블릭 도메인)
 *   히브리어 사전      : Strong's Hebrew        (동일)
 *
 * 실행: npm run import:bible
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src", "data");
const GNT = "https://raw.githubusercontent.com/morphgnt/sblgnt/master";
const WLC = "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc";

const GNT_FILES = [
  ["Matt", "61-Mt"], ["Mark", "62-Mk"], ["Luke", "63-Lk"], ["John", "64-Jn"],
  ["Acts", "65-Ac"], ["Rom", "66-Ro"], ["1Cor", "67-1Co"], ["2Cor", "68-2Co"],
  ["Gal", "69-Ga"], ["Eph", "70-Eph"], ["Phil", "71-Php"], ["Col", "72-Col"],
  ["1Thess", "73-1Th"], ["2Thess", "74-2Th"], ["1Tim", "75-1Ti"], ["2Tim", "76-2Ti"],
  ["Titus", "77-Tit"], ["Phlm", "78-Phm"], ["Heb", "79-Heb"], ["Jas", "80-Jas"],
  ["1Pet", "81-1Pe"], ["2Pet", "82-2Pe"], ["1John", "83-1Jn"], ["2John", "84-2Jn"],
  ["3John", "85-3Jn"], ["Jude", "86-Jud"], ["Rev", "87-Re"],
];

const OT_BOOKS = [
  "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam",
  "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov",
  "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos",
  "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",
];

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === 3) throw new Error(`${url} 실패: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

/** 악센트·이오타 등을 걷어내 사전 조회용 키를 만든다. */
export function normalizeGreek(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u1dc0-\u1dff]/g, "")
    .toLowerCase()
    .replace(/ς/g, "σ")
    .normalize("NFC");
}

/* ---------------------------- 헬라어 ---------------------------- */

async function importGreek() {
  await mkdir(path.join(ROOT, "bible", "grc"), { recursive: true });
  let total = 0;

  for (const [osis, file] of GNT_FILES) {
    const raw = await get(`${GNT}/${file}-morphgnt.txt`);
    const verses = {};

    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      // BBCCVV  pos  parse  text  word  normalized  lemma
      const [ref, pos, parse, text, , , lemma] = line.trim().split(/\s+/);
      const key = `${Number(ref.slice(2, 4))}:${Number(ref.slice(4, 6))}`;
      (verses[key] ??= []).push([text, lemma, pos, parse]);
      total++;
    }

    await writeFile(
      path.join(ROOT, "bible", "grc", `${osis}.json`),
      JSON.stringify({ osis, lang: "grc", v: verses })
    );
    process.stdout.write(`  ${osis} `);
  }
  console.log(`\n헬라어 ${total.toLocaleString()}단어`);
}

/* --------------------------- 히브리어 --------------------------- */

const VERSE_RE = /<verse osisID="([^"]+)">([\s\S]*?)<\/verse>/g;
const WORD_RE = /<w\b([^>]*)>([\s\S]*?)<\/w>/g;
const ATTR_RE = /(\w[\w:]*)="([^"]*)"/g;

async function importHebrew() {
  await mkdir(path.join(ROOT, "bible", "hbo"), { recursive: true });
  let total = 0;

  for (const osis of OT_BOOKS) {
    const xml = await get(`${WLC}/${osis}.xml`);
    const verses = {};

    for (const [, osisId, body] of xml.matchAll(VERSE_RE)) {
      const [, chapter, verse] = osisId.split(".");
      const key = `${Number(chapter)}:${Number(verse)}`;
      const words = [];

      for (const [, attrs, text] of body.matchAll(WORD_RE)) {
        const a = Object.fromEntries(
          [...attrs.matchAll(ATTR_RE)].map((m) => [m[1], m[2]])
        );
        words.push([text.trim(), a.lemma ?? "", "", a.morph ?? ""]);
        total++;
      }
      if (words.length) verses[key] = words;
    }

    await writeFile(
      path.join(ROOT, "bible", "hbo", `${osis}.json`),
      JSON.stringify({ osis, lang: "hbo", v: verses })
    );
    process.stdout.write(`  ${osis} `);
  }
  console.log(`\n히브리어 ${total.toLocaleString()}단어`);
}

/* ---------------------------- 사전 ---------------------------- */

async function importLexicons() {
  await mkdir(path.join(ROOT, "lexicon"), { recursive: true });

  // 헬라어: 사전형(악센트 제거) → { 뜻, 스트롱번호 }
  const js = await get(
    "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js"
  );
  const body = js.slice(js.indexOf("{"), js.lastIndexOf("}") + 1);
  const strongsGreek = JSON.parse(body);
  const greek = {};
  for (const [id, entry] of Object.entries(strongsGreek)) {
    if (!entry.lemma) continue;
    const key = normalizeGreek(entry.lemma);
    if (greek[key]) continue; // 먼저 나온 번호를 유지
    greek[key] = {
      s: id,
      g: (entry.strongs_def ?? entry.kjv_def ?? "").trim().replace(/\s+/g, " "),
      k: (entry.kjv_def ?? "").trim().replace(/\s+/g, " "),
    };
  }
  await writeFile(path.join(ROOT, "lexicon", "greek.json"), JSON.stringify(greek));
  console.log(`헬라어 사전 ${Object.keys(greek).length.toLocaleString()}항목`);

  // 히브리어: 스트롱번호 → { 표제어, 뜻 }
  const xml = await get(
    "https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml"
  );
  const hebrew = {};
  const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  for (const [, id, inner] of xml.matchAll(
    /<entry id="(H\d+)">([\s\S]*?)<\/entry>/g
  )) {
    const wordMatch = inner.match(/<w\b[^>]*>([^<]*)<\/w>/);
    const meaning = inner.match(/<meaning>([\s\S]*?)<\/meaning>/);
    const usage = inner.match(/<usage>([\s\S]*?)<\/usage>/);
    hebrew[id.slice(1)] = {
      w: wordMatch ? wordMatch[1] : "",
      g: meaning ? strip(meaning[1]) : "",
      k: usage ? strip(usage[1]) : "",
    };
  }
  await writeFile(path.join(ROOT, "lexicon", "hebrew.json"), JSON.stringify(hebrew));
  console.log(`히브리어 사전 ${Object.keys(hebrew).length.toLocaleString()}항목`);
}

const only = process.argv[2];
if (!only || only === "greek") await importGreek();
if (!only || only === "hebrew") await importHebrew();
if (!only || only === "lexicon") await importLexicons();
console.log("완료");
