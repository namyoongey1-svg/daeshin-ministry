/*
  설교 퀴즈.

  설교를 마치고 바로 푸는 퀴즈다. 들은 것을 한 번 더 붙잡게 하는 것이
  목적이지 등수를 매기는 것이 목적이 아니다.

  퀴즈앤 같은 곳은 진행자가 화면을 넘기면 모두가 같은 문제를 동시에 푼다.
  보기에는 좋지만 교회에서는 잘 안 맞는다. 늦게 들어온 사람은 못 끼고,
  본당 와이파이가 흔들리면 한 사람 때문에 전체가 멈춘다. 그래서 각자
  자기 속도로 푸는 쪽을 골랐다. 늦게 들어와도 되고, 끊겨도 자기 것만 다시
  하면 된다.

  참여자에게 로그인을 요구하지 않는다. 예배가 끝나고 2분 안에 시작해야 하는데
  가입부터 시키면 아무도 안 한다. 이름만 적고 들어온다.

  채점은 서버에서 한다. 정답을 브라우저로 내보내면 개발자 도구를 열 줄 아는
  중고등부 학생이 30초 만에 만점을 받는다.
*/

export interface QuizQuestion {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
}

export interface QuizSummary {
  id: string;
  title: string;
  sermon: string;
  code: string;
  open: boolean;
  question_count: number;
}

export interface BoardRow {
  player: string;
  score: number;
  finished_at: string;
}

/** 채점 결과. 정답과 풀이는 다 풀고 난 뒤에만 내려온다. */
export interface Graded {
  score: number;
  total: number;
  correct: number[];
  notes: string[];
}

/**
 * 참여 코드.
 *
 * 헷갈리는 글자를 뺀다. 0과 O, 1과 I 는 큰 화면에 띄워 놓고 받아 적게 하면
 * 반드시 틀린다. 숫자만 쓰지 않는 까닭은 여섯 자리 숫자가 전화번호처럼
 * 읽혀 외우기 어렵기 때문이다.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** 사람이 적어 넣은 코드를 맞춰 준다. 소문자로 치거나 빈칸을 넣는 일이 잦다. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/**
 * 등수.
 *
 * 같은 점수면 먼저 낸 사람이 앞이다. 그리고 한 사람이 여러 번 풀 수 있으므로
 * 가장 높은 점수만 남긴다 — 설교를 다시 듣고 또 푸는 것을 막을 이유가 없고,
 * 여러 번 푼 사람이 순위표를 도배하면 보기 싫다.
 */
export function rank(rows: BoardRow[]): BoardRow[] {
  const best = new Map<string, BoardRow>();
  for (const row of rows) {
    const kept = best.get(row.player);
    if (!kept || row.score > kept.score) best.set(row.player, row);
  }
  return [...best.values()].sort(
    (a, b) => b.score - a.score || a.finished_at.localeCompare(b.finished_at)
  );
}

/** 맞힌 수에 따라 건네는 말. 점수만 덩그러니 보여 주면 틀린 사람이 머쓱하다. */
export function encourage(score: number, total: number): string {
  if (total === 0) return "";
  const ratio = score / total;
  if (ratio === 1) return "다 맞히셨습니다. 말씀을 정말 잘 들으셨네요.";
  if (ratio >= 0.7) return "잘 들으셨습니다. 틀린 것만 한 번 더 보세요.";
  if (ratio >= 0.4) return "절반은 붙잡으셨습니다. 아래 풀이를 읽어 보세요.";
  return "괜찮습니다. 아래 풀이를 읽으면 오늘 말씀이 다시 잡힙니다.";
}
