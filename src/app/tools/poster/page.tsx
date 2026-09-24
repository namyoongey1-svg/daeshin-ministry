import type { Metadata } from "next";
import PosterEditor from "./PosterEditor";

export const metadata: Metadata = {
  title: "행사 포스터",
  description:
    "수련회·여름성경학교·부활절·성탄 포스터를 칸만 채우면 만듭니다. 단톡방용 정사각형, A4 인쇄, 예배당 스크린용 가로.",
  alternates: { canonical: "/tools/poster" },
};

export default function PosterPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">행사 포스터</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        칸을 채우면 포스터가 됩니다. 꾸미는 도구가 아니라 빠뜨리는 것 없이 반듯하게
        나오는 틀입니다. 사람들이 포스터에서 찾는 것은 결국 넷입니다 — 무엇을, 언제,
        어디서, 누가 오면 되는지.
      </p>
      <PosterEditor />
    </div>
  );
}
