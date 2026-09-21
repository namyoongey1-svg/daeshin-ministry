import { newId } from "./local-store";

/*
  찬양 콘티.

  단순한 곡 목록이 아니라, 팀이 실제로 부딪히는 두 가지를 짚어 주는 것이 목적이다.
  하나는 조가 얼마나 멀리 건너뛰는가, 다른 하나는 분위기가 어떻게 이어지는가.
*/

/** 워십에서 흔히 쓰는 표기. Db·Eb·Ab·Bb는 플랫으로, F#은 샤프로 적는다. */
const KEY_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/** 같은 음을 가리키는 다른 표기까지 받아들인다. */
const ALIASES: Record<string, number> = {
  C: 0, "B#": 0,
  "C#": 1, DB: 1,
  D: 2,
  "D#": 3, EB: 3,
  E: 4, FB: 4,
  F: 5, "E#": 5,
  "F#": 6, GB: 6,
  G: 7,
  "G#": 8, AB: 8,
  A: 9,
  "A#": 10, BB: 10,
  B: 11, CB: 11,
};

export interface Key {
  /** 0=C … 11=B */
  pitch: number;
  minor: boolean;
}

/** "Bbm", "F#", "eb" 처럼 적은 조를 읽는다. 못 읽으면 null. */
export function parseKey(raw: string): Key | null {
  const text = raw.trim().replace(/\s/g, "");
  if (!text) return null;

  const m = text.match(/^([A-Ga-g])([#b♯♭]?)(m|min|minor)?$/i);
  if (!m) return null;

  const letter = m[1].toUpperCase();
  const accidental = m[2].replace("♯", "#").replace("♭", "b");
  const pitch = ALIASES[(letter + accidental).toUpperCase()];
  if (pitch === undefined) return null;

  return { pitch, minor: Boolean(m[3]) };
}

export function formatKey(key: Key): string {
  return KEY_NAMES[key.pitch] + (key.minor ? "m" : "");
}

/** 반음 단위로 올리고 내린다. 12를 넘으면 한 바퀴 돈다. */
export function transpose(key: Key, semitones: number): Key {
  return { ...key, pitch: (((key.pitch + semitones) % 12) + 12) % 12 };
}

/**
 * 5도권에서 두 조가 얼마나 떨어져 있는가.
 *
 * 반음 수보다 이쪽이 팀의 체감에 가깝다. G에서 D는 반음 7개나 떨어져 있지만
 * 5도권으로는 한 칸이라 쉽게 넘어간다. 반대로 G에서 Db는 반음 6개인데
 * 5도권으로는 여섯 칸이라 손이 완전히 달라진다.
 */
const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // C G D A E B F# Db Ab Eb Bb F

function fifthsIndex(key: Key): number {
  // 단조는 나란한장조로 바꿔 센다. Am과 C는 손이 같다.
  const pitch = key.minor ? (key.pitch + 3) % 12 : key.pitch;
  return FIFTHS.indexOf(pitch);
}

export function fifthsDistance(a: Key, b: Key): number {
  const diff = Math.abs(fifthsIndex(a) - fifthsIndex(b));
  return Math.min(diff, 12 - diff);
}

/* ------------------------------------------------------------------ */

export const MOODS = ["여는 찬양", "빠른 찬양", "느린 찬양", "경배", "응답·헌신"] as const;
export type Mood = (typeof MOODS)[number];

/** 앞 곡에서 이 곡으로 어떻게 넘어가는가 */
export const LINKS = ["바로", "간주", "전조", "멘트", "기도"] as const;
export type LinkKind = (typeof LINKS)[number];

export interface Song {
  id: string;
  title: string;
  /** 악보에 적힌 조 */
  originalKey: string;
  /** 실제로 부를 조. 비우면 원키 그대로 */
  key: string;
  bpm: string;
  meter: string;
  mood: Mood;
  link: LinkKind;
  /** 예상 길이(분) */
  minutes: string;
  note: string;
}

export const PARTS = ["인도", "건반", "일렉", "어쿠스틱", "베이스", "드럼", "싱어"] as const;

export interface Setlist {
  date: string;
  serviceName: string;
  leader: string;
  /** 파트별 담당자 */
  team: Record<string, string>;
  songs: Song[];
  note: string;
}

export function emptySong(): Song {
  return {
    id: newId(),
    title: "",
    originalKey: "",
    key: "",
    bpm: "",
    meter: "4/4",
    mood: "빠른 찬양",
    link: "바로",
    minutes: "",
    note: "",
  };
}

export function emptySetlist(): Setlist {
  return {
    date: new Date().toISOString().slice(0, 10),
    serviceName: "주일 1부 예배",
    leader: "",
    team: Object.fromEntries(PARTS.map((p) => [p, ""])),
    songs: [emptySong(), emptySong(), emptySong(), emptySong()],
    note: "",
  };
}

/** 실제로 부를 조. 적지 않았으면 원키를 쓴다. */
export function singingKey(song: Song): Key | null {
  return parseKey(song.key) ?? parseKey(song.originalKey);
}

/** 원키와 부를 키가 다르면 몇 도 올렸는지 적어 준다. */
export function transposeLabel(song: Song): string | null {
  const from = parseKey(song.originalKey);
  const to = parseKey(song.key);
  if (!from || !to || from.pitch === to.pitch) return null;

  const step = (to.pitch - from.pitch + 12) % 12;
  // 7반음 넘게 올리는 일은 드물다. 내린 것으로 읽는 편이 자연스럽다.
  const label = step > 6 ? `${step - 12}` : `+${step}`;
  return `${label}반음`;
}

export interface Hint {
  songId: string;
  kind: "key" | "flow";
  text: string;
}

/**
 * 콘티를 훑어 걸릴 만한 곳을 짚는다.
 *
 * 틀렸다고 말하지 않는다. 일부러 그렇게 짠 콘티도 많다. 다만 현장에서
 * 당황하기 쉬운 자리를 미리 알려 두는 편이 낫다.
 */
export function reviewSetlist(songs: Song[]): Hint[] {
  const hints: Hint[] = [];
  const filled = songs.filter((s) => s.title.trim());

  for (let i = 1; i < filled.length; i++) {
    const prev = filled[i - 1];
    const song = filled[i];

    const prevKey = singingKey(prev);
    const key = singingKey(song);
    if (prevKey && key) {
      const distance = fifthsDistance(prevKey, key);
      if (distance >= 4 && song.link === "바로") {
        hints.push({
          songId: song.id,
          kind: "key",
          text: `${formatKey(prevKey)} → ${formatKey(key)} 는 손이 많이 달라집니다. 간주나 멘트를 두면 팀이 따라가기 쉽습니다.`,
        });
      }
    }

    const fast = (m: Mood) => m === "빠른 찬양" || m === "여는 찬양";
    const slow = (m: Mood) => m === "느린 찬양" || m === "경배";
    if (fast(prev.mood) && slow(song.mood) && song.link === "바로") {
      hints.push({
        songId: song.id,
        kind: "flow",
        text: "빠른 곡에서 느린 곡으로 바로 넘어갑니다. 회중이 숨을 고를 자리가 필요할 수 있습니다.",
      });
    }
    if (slow(prev.mood) && fast(song.mood) && song.link === "바로") {
      hints.push({
        songId: song.id,
        kind: "flow",
        text: "느린 곡 뒤에 바로 빠른 곡이 옵니다. 분위기가 끊기지 않게 연결을 정해 두세요.",
      });
    }
  }

  // 같은 분위기가 세 곡 넘게 이어지는 자리
  let run = 1;
  for (let i = 1; i < filled.length; i++) {
    if (filled[i].mood === filled[i - 1].mood) {
      run++;
      if (run === 3) {
        hints.push({
          songId: filled[i].id,
          kind: "flow",
          text: `"${filled[i].mood}"이 세 곡째 이어집니다. 의도한 것이면 그대로 두셔도 됩니다.`,
        });
      }
    } else {
      run = 1;
    }
  }

  return hints;
}

export function totalMinutes(songs: Song[]): number {
  return songs.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
}
