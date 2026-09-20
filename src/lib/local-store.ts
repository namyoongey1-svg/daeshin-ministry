"use client";

/**
 * 브라우저에만 남는 작업 문서를 담는 저장소.
 *
 * localStorage는 서버 렌더에 없으므로 useSyncExternalStore로 감싼다.
 * effect 안에서 setState로 끌어오면 하이드레이션 중 한 번 더 그려진다.
 */
export interface LocalStore<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
  getServerSnapshot(): T;
  set(value: T): void;
  update(updater: (current: T) => T): void;
  reset(): void;
}

export function createLocalStore<T>(
  key: string,
  initial: T,
  /** 저장된 값을 현재 모양으로 맞춘다. 항목이 늘어난 뒤에도 옛 저장본을 읽기 위함. */
  revive: (raw: unknown) => T = (raw) => raw as T
): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cache: T | null = null;

  function read(): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? revive(JSON.parse(raw)) : initial;
    } catch {
      // 저장값이 깨졌거나 저장소를 못 쓰는 브라우저 — 빈 상태로 연다.
      return initial;
    }
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  function commit(value: T) {
    cache = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 저장에 실패해도 화면 상태는 유지한다.
    }
    emit();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      // 다른 탭에서 바뀌면 캐시를 버리고 다시 읽는다.
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cache = null;
          emit();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot: () => (cache ??= read()),
    getServerSnapshot: () => initial,
    set: commit,
    update(updater) {
      commit(updater(cache ??= read()));
    },
    reset() {
      try {
        localStorage.removeItem(key);
      } catch {
        // 지우지 못해도 화면은 초기 상태로 돌린다.
      }
      cache = initial;
      emit();
    },
  };
}

/** 목록 항목에 붙일 짧은 식별자. 정렬이나 보안 용도가 아니라 React key 용이다. */
export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
