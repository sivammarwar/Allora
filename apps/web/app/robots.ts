import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/contact", "/how-it-works", "/legal/"],
        disallow: [
          "/admin/",
          "/agent/",
          "/hero/",
          "/delivery/",
          "/pm/",
          "/pay/",
          "/secret-shop/",
          "/item-catalog/",
          "/main-inventory/",
          "/dashboard/",
          "/orders/",
          "/cart/",
        ],
      },
    ],
    sitemap: "https://bharat333.com/sitemap.xml",
  };
}
