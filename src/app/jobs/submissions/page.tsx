import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveSubmission, rejectSubmission } from "./actions";

export const metadata: Metadata = {
  title: "접수된 공고",
  robots: { index: false },
};

interface Submission {
  id: string;
  church_name: string;
  denomination: string;
  region: string;
  address: string | null;
  pastor: string | null;
  title: string;
  position: string;
  employment: string;
  department: string | null;
  duties: string;
  pay_min: number | null;
  pay_max: number | null;
  pay_note: string;
  housing: boolean;
  deadline: string | null;
  contact_name: string;
  contact_phone: string;
  status: string;
  created_at: string;
}

function pay(s: Submission): string {
  const parts: string[] = [];
  if (s.pay_min !== null && s.pay_max !== null) {
    parts.push(s.pay_min === s.pay_max ? `월 ${s.pay_min}만원` : `월 ${s.pay_min}~${s.pay_max}만원`);
  }
  if (s.pay_note) parts.push(s.pay_note);
  if (s.housing) parts.push("사택");
  return parts.join(" / ");
}

/** 운영진이 접수된 공고를 보고 게시하거나 거절한다. */
export default async function SubmissionsPage() {
  const session = await getSession();
  if (!isAdmin(session)) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold">접수된 공고</h1>
        <p className="mt-6 rounded-card border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          운영진에게만 보입니다.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase!
    .from("job_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data as Submission[] | null) ?? [];
  const waiting = rows.filter((r) => r.status === "대기");
  const done = rows.filter((r) => r.status !== "대기");

  const button =
    "rounded-pill px-4 py-2 text-sm font-medium transition-colors";

  return (
    <div className="max-w-3xl">
      <Link href="/jobs" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 청빙·구직으로
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">접수된 공고</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <Link href="/jobs/submit" className="text-accent hover:underline">/jobs/submit</Link>
        로 로그인 없이 들어온 글입니다. 게시하면 교회를 등록하고 목록에 올립니다.
      </p>

      {waiting.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          기다리는 글이 없습니다.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {waiting.map((s) => (
            <li key={s.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">{s.title}</h2>
                <span className="text-xs text-faint">{s.created_at.slice(0, 16).replace("T", " ")}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {s.church_name} · {s.denomination} · {s.region}
                {s.address && ` · ${s.address}`}
                {s.pastor && ` · 담임 ${s.pastor}`}
              </p>
              <p className="mt-1 text-sm text-muted">
                {s.position} · {s.employment}
                {s.department && ` · ${s.department}`}
                {s.deadline ? ` · 마감 ${s.deadline}` : " · 채용 시까지"}
                {pay(s) && ` · ${pay(s)}`}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{s.duties}</p>
              <p className="mt-3 text-sm">
                연락처 <b>{s.contact_name}</b> {s.contact_phone}
              </p>
              <div className="mt-4 flex gap-2">
                <form action={approveSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className={`${button} bg-accent text-background hover:bg-accent-hover`}>게시</button>
                </form>
                <form action={rejectSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className={`${button} border border-line hover:border-line-strong`}>거절</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-bold text-muted">처리한 글</h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
            {done.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="line-clamp-1">{s.church_name} — {s.title}</span>
                <span className="shrink-0 text-xs">{s.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
