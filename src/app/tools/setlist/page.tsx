import type { Metadata } from "next";
import SetlistEditor from "./SetlistEditor";

export const metadata: Metadata = {
  title: "찬양 콘티",
  description:
    "곡 순서와 조, 연결을 정리해 단톡방에 그대로 붙일 글로 내보냅니다. 조가 멀리 건너뛰거나 분위기가 갑자기 바뀌는 자리를 짚어 줍니다.",
  alternates: { canonical: "/tools/setlist" },
};

/**
 * 로그인을 여기서 확인하지 않는다.
 *
 * 확인하려면 쿠키를 읽어야 하고, 그 순간 이 화면은 요청마다 새로 그려진다.
 * 로그인하지 않은 사람까지 인증 서버를 다녀와야 첫 화면을 보게 되는데,
 * 이 도구의 쓸모는 열자마자 쓸 수 있다는 것이다. 저장 칸이 스스로 물어본다.
 */
export default function SetlistPage() {
  return <SetlistEditor />;
}
