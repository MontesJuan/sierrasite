import type { MetadataRoute } from "next";
import { ROUTES } from "./site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2025-09-25T20:10:08.571Z");
  return ROUTES.map((route) => ({
    url: `https://sierradoc.site${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: route === "/" || route === "/en" ? 1 : 0.7,
  }));
}
