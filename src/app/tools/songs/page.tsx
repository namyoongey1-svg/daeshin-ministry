import type { Metadata } from "next";
import Link from "next/link";
import { SongLibrary } from "./SongLibrary";

export const metadata: Metadata = {
  title: "곡 라이브러리",
  description:
    "찬양 곡을 한 번 등록해 두면 키·박자·송폼·악보가 따라옵니다. 콘티를 짤 때 제목만 고르면 됩니다.",
  alternates: { canonical: "/tools/songs" },
};

export default function SongsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">곡 라이브러리</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        콘티는 매주 새로 짜지만 곡은 쌓입니다. 한 번 등록해 두면 키·박자·송폼·악보가
        따라오므로, 다음 달에 같은 곡을 부를 때{" "}
        <Link href="/tools/setlist" className="text-accent hover:underline">콘티</Link>에서
        제목만 고르면 됩니다.
      </p>

      <SongLibrary />
    </div>
  );
}
