import Link from "next/link";
import { EMPLOYMENT, POSITIONS, REGIONS, SAMPLE_JOBS, formatPay } from "@/lib/jobs";

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const params = await searchParams;
  const pick = (k: string) => (typeof params[k] === "string" ? params[k] : "");
  const region = pick("region");
  const position = pick("position");
  const employment = pick("employment");

  const jobs = SAMPLE_JOBS.filter(
    (j) =>
      (!region || j.region === region) &&
      (!position || j.position === position) &&
      (!employment || j.employment === employment)
  );

  const select = (name: string, label: string, options: readonly string[], value: string) => (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="rounded border border-line bg-surface px-3 py-2 text-sm"
      >
        <option value="">{label} 전체</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">청빙·구직</h1>
        <Link href="/jobs/new" className="text-sm text-accent hover:underline">
          공고 등록하기
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        대신 교단 승인 회원만 교회 연락처를 볼 수 있습니다.
      </p>

      <form className="mt-4 flex flex-wrap gap-2">
        {select("region", "지역", REGIONS, region)}
        {select("position", "직분", POSITIONS, position)}
        {select("employment", "형태", EMPLOYMENT, employment)}
        <button className="rounded bg-accent px-4 py-2 text-sm text-background">적용</button>
      </form>

      <p className="mt-4 text-xs text-muted">{jobs.length}건</p>

      <ul className="mt-2 space-y-3">
        {jobs.map((job) => (
          <li key={job.id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-medium">
                {job.position}
              </span>
              <span className="text-xs text-muted">{job.employment}</span>
              <span className="text-xs text-muted">· {job.region}</span>
            </div>
            <h2 className="mt-2 font-bold">{job.church}</h2>
            <p className="text-xs text-muted">{job.presbytery}</p>
            <p className="mt-2 text-sm">{job.duties}</p>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              <div><dt className="inline font-medium">사례비 </dt><dd className="inline">{formatPay(job)}</dd></div>
              <div><dt className="inline font-medium">사택 </dt><dd className="inline">{job.housing ? "제공" : "없음"}</dd></div>
              <div><dt className="inline font-medium">마감 </dt><dd className="inline">{job.deadline}</dd></div>
            </dl>
            {job.payNote && (
              <p className="mt-2 rounded bg-accent-soft px-2 py-1 text-xs">
                사례비 비공개 사유: {job.payNote}
              </p>
            )}
          </li>
        ))}
      </ul>

      {jobs.length === 0 && (
        <p className="mt-6 rounded border border-dashed border-line p-6 text-center text-sm text-muted">
          조건에 맞는 공고가 없습니다.
        </p>
      )}
    </div>
  );
}
