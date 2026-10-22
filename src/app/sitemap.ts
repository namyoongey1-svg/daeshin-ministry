import type { MetadataRoute } from "next";
import { jobId, listOpenJobs } from "@/lib/scrape/store";
import { getSiteUrl } from "@/lib/site-url";

/** 색인되길 바라는 공개 화면 */
const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/jobs/recommend", priority: 0.9, changeFrequency: "daily" },
  { path: "/jobs/map", priority: 0.8, changeFrequency: "daily" },
  { path: "/recreation", priority: 0.7, changeFrequency: "weekly" },
  { path: "/quiz", priority: 0.7, changeFrequency: "weekly" },
  { path: "/study", priority: 0.8, changeFrequency: "weekly" },
  { path: "/jobs", priority: 0.9, changeFrequency: "daily" },
  { path: "/tools/original", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tools/bulletin", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tools/sermon", priority: 0.7, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  const pages: MetadataRoute.Sitemap = PAGES.map((page) => ({
    url: `${siteUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // 모집 중인 공고마다 한 줄. 마감된 공고는 뺀다 — 끝난 자리로 사람을
  // 부르지 않는다. 사천 건 남짓이라 사이트맵 한 장(5만 줄)에 넉넉히 든다.
  const jobs: MetadataRoute.Sitemap = (await listOpenJobs()).map((job) => ({
    url: `${siteUrl}/jobs/${jobId(job)}`,
    lastModified: job.postedAt ? new Date(`${job.postedAt}T00:00:00+09:00`) : lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...pages, ...jobs];
}
