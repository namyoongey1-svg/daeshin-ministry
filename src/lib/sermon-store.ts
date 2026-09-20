"use client";

/**
 * 설교 노트의 로컬 저장소.
 *
 * localStorage는 서버 렌더에 없으므로 useSyncExternalStore로 감싼다.
 * (effect 안에서 setState로 끌어오면 하이드레이션 중 한 번 더 그려진다.)
 */

export interface Clipping {
  ref: string;
  text: string;
  lemma: string;
  summary: string;
  gloss: string;
  notes: string[];
  at: number;
}

export interface Outline {
  passage: string;
  title: string;
  bigIdea: string;
  points: string[];
  application: string;
}

export interface SermonState {
  clippings: Clipping[];
  outline: Outline;
}

export const EMPTY_OUTLINE: Outline = {
  passage: "",
  title: "",
  bigIdea: "",
  points: ["", "", ""],
  application: "",
};

const CLIP_KEY = "daeshin.sermon.clippings";
const OUTLINE_KEY = "daeshin.sermon.outline";
const MAX_CLIPPINGS = 200;

const SERVER_STATE: SermonState = { clippings: [], outline: EMPTY_OUTLINE };

let cache: SermonState | null = null;
const listeners = new Set<() => void>();

function readStorage(): SermonState {
  try {
    const rawClips = localStorage.getItem(CLIP_KEY);
    const rawOutline = localStorage.getItem(OUTLINE_KEY);
    return {
      clippings: rawClips ? (JSON.parse(rawClips) as Clipping[]) : [],
      outline: rawOutline
        ? { ...EMPTY_OUTLINE, ...(JSON.parse(rawOutline) as Partial<Outline>) }
        : EMPTY_OUTLINE,
    };
  } catch {
    // 저장값이 깨졌거나 저장소를 못 쓰는 브라우저 — 빈 상태로 연다.
    return SERVER_STATE;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: SermonState) {
  cache = next;
  try {
    localStorage.setItem(CLIP_KEY, JSON.stringify(next.clippings));
    localStorage.setItem(OUTLINE_KEY, JSON.stringify(next.outline));
  } catch {
    // 저장에 실패해도 화면 상태는 유지한다.
  }
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바뀌면 캐시를 버리고 다시 읽는다.
  const onStorage = (e: StorageEvent) => {
    if (e.key === CLIP_KEY || e.key === OUTLINE_KEY) {
      cache = null;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): SermonState {
  return (cache ??= readStorage());
}

export function getServerSnapshot(): SermonState {
  return SERVER_STATE;
}

export function setOutline(outline: Outline) {
  commit({ ...getSnapshot(), outline });
}

export function removeClipping(at: number) {
  const state = getSnapshot();
  commit({ ...state, clippings: state.clippings.filter((c) => c.at !== at) });
}

/** 원어 파싱 화면에서 부른다. 이 화면이 열려 있지 않아도 동작해야 한다. */
export function addClipping(clipping: Clipping) {
  const state = getSnapshot();
  commit({
    ...state,
    clippings: [clipping, ...state.clippings].slice(0, MAX_CLIPPINGS),
  });
}
