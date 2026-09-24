import type { Metadata } from "next";
import { RosterBoard } from "./RosterBoard";

export const metadata: Metadata = {
  title: "명단 · 출석 · 생일",
  description:
    "교육부서 명단을 엑셀로 올리고 내려받습니다. 주일마다 이름을 눌러 출석을 세고, 다가오는 생일을 미리 알려 줍니다.",
  alternates: { canonical: "/tools/roster" },
};

export default function RosterPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">명단 · 출석 · 생일</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        교회 명단은 이미 엑셀로 있습니다. 그대로 올리면 주일마다 이름을 눌러 인원을
        세고, 다가오는 생일을 미리 봅니다. 교역자가 바뀌면 엑셀로 내려받아 넘기면
        됩니다.
      </p>

      <div className="mt-5 rounded-card border border-highlight px-4 py-3 text-xs leading-relaxed">
        <b>아이들 개인정보입니다.</b> 이름·생일·보호자 연락처가 한 줄에 모이면 흩어져
        있을 때보다 훨씬 민감한 자료가 됩니다. 이 명단은 <b>등록한 본인만</b> 볼 수
        있게 해 두었지만(DB에서 강제), 수집 자체에는 보호자 동의가 필요합니다.
        연락처는 선택 항목입니다 — 적지 않아도 출석과 생일은 그대로 됩니다.
      </div>

      <RosterBoard />
    </div>
  );
}
