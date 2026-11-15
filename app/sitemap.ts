import type { MetadataRoute } from "next";
import { ROUTES } from "./site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-15T00:00:00.000Z");
  return [...ROUTES, "/tienda", "/tienda/condiciones"].map((route) => ({
    url: `https://sierradoc.site${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: route === "/" || route === "/en" ? 1 : 0.7,
  }));
}
