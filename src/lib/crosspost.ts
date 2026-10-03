import type { Denomination } from "./denomination";

/*
  다른 게시판에 올릴 글을 만들어 준다.

  자동으로 올리지 않는다. 수집 허락은 "읽어 가도 된다"는 허락이지 "글을
  넣어도 된다"는 허락이 아니고, 대부분의 게시판은 글쓰기 자격을 따로 건다.
  기계가 남의 공고를 대신 밀어 넣으면 게시판 쪽에서는 스팸이다.

  그래서 사람이 자기 자격으로 올리게 하되, 그 일을 30초로 줄인다. 게시판마다
  제목 꼴을 맞춘 글을 만들어 두고, 복사 단추 하나와 게시판 주소를 붙인다.

  게시판을 숨기지 않는다. 교단 게시판이라고 그 교단 교회만 올리는 것이
  아니다 — 백석대 게시판을 실제로 읽어 보면 합동·고신 교회도 올린다.
  거기는 "백석 출신이 보는 곳"이라는 뜻이다. 그래서 어느 교단 사람이 보는지
  적어 두고, 교회와 같은 교단 게시판을 앞에 놓기만 한다.
*/

export interface Board {
  id: string;
  label: string;
  /** 게시판 목록 주소. 글쓰기는 대개 로그인 뒤에 열려 목록으로 보낸다. */
  url: string;
  /** 주로 어느 교단 사람이 보는가. null 이면 여러 교단이 함께 본다. */
  audience: Denomination | null;
  /** 올리기 전에 알아야 할 것. 게시판이 직접 내건 안내만 적는다. */
  note?: string;
  /** 제목을 어떤 꼴로 다는 곳인가 */
  titleStyle: "bracket-region" | "plain";
}

export const BOARDS: Board[] = [
  {
    id: "godpeople",
    label: "갓피플취업",
    url: "https://recruit.godpeople.com/?GO=recruit_find",
    audience: null,
    titleStyle: "plain",
  },
  {
    id: "minitries",
    label: "청빙넷 부교역자 청빙",
    url: "https://minitries.co.kr/index",
    audience: null,
    titleStyle: "bracket-region",
  },
  {
    id: "puts",
    label: "장신대 초빙게시판",
    url: "https://www.puts.ac.kr/www/board/list.general.asp?design=lounge&m1=4&m2=4&m3=1&bd_name=jangshin_jboard04",
    audience: "예장 통합",
    note: "말머리를 '초빙공고'로 고르세요. 사람을 구하면 '초빙완료'로 바꿔 달라는 것이 게시판 공지입니다. 문의: 경건교육실 02-450-0756",
    titleStyle: "plain",
  },
  {
    id: "aats",
    label: "총신대 신대원 총동창회",
    url: "http://aats.kr/main/bbs/board.php?bo_table=b05",
    audience: "예장 합동",
    titleStyle: "plain",
  },
  {
    id: "baekseok",
    label: "백석대 신대원 정보나눔터",
    url: "https://www.bu.ac.kr/graduateschool/3938/subview.do",
    audience: "예장 백석",
    note: "제목을 '[지역] 교회명' 꼴로 다는 곳입니다.",
    titleStyle: "bracket-region",
  },
  {
    id: "hapdong",
    label: "합동신학대학원 교역자초빙",
    url: "https://www.hapdong.ac.kr/bbs/board.php?bo_table=e03",
    audience: "예장 합신",
    titleStyle: "plain",
  },
  {
    id: "kosin",
    label: "고려신학대학원 교역자초빙",
    url: "https://www.kts.ac.kr/home/pinvit",
    audience: "예장 고신",
    note: "게시판 공지: 타교단 공고는 지워질 수 있습니다.",
    titleStyle: "plain",
  },
  {
    id: "kehc",
    label: "기독교대한성결교회 총회 구인구직",
    url: "https://kehc.org/home/job",
    audience: "기독교대한성결교회",
    note: "글쓰기 권한을 따로 받아야 합니다. 게시판의 '구인구직 글쓰기 권한부여' 공지를 보세요.",
    titleStyle: "plain",
  },
  {
    id: "mtu",
    label: "감리교신학대 취업게시판",
    url: "https://www.mtu.ac.kr/mtu/board/list.do?mId=162",
    audience: "기독교대한감리회",
    note: "직접 올리는 곳이 아닙니다. 게시판 공지대로 양식을 읽은 뒤 job@mtu.ac.kr 로 메일을 보내면 학교가 올립니다.",
    titleStyle: "bracket-region",
  },
  {
    id: "nambu",
    label: "감리회 남부연회 사역자청빙",
    url: "http://www.nambukmc.com/main/sub.html?pageCode=85",
    audience: "기독교대한감리회",
    titleStyle: "bracket-region",
  },
];

export interface PostedJob {
  church: string;
  denomination: string;
  region: string;
  address: string;
  pastor: string;
  title: string;
  position: string;
  employment: string;
  department: string;
  duties: string;
  payMin: number | null;
  payMax: number | null;
  payNote: string;
  housing: boolean;
  deadline: string;
  contactName: string;
  contactPhone: string;
}

/**
 * 교회에 맞는 차례로 게시판을 늘어놓는다.
 *
 * 여러 교단이 함께 보는 곳을 맨 앞에 둔다. 누구나 올릴 수 있고 보는 사람도
 * 가장 많다. 그다음이 같은 교단 게시판, 마지막이 다른 교단 게시판이다.
 */
export type Fit = "모두" | "같은 교단" | "다른 교단";

export function rankBoards(denomination: string): (Board & { fit: Fit })[] {
  const fit = (b: Board): Fit =>
    b.audience === null ? "모두" : b.audience === denomination ? "같은 교단" : "다른 교단";
  const order = { 모두: 0, "같은 교단": 1, "다른 교단": 2 } as const;
  return BOARDS.map((b) => ({ ...b, fit: fit(b) }))
    .sort((a, b) => order[a.fit] - order[b.fit]);
}

/** 사례비를 한 줄로. 범위가 없으면 적어 둔 사유를 그대로 쓴다. */
function describePay(job: PostedJob): string {
  const parts: string[] = [];
  if (job.payMin && job.payMax) {
    parts.push(job.payMin === job.payMax ? `월 ${job.payMin}만원` : `월 ${job.payMin}~${job.payMax}만원`);
  }
  if (job.payNote) parts.push(job.payNote);
  if (job.housing) parts.push("사택 제공");
  return parts.join(" / ") || "협의";
}

/**
 * 게시판 제목.
 *
 * 백석대·청빙넷·감리회 쪽은 "[지역] 교회명 …" 꼴이 굳어 있다. 그 꼴을
 * 따르지 않으면 목록에서 눈에 안 띄고, 지역으로 찾는 사람에게 걸리지 않는다.
 */
export function formatTitle(job: PostedJob, board: Board): string {
  if (board.titleStyle === "bracket-region") {
    const where = job.address.split(/\s+/).slice(0, 2).join(" ") || job.region;
    return `[${where}] ${job.church} ${job.title}`;
  }
  return job.title.includes(job.church) ? job.title : `${job.church} ${job.title}`;
}

/**
 * 본문. 어느 게시판에나 그대로 붙일 수 있게 줄 단위 칸으로 적는다.
 *
 * 게시판마다 편집기가 달라 굵게·표 같은 꾸밈은 깨진다. 맨 글자와 줄바꿈만 쓴다.
 */
export function formatBody(job: PostedJob, withLink: boolean): string {
  const role = [job.position, job.employment, job.department].filter(Boolean).join(" · ");
  // null 은 적을 것이 없어 빼는 줄, "" 는 일부러 띄우는 빈 줄이다. 둘을
  // 섞으면 담임목사를 안 적었을 때 엉뚱한 자리에 빈 줄이 생긴다.
  const lines = [
    `■ 교회: ${job.church} (${job.denomination})`,
    `■ 지역: ${job.address || job.region}`,
    job.pastor ? `■ 담임목사: ${job.pastor}` : null,
    `■ 모집: ${role}`,
    "",
    "■ 사역 내용",
    job.duties,
    "",
    `■ 사례: ${describePay(job)}`,
    `■ 마감: ${job.deadline || "채용 시까지"}`,
    `■ 문의: ${job.contactName} ${job.contactPhone}`,
  ].filter((line): line is string => line !== null);

  if (withLink) {
    lines.push("", "※ 교역자 사역자톡방에서도 보실 수 있습니다.", "https://daeshin-ministry.vercel.app/jobs");
  }
  return lines.join("\n");
}
