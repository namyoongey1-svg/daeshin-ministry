import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isAdmin, type MemberRole, type MemberStatus } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setMemberRole, setMemberStatus } from "./actions";

export const metadata: Metadata = {
  title: "회원 승인",
  robots: { index: false },
};

interface Member {
  id: string;
  name: string;
  phone: string | null;
  church_name: string;
  presbytery: string;
  position: string;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
}

const STATUS_STYLE: Record<MemberStatus, string> = {
  대기: "bg-highlight-soft text-highlight",
  승인: "bg-accent-soft text-accent",
  거절: "bg-sunken text-muted",
};

const button = "rounded-pill px-3.5 py-1.5 text-xs font-medium transition-colors";

function Row({ m, me }: { m: Member; me: string }) {
  return (
    <li className="rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-base">{m.name}</b>
            <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[m.status]}`}>{m.status}</span>
            {m.role !== "사역자" && (
              <span className="rounded-pill bg-sunken px-2 py-0.5 text-xs text-muted">{m.role}</span>
            )}
            {m.id === me && <span className="text-xs text-faint">(나)</span>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {m.church_name} · {m.presbytery} · {m.position}
            {m.phone && ` · ${m.phone}`}
          </p>
          <p className="mt-0.5 text-xs text-faint">신청 {m.created_at.slice(0, 10)}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {m.status !== "승인" && (
            <form action={setMemberStatus}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="승인" />
              <button className={`${button} bg-accent text-background hover:bg-accent-hover`}>승인</button>
            </form>
          )}
          {m.status !== "거절" && m.id !== me && (
            <form action={setMemberStatus}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="거절" />
              <button className={`${button} border border-line hover:border-line-strong`}>거절</button>
            </form>
          )}
          {m.status === "승인" && m.id !== me && (
            <form action={setMemberRole}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="role" value={m.role === "운영진" ? "사역자" : "운영진"} />
              <button className={`${button} border border-line text-muted hover:border-line-strong`}>
                {m.role === "운영진" ? "운영진 해제" : "운영진으로"}
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}

/** 운영진이 가입 신청을 보고 승인한다. 기다리는 사람이 위에 온다. */
export default async function MembersPage() {
  const session = await getSession();
  if (!isAdmin(session) || !session) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold">회원 승인</h1>
        <p className="mt-6 rounded-card border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          운영진에게만 보입니다.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase!
    .from("profiles")
    .select("id, name, phone, church_name, presbytery, position, role, status, created_at")
    .order("created_at", { ascending: false });
  const members = (data as Member[] | null) ?? [];
  const waiting = members.filter((m) => m.status === "대기");
  const rest = members.filter((m) => m.status !== "대기");

  return (
    <div className="max-w-2xl">
      <Link href="/account" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 내 정보로
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">회원 승인</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        승인하면 청빙공고의 교회 연락처를 보고, 공고·스터디·퀴즈를 올릴 수 있습니다.
        소속 교회와 교단이 실제인지 보고 눌러 주세요. 거절해도 계정은 남아, 소속을
        고쳐 다시 신청할 수 있습니다.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-bold">
          기다리는 중 <span className="text-highlight">{waiting.length}</span>
        </h2>
        {waiting.length === 0 ? (
          <p className="mt-3 rounded-card border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
            기다리는 신청이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {waiting.map((m) => <Row key={m.id} m={m} me={session.userId} />)}
          </ul>
        )}
      </section>

      {rest.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-bold text-muted">처리한 회원 {rest.length}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {rest.map((m) => <Row key={m.id} m={m} me={session.userId} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
