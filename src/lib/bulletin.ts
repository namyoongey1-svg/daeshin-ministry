import { newId } from "./local-store";
import { formatReference, parseReference } from "./bible/books";
import { tidyHymn } from "./hymns";

export interface OrderItem {
  id: string;
  /** 순서명 — 묵도, 찬송, 성경봉독 … */
  title: string;
  /** 담당 — 다같이, 인도자, 담임목사, ○○○ 집사 */
  leader: string;
  /** 비고 — 찬송가 번호, 성경 구절, 설교 제목 */
  note: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
}

export interface ScheduleItem {
  id: string;
  when: string;
  what: string;
}

export interface Bulletin {
  churchName: string;
  pastor: string;
  address: string;
  phone: string;
  /** 예배 이름 — 주일 오전예배, 수요기도회 … */
  serviceName: string;
  date: string;
  /** 표어나 주제 말씀 */
  theme: string;
  order: OrderItem[];
  notices: Notice[];
  schedule: ScheduleItem[];
}

type Template = Omit<OrderItem, "id">[];

/**
 * 예배 순서 기본형.
 *
 * 장로교 예배 순서를 바탕으로 했고, 교회마다 다르므로 불러온 뒤 고쳐 쓰는 것을
 * 전제로 한다. 담당자 칸은 매주 바뀌므로 비워 두고, 자주 쓰는 값만 미리 채운다.
 */
export const TEMPLATES: Record<string, Template> = {
  "주일 오전예배": [
    { title: "묵도", leader: "다같이", note: "" },
    { title: "사도신경", leader: "다같이", note: "" },
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "기도", leader: "", note: "" },
    { title: "성경봉독", leader: "인도자", note: "" },
    { title: "찬양", leader: "찬양대", note: "" },
    { title: "설교", leader: "", note: "" },
    { title: "기도", leader: "설교자", note: "" },
    { title: "봉헌", leader: "다같이", note: "찬송가 ___장" },
    { title: "봉헌기도", leader: "", note: "" },
    { title: "광고", leader: "인도자", note: "" },
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "축도", leader: "", note: "" },
  ],
  "주일 오후예배": [
    { title: "묵도", leader: "다같이", note: "" },
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "기도", leader: "", note: "" },
    { title: "성경봉독", leader: "인도자", note: "" },
    { title: "설교", leader: "", note: "" },
    { title: "기도", leader: "설교자", note: "" },
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "주기도문", leader: "다같이", note: "" },
  ],
  "수요기도회": [
    { title: "묵도", leader: "다같이", note: "" },
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "기도", leader: "", note: "" },
    { title: "성경봉독", leader: "인도자", note: "" },
    { title: "말씀", leader: "", note: "" },
    { title: "합심기도", leader: "인도자", note: "" },
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "주기도문", leader: "다같이", note: "" },
  ],
  "새벽기도회": [
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "기도", leader: "인도자", note: "" },
    { title: "성경봉독", leader: "인도자", note: "" },
    { title: "말씀", leader: "", note: "" },
    { title: "합심기도", leader: "다같이", note: "" },
    { title: "주기도문", leader: "다같이", note: "" },
  ],
  "금요기도회": [
    { title: "경배와 찬양", leader: "찬양팀", note: "" },
    { title: "기도", leader: "", note: "" },
    { title: "성경봉독", leader: "인도자", note: "" },
    { title: "말씀", leader: "", note: "" },
    { title: "통성기도", leader: "다같이", note: "" },
    { title: "축도", leader: "", note: "" },
  ],
  "성찬예배": [
    { title: "묵도", leader: "다같이", note: "" },
    { title: "사도신경", leader: "다같이", note: "" },
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "기도", leader: "", note: "" },
    { title: "성경봉독", leader: "인도자", note: "" },
    { title: "설교", leader: "", note: "" },
    { title: "성찬 제정의 말씀", leader: "집례자", note: "고전 11:23-26" },
    { title: "떡과 잔을 나눔", leader: "다같이", note: "" },
    { title: "감사기도", leader: "집례자", note: "" },
    { title: "찬송", leader: "다같이", note: "찬송가 ___장" },
    { title: "축도", leader: "", note: "" },
  ],
};

export const SERVICE_NAMES = Object.keys(TEMPLATES);

export function buildOrder(serviceName: string): OrderItem[] {
  const template = TEMPLATES[serviceName] ?? TEMPLATES["주일 오전예배"];
  return template.map((item) => ({ ...item, id: newId() }));
}

/** "요3:16"처럼 흘려 쓴 구절을 "요한복음 3:16"으로 펴 준다. 못 알아보면 그대로 둔다. */
export function tidyReference(note: string): string {
  const reference = parseReference(note);
  return reference ? formatReference(reference) : note;
}

/**
 * 비고 칸을 손봐 준다.
 *
 *   "요3:16"    → "요한복음 3:16"
 *   "찬송가 21장" → "찬송가 21장 (주 예수 이름 높이어)"
 *
 * 둘 다 아니면 적은 그대로 둔다. 설교 제목처럼 자유롭게 쓰는 칸이기 때문이다.
 */
export function tidyNote(note: string): string {
  const withHymn = tidyHymn(note);
  if (withHymn !== note) return withHymn;
  return tidyReference(note);
}

export function emptyBulletin(): Bulletin {
  return {
    churchName: "",
    pastor: "",
    address: "",
    phone: "",
    serviceName: "주일 오전예배",
    date: new Date().toISOString().slice(0, 10),
    theme: "",
    order: buildOrder("주일 오전예배"),
    notices: [],
    schedule: [],
  };
}

const WEEKDAYS = ["주일", "월", "화", "수", "목", "금", "토"];

export function formatKoreanDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const weekday = WEEKDAYS[date.getDay()];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}
