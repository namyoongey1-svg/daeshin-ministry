/**
 * 새 공고 알림 발송.
 *
 *   npm run notify            -- 보낸다
 *   npm run notify -- --dry   -- 누구에게 무엇이 갈지만 찍어 본다
 *
 * 수집이 끝난 뒤 GitHub Actions에서 이어 돌린다. 열쇠가 없으면 아무것도
 * 하지 않고 조용히 끝난다. 알림은 있으면 좋은 기능이지 수집을 막을 이유는 아니다.
 *
 * 필요한 환경변수
 *   NEXT_PUBLIC_SUPABASE_URL      프로젝트 주소
 *   SUPABASE_SERVICE_ROLE_KEY     구독 정보를 모두 읽어야 하므로 서비스 롤이 필요하다
 *   RESEND_API_KEY                메일 발송
 *   NEXT_PUBLIC_SITE_URL          메일에 넣을 링크 주소
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildListings, type JobListing } from "@/lib/scrape/listings";
import { describeAlert, newMatches, type AlertInput } from "@/lib/alerts";
import type { ScrapedPost } from "@/lib/scrape/types";

interface AlertRow extends AlertInput {
  id: string;
  profile_id: string;
  last_notified_at: string | null;
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://daeshin-ministry.vercel.app").replace(/\/+$/, "");
const FROM = process.env.NOTIFY_FROM ?? "사역자톡방 <onboarding@resend.dev>";
const DRY = process.argv.includes("--dry");

function missing(): string[] {
  return ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (k) => !process.env[k]
  );
}

/** 메일 본문. 글자만으로 충분하다. 공고는 사이트에서 보게 한다. */
function buildMessage(label: string, posts: JobListing[]): string {
  const lines = [
    `"${label}" 조건에 맞는 공고가 ${posts.length}건 올라왔습니다.`,
    "",
  ];
  for (const post of posts.slice(0, 20)) {
    const bits = [post.location, post.employment, post.positions.join(", ")]
      .filter(Boolean)
      .join(" · ");
    lines.push(`${post.church ?? post.title}`, `  ${bits}`, `  ${post.url}`, "");
  }
  if (posts.length > 20) lines.push(`그 밖에 ${posts.length - 20}건이 더 있습니다.`, "");
  lines.push(
    `전체 보기: ${SITE}/jobs`,
    `알림 끄기: ${SITE}/alerts`
  );
  return lines.join("\n");
}

async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`  (RESEND_API_KEY 없음 — ${to} 에게 보내지 않고 건너뜀)`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`메일 발송 실패 ${res.status}: ${await res.text()}`);
}

async function main() {
  const absent = missing();
  if (absent.length) {
    console.log(`알림을 건너뜁니다. 없는 값: ${absent.join(", ")}`);
    return;
  }

  const posts = JSON.parse(
    await readFile(path.join(process.cwd(), "src", "data", "scraped", "posts.json"), "utf8")
  ) as ScrapedPost[];
  const listings = buildListings(posts.filter((p) => !p.closedAt));
  console.log(`모집 중인 공고 ${listings.length}건을 기준으로 봅니다.`);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("job_alerts")
    .select("id, profile_id, region, position, employment, last_notified_at")
    .eq("active", true);

  if (error) throw new Error(`구독을 읽지 못했습니다: ${error.message}`);
  const alerts = (data as AlertRow[] | null) ?? [];
  console.log(`켜져 있는 알림 ${alerts.length}개`);

  let sent = 0;
  const now = new Date().toISOString();

  for (const alert of alerts) {
    const matches = newMatches(listings, alert, alert.last_notified_at);
    if (matches.length === 0) continue;

    const { data: user } = await supabase.auth.admin.getUserById(alert.profile_id);
    const to = user?.user?.email;
    if (!to) {
      console.log(`  구독 ${alert.id}: 메일 주소를 찾지 못해 건너뜁니다.`);
      continue;
    }

    const label = describeAlert(alert);
    console.log(`  ${to} ← ${label} (${matches.length}건)`);

    if (DRY) continue;

    await sendMail(to, `[사역자톡방] 새 청빙공고 ${matches.length}건 — ${label}`, buildMessage(label, matches));
    await supabase.from("job_alerts").update({ last_notified_at: now }).eq("id", alert.id);
    sent++;
  }

  console.log(DRY ? "시험 실행이라 보내지 않았습니다." : `${sent}통 보냈습니다.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
