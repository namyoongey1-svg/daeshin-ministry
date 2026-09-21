import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { queryJobs } from "@/lib/scrape/store";
import { describeAlert, matchesAlert, type JobAlert } from "@/lib/alerts";
import AlertList from "./AlertList";

export const metadata: Metadata = {
  title: "새 공고 알림",
  description: "지역과 직분, 근무 형태를 정해 두면 맞는 청빙공고가 올라올 때 알려 드립니다.",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold sm:text-4xl">새 공고 알림</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        조건을 정해 두면 맞는 공고가 올라올 때 메일로 알려 드립니다.
        매일 아침 새로 모은 공고 중에서만 추려 보냅니다.
      </p>
      {children}
    </div>
  );
}

export default async function AlertsPage() {
  if (!getSupabaseEnv()) {
    return (
      <Shell>
        <p className="mt-8 rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">
          Supabase를 아직 연결하지 않아 알림 기능이 꺼져 있습니다.
        </p>
      </Shell>
    );
  }

  const session = await getSession();

  if (!session) {
    return (
      <Shell>
        <p className="mt-8 rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">
          알림을 받으려면{" "}
          <Link href="/login" className="text-accent underline-offset-4 hover:underline">
            로그인
          </Link>
          이 필요합니다.
        </p>
      </Shell>
    );
  }

  if (!session.profile) {
    return (
      <Shell>
        <p className="mt-8 rounded-card border border-dashed border-line p-8 text-center text-sm leading-relaxed text-muted">
          먼저{" "}
          <Link href="/account" className="text-accent underline-offset-4 hover:underline">
            소속 정보
          </Link>
          를 적어 주세요. 승인을 기다리는 동안에도 알림은 받으실 수 있습니다.
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase!
    .from("job_alerts")
    .select("id, region, position, employment, active, last_notified_at, created_at")
    .order("created_at", { ascending: false });

  const alerts = (data as JobAlert[] | null) ?? [];

  // 조건이 얼마나 넓은지 감이 오도록, 지금 올라와 있는 공고로 세어 보여 준다.
  const { posts } = await queryJobs();
  const counts = new Map(
    alerts.map((alert) => [alert.id, posts.filter((p) => matchesAlert(p, alert)).length])
  );

  return (
    <Shell>
      <AlertList
        alerts={alerts.map((alert) => ({
          ...alert,
          label: describeAlert(alert),
          matching: counts.get(alert.id) ?? 0,
        }))}
        email={session.email}
      />
    </Shell>
  );
}
