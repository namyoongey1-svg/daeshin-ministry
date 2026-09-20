import { newId } from "./local-store";

export type Priority = "필수" | "권장" | "여유되면";

export const PRIORITIES: Priority[] = ["필수", "권장", "여유되면"];

export interface Shot {
  id: string;
  /** 무엇을 찍는가 */
  scene: string;
  /** 어떻게 찍는가 — 앵글, 길이, 주의할 점 */
  detail: string;
  priority: Priority;
  /** 촬영 완료 표시 — 행사 중에 체크하며 쓴다 */
  done: boolean;
}

export interface Segment {
  id: string;
  name: string;
  seconds: number;
  /** 어떤 장면을 붙일지 */
  content: string;
  music: string;
  /** 화면에 올릴 자막 */
  caption: string;
}

export interface VideoPlan {
  title: string;
  eventDate: string;
  /** 어디에 쓰는 영상인가 — 쓰임새에 따라 길이와 음악이 달라진다 */
  purpose: string;
  targetSeconds: number;
  shots: Shot[];
  segments: Segment[];
  notes: string;
}

export const PURPOSES = [
  "예배 중 상영",
  "유튜브 공개",
  "교회 단톡방 공유",
  "행사 마지막 날 상영",
  "보고용 (노회·총회)",
] as const;

type ShotTemplate = Omit<Shot, "id" | "done">[];

/**
 * 행사별로 놓치기 쉬운 장면을 미리 적어 둔다.
 *
 * 스케치 영상에서 정작 빠지는 건 화려한 장면이 아니라, 준비하는 사람들과
 * 시작·끝 장면이다. 현장에서 찍을 때는 생각나지 않으므로 목록으로 들고 간다.
 */
export const SHOT_TEMPLATES: Record<string, ShotTemplate> = {
  "수련회 · 캠프": [
    { scene: "출발 전 단체샷", detail: "버스 앞. 인트로에 쓸 장면이라 밝게", priority: "필수" },
    { scene: "이동·도착", detail: "짐 옮기는 모습, 숙소 배정. 10초 이상", priority: "권장" },
    { scene: "개회예배 전경", detail: "뒤쪽 높은 곳에서 전체가 들어오게", priority: "필수" },
    { scene: "찬양하는 모습", detail: "손 든 모습, 눈 감은 얼굴 클로즈업 여러 컷", priority: "필수" },
    { scene: "말씀 듣는 표정", detail: "여러 사람을 3초씩. 강사보다 듣는 쪽이 더 쓰인다", priority: "필수" },
    { scene: "조별 모임", detail: "둘러앉아 나누는 장면. 소리는 안 써도 됨", priority: "권장" },
    { scene: "식사 시간", detail: "배식하는 봉사자까지. 자주 빠지는 장면", priority: "권장" },
    { scene: "레크리에이션", detail: "웃는 순간. 길게 찍어 두고 편집에서 고른다", priority: "권장" },
    { scene: "기도회", detail: "우는 모습은 반드시 본인 동의를 받고 쓴다", priority: "권장" },
    { scene: "결단·헌신 시간", detail: "영상의 절정. 넓게 한 컷, 가깝게 한 컷", priority: "필수" },
    { scene: "마지막 단체사진 찍는 장면", detail: "사진 찍는 모습 자체를 영상으로", priority: "권장" },
    { scene: "돌아오는 길", detail: "버스에서 잠든 모습. 마무리에 쓰기 좋다", priority: "여유되면" },
  ],
  "세례식": [
    { scene: "대기하는 세례자", detail: "긴장한 표정, 손 모은 모습", priority: "권장" },
    { scene: "세례 문답", detail: "정면보다 측면. 목사와 함께 잡히게", priority: "필수" },
    { scene: "물 붓는 순간", detail: "측면 클로즈업. 이 컷 하나가 영상의 중심", priority: "필수" },
    { scene: "회중의 반응", detail: "박수, 아멘 하는 표정", priority: "권장" },
    { scene: "가족의 표정", detail: "미리 어디 앉는지 확인해 둔다", priority: "필수" },
    { scene: "세례 후 인사·포옹", detail: "예배 끝난 뒤가 더 자연스럽다", priority: "권장" },
    { scene: "세례증서 받는 장면", detail: "증서가 화면에 읽히게", priority: "여유되면" },
  ],
  "임직식 · 헌신예배": [
    { scene: "임직자 입장", detail: "복도 쪽에서. 걸어 들어오는 전신", priority: "권장" },
    { scene: "서약", detail: "손 든 모습과 얼굴을 각각", priority: "필수" },
    { scene: "안수", detail: "머리 위 손들을 위에서. 이 장면이 핵심", priority: "필수" },
    { scene: "권면 말씀", detail: "말하는 목사와 듣는 임직자를 교차로", priority: "권장" },
    { scene: "축하 꽃다발", detail: "받는 순간의 표정", priority: "권장" },
    { scene: "가족 기념촬영", detail: "예배 후. 단체 기념사진 찍는 장면", priority: "권장" },
  ],
  "야외예배 · 체육대회": [
    { scene: "장소 전경", detail: "가능하면 높은 곳에서. 도입부에 쓴다", priority: "필수" },
    { scene: "예배 드리는 모습", detail: "야외라 소리가 잘 안 잡힌다. 그림 위주로", priority: "필수" },
    { scene: "경기 하이라이트", detail: "결정적 순간보다 반응이 더 쓰인다", priority: "권장" },
    { scene: "응원하는 모습", detail: "함성 지르는 장면. 소리까지 담기게", priority: "권장" },
    { scene: "뛰노는 아이들", detail: "보호자 동의 확인. 뒷모습도 좋다", priority: "권장" },
    { scene: "식사 준비하는 봉사자", detail: "가장 많이 빠지면서 가장 반응 좋은 장면", priority: "필수" },
    { scene: "정리·철수", detail: "마무리 자막과 함께 쓰기 좋다", priority: "여유되면" },
  ],
  "성탄 · 부활절": [
    { scene: "준비 과정", detail: "장식, 연습, 리허설. 행사 며칠 전부터", priority: "필수" },
    { scene: "예배 전경", detail: "조명이 어두우니 노출 확인", priority: "필수" },
    { scene: "특별순서 (성극·칸타타)", detail: "삼각대 고정으로 전체 한 컷 + 손에 들고 클로즈업", priority: "필수" },
    { scene: "어린이 순서", detail: "무대와 객석의 가족 반응을 함께", priority: "권장" },
    { scene: "성도들 표정", detail: "찬양 중, 촛불 예식 중", priority: "권장" },
    { scene: "나눔·교제", detail: "예배 후 떡·차 나누는 모습", priority: "권장" },
  ],
  "단기선교": [
    { scene: "공항 출발", detail: "짐 들고 모인 모습, 파송 기도", priority: "필수" },
    { scene: "현지 도착·환영", detail: "첫인상. 길게 찍어 둔다", priority: "권장" },
    { scene: "사역 현장", detail: "VBS, 봉사, 노방. 날마다 조금씩", priority: "필수" },
    { scene: "현지 아이들과 교감", detail: "촬영·공개 동의를 현지 사역자와 먼저 정리", priority: "필수" },
    { scene: "팀 회의·저녁 기도", detail: "지친 모습도 그대로", priority: "권장" },
    { scene: "마지막 날 작별", detail: "영상의 절정", priority: "필수" },
  ],
};

export const EVENT_TYPES = Object.keys(SHOT_TEMPLATES);

/** 3분 기준 기본 구성. 목표 길이에 맞춰 비율로 늘리고 줄인다. */
const BASE_SEGMENTS: Omit<Segment, "id">[] = [
  { name: "인트로", seconds: 15, content: "행사명 타이틀, 출발·준비 장면", music: "잔잔하게 시작", caption: "" },
  { name: "준비·도착", seconds: 30, content: "모이는 모습, 첫 장면", music: "", caption: "" },
  { name: "본편 1 — 예배·말씀", seconds: 45, content: "예배 전경, 찬양, 듣는 표정", music: "차분하게", caption: "" },
  { name: "본편 2 — 교제·활동", seconds: 45, content: "식사, 레크리에이션, 웃는 장면", music: "밝게", caption: "" },
  { name: "절정 — 은혜의 순간", seconds: 30, content: "기도, 결단, 눈물. 음악을 줄이고 현장음", music: "줄였다가 고조", caption: "" },
  { name: "마무리", seconds: 15, content: "단체사진, 다음 일정 안내", music: "잦아들며", caption: "" },
];

export function buildSegments(targetSeconds: number): Segment[] {
  const base = BASE_SEGMENTS.reduce((sum, s) => sum + s.seconds, 0);
  const ratio = targetSeconds > 0 ? targetSeconds / base : 1;
  return BASE_SEGMENTS.map((s) => ({
    ...s,
    id: newId(),
    seconds: Math.max(5, Math.round((s.seconds * ratio) / 5) * 5),
  }));
}

export function buildShots(eventType: string): Shot[] {
  const template = SHOT_TEMPLATES[eventType] ?? [];
  return template.map((s) => ({ ...s, id: newId(), done: false }));
}

export function emptyPlan(): VideoPlan {
  return {
    title: "",
    eventDate: new Date().toISOString().slice(0, 10),
    purpose: "예배 중 상영",
    targetSeconds: 180,
    shots: [],
    segments: buildSegments(180),
    notes: "",
  };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

/** 촬영 전에 한 번 읽고 가는 원칙. 고정 안내라 편집 대상이 아니다. */
export const SHOOTING_RULES = [
  "한 장면은 최소 10초씩 찍는다. 편집에서 3초를 쓰더라도 앞뒤가 있어야 자른다.",
  "가로로 찍는다. 세로 영상은 예배당 스크린에 올릴 수 없다.",
  "줌을 쓰지 말고 다가가서 찍는다. 디지털 줌은 화질이 무너진다.",
  "미성년자는 보호자 동의를 미리 받는다. 행사 안내문에 촬영 사실을 적어 두면 편하다.",
  "우는 모습·기도하는 모습은 본인 동의 없이 쓰지 않는다. 뒷모습이나 손만 잡는 방법도 있다.",
  "유튜브에 공개한다면 음악을 조심한다. CCM 반주·음원은 대부분 별도 허락이 필요하고, 교회의 CCLI 등록은 예배 중 사용 범위라 온라인 공개까지 덮어 주지 않는다.",
];
