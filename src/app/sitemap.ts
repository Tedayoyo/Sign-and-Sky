import type { MetadataRoute } from "next";
import builtin from "@/data/library.json";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages = ["", "/signs", "/results", "/share", "/about", ...builtin.signs.map((s) => `/signs/${s.record_number}`)];
  return pages.flatMap((p) =>
    (["en", "am"] as const).map((lang) => ({
      url: `${base}/${lang}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
      alternates: { languages: { en: `${base}/en${p}`, am: `${base}/am${p}` } },
    })),
  );
}
