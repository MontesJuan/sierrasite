import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { metadataFor, renderRoute, ROUTES, STATIC_SLUGS } from "../site";

export function generateStaticParams() { return STATIC_SLUGS; }

export function generateMetadata({ params }: { params: { slug: string[] } }): Metadata {
  const path = `/${params.slug.join("/")}`;
  return metadataFor(path);
}

export default function SitePage({ params }: { params: { slug: string[] } }) {
  const path = `/${params.slug.join("/")}`;
  if (!(ROUTES as readonly string[]).includes(path)) notFound();
  const page = renderRoute(path);
  if (!page) notFound();
  return page;
}
