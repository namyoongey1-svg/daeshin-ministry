import Link from "next/link";

export default function NewJobPage() {
  return (
    <div className="max-w-xl">
      <Link href="/jobs" className="text-sm text-muted hover:text-accent">
        ← 청빙·구직으로
      </Link>
      <h1 className="mt-2 text-xl font-bold">공고 등록</h1>
      <p className="mt-3 rounded border border-dashed border-line p-5 text-sm leading-relaxed text-muted">
        등록 폼은 회원 인증(Supabase 연동)이 붙은 뒤에 열립니다.
        지금은 운영진이 직접 공고를 받아 올리고 있습니다.
      </p>
    </div>
  );
}
