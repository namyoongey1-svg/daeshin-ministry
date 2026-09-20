import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/** 색인되길 바라는 공개 화면 */
const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/jobs", priority: 0.9, changeFrequency: "daily" },
  { path: "/tools/original", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tools/bulletin", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tools/sermon", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tools/video", priority: 0.7, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  return PAGES.map((page) => ({
    url: `${siteUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
