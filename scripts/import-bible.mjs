/**
 * 공개 라이선스 원어 성경 데이터를 내려받아 앱이 읽는 JSON으로 바꾼다.
 *
 *   헬라어 본문+형태소 : MorphGNT / SBLGNT      (CC BY-SA 4.0)
 *   히브리어 본문+형태소: OpenScriptures OSHB    (CC BY 4.0)
 *   헬라어 사전        : Strong's Greek         (CC BY-SA, 1890 원본은 퍼블릭 도메인)
 *   히브리어 사전      : Strong's Hebrew        (동일)
 *   라틴어 본문        : Clementine Vulgate     (퍼블릭 도메인, seven1m/open-bibles)
 *   70인역 본문        : Brenton LXX 1851       (퍼블릭 도메인, eBible.org grcbrent)
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

/* ---------------------------- 라틴어 ---------------------------- */

const VULGATE = "https://raw.githubusercontent.com/seven1m/open-bibles/master/lat-clementine.usfx.xml";

/** USFX 책 코드 → OSIS. 66권만 가져온다. 제2경전은 우리 책 목록에 없다. */
const USFX_TO_OSIS = {
  GEN: "Gen", EXO: "Exod", LEV: "Lev", NUM: "Num", DEU: "Deut", JOS: "Josh", JDG: "Judg", RUT: "Ruth",
  "1SA": "1Sam", "2SA": "2Sam", "1KI": "1Kgs", "2KI": "2Kgs", "1CH": "1Chr", "2CH": "2Chr", EZR: "Ezra",
  NEH: "Neh", EST: "Esth", JOB: "Job", PSA: "Ps", PRO: "Prov", ECC: "Eccl", SNG: "Song", ISA: "Isa",
  JER: "Jer", LAM: "Lam", EZK: "Ezek", DAN: "Dan", HOS: "Hos", JOL: "Joel", AMO: "Amos", OBA: "Obad",
  JON: "Jonah", MIC: "Mic", NAM: "Nah", HAB: "Hab", ZEP: "Zeph", HAG: "Hag", ZEC: "Zech", MAL: "Mal",
  MAT: "Matt", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts", ROM: "Rom", "1CO": "1Cor", "2CO": "2Cor",
  GAL: "Gal", EPH: "Eph", PHP: "Phil", COL: "Col", "1TH": "1Thess", "2TH": "2Thess", "1TI": "1Tim",
  "2TI": "2Tim", TIT: "Titus", PHM: "Phlm", HEB: "Heb", JAS: "Jas", "1PE": "1Pet", "2PE": "2Pet",
  "1JN": "1John", "2JN": "2John", "3JN": "3John", JUD: "Jude", REV: "Rev",
};

/**
 * 불가타는 형태소 데이터가 없어 본문만 둔다. 절 번호는 불가타 것 그대로다 —
 * 시편은 히브리어 성경보다 대개 하나 작다 (불가타 22편 = 우리 23편).
 */
async function importLatin() {
  const xml = await get(VULGATE);
  await mkdir(path.join(ROOT, "bible", "lat"), { recursive: true });
  let books = 0;
  let verses = 0;
  for (const m of xml.matchAll(/<book id="([^"]+)">([\s\S]*?)<\/book>/g)) {
    const osis = USFX_TO_OSIS[m[1]];
    if (!osis) continue;
    const v = {};
    let chapter = 0;
    for (const t of m[2].matchAll(/<c id="(\d+)"\/>|<v id="(\d+)"\/>([\s\S]*?)<ve\/>/g)) {
      if (t[1]) { chapter = Number(t[1]); continue; }
      const text = t[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").replace(/\s+([,.;:?!])/g, "$1").trim();
      if (text) { v[`${chapter}:${t[2]}`] = text; verses++; }
    }
    await writeFile(path.join(ROOT, "bible", "lat", `${osis}.json`), JSON.stringify({ osis, lang: "lat", v }));
    books++;
  }
  console.log(`라틴어 ${books}권 ${verses.toLocaleString()}절`);
}

/* ---------------------------- 70인역 ---------------------------- */

const LXX_ZIP = "https://ebible.org/Scriptures/grcbrent_usfx.zip";

/**
 * 브렌튼 70인역. 구약을 헬라어로 읽는 스터디에 쓴다. 형태소 데이터는 없다.
 * eBible 은 zip 으로만 내주므로, 미리 풀어 둔 XML 경로를 LXX_XML 로 준다.
 * (zip 풀기를 위해 의존성을 더하지 않는다.)
 *
 * 책 코드가 불가타와 조금 다르다: 에스더 ESG, 다니엘 DAG, 에스라·느헤미야는
 * EZR 한 책(23장)이라 11장부터를 느헤미야로 돌린다. 시편은 그리스어 번호
 * 그대로 둔다 — 읽을 때 vulgatePsalm 으로 맞춘다.
 */
async function importLxx() {
  const file = process.env.LXX_XML;
  if (!file) throw new Error(`LXX_XML 에 풀어 둔 grcbrent_usfx.xml 경로를 주세요 (${LXX_ZIP})`);
  const xml = await (await import("node:fs/promises")).readFile(file, "utf8");
  await mkdir(path.join(ROOT, "bible", "lxx"), { recursive: true });
  const map = { ...USFX_TO_OSIS, ESG: "Esth", DAG: "Dan" };
  const books = {};
  for (const m of xml.matchAll(/<book id="([^"]+)">([\s\S]*?)<\/book>/g)) {
    const osis = map[m[1]];
    if (!osis) continue;
    let chapter = 0;
    for (const t of m[2].matchAll(/<c id="(\d+)"\s*\/>|<v id="(\d+)"[^>]*\/>([\s\S]*?)<ve\s*\/>/g)) {
      if (t[1]) { chapter = Number(t[1]); continue; }
      const text = t[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      let book = osis, ch = chapter;
      if (osis === "Ezra" && chapter > 10) { book = "Neh"; ch = chapter - 10; }
      (books[book] ??= {})[`${ch}:${t[2]}`] = text;
    }
  }
  let verses = 0;
  for (const [osis, v] of Object.entries(books)) {
    verses += Object.keys(v).length;
    await writeFile(path.join(ROOT, "bible", "lxx", `${osis}.json`), JSON.stringify({ osis, lang: "lxx", v }));
  }
  console.log(`70인역 ${Object.keys(books).length}권 ${verses.toLocaleString()}절`);
}

const only = process.argv[2];
if (!only || only === "greek") await importGreek();
if (!only || only === "hebrew") await importHebrew();
if (!only || only === "lexicon") await importLexicons();
if (!only || only === "latin") await importLatin();
if (only === "lxx") await importLxx();
console.log("완료");
