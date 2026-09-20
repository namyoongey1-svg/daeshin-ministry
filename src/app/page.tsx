import Link from "next/link";
import { SAMPLE_JOBS, formatPay } from "@/lib/jobs";

const CARDS = [
  {
    href: "/jobs",
    title: "청빙·구직",
    body: "교단 내 청빙공고를 지역·직분·형태로 추려 봅니다. 사례비는 범위로 공개하거나, 비공개 시 사유를 밝힙니다.",
  },
  {
    href: "/tools/original",
    title: "원어 파싱",
    body: "구약 히브리어·신약 헬라어 본문을 낱말 단위로 분석합니다. 시제·태·법이 설교에서 뜻하는 바까지 함께 봅니다.",
  },
  {
    href: "/tools/sermon",
    title: "설교 노트",
    body: "원어 연구에서 담은 낱말을 개요에 붙여 한 편의 설교 초안으로 정리하고 내려받습니다.",
  },
] as const;

export default function Home() {
  const recent = SAMPLE_JOBS.slice(0, 3);

  return (
    <div>
      <section className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-2xl font-bold leading-snug">
          대신 교단 사역자들이
          <br />
          청빙 정보와 설교 준비를 함께 나누는 자리
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          톡방에서 흩어지던 청빙 소식을 한곳에 모으고, 원어 본문과 설교 자료를
          사역자끼리 열어 둡니다. 가입은 소속 교회·노회 확인 후 운영진 승인으로 이뤄집니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/jobs" className="rounded bg-accent px-4 py-2 text-sm text-background">
            청빙공고 보기
          </Link>
          <Link
            href="/tools/original"
            className="rounded border border-line px-4 py-2 text-sm hover:bg-accent-soft"
          >
            원어 파싱 써보기
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent"
          >
            <h2 className="font-bold">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">최근 청빙공고</h2>
          <Link href="/jobs" className="text-sm text-accent hover:underline">
            전체 보기
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
          {recent.map((job) => (
            <li key={job.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
              <span className="rounded bg-accent-soft px-2 py-0.5 text-xs">{job.position}</span>
              <span className="font-medium">{job.church}</span>
              <span className="text-xs text-muted">{job.region} · {job.employment}</span>
              <span className="ml-auto text-xs text-muted">{formatPay(job)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
