import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bharat333.com";
  const now = new Date();

  return [
    { url: base,                        lastModified: now, changeFrequency: "weekly",  priority: 1 },
    { url: `${base}/about`,             lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`,           lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/how-it-works`,      lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/legal/privacy`,     lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/legal/terms`,       lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/legal/refund`,      lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
