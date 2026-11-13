import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { metadataFor, renderRoute, ROUTES, STATIC_SLUGS } from "../site";

export function generateStaticParams() { return STATIC_SLUGS; }

type PageProps = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  return metadataFor(path);
}

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  if (!(ROUTES as readonly string[]).includes(path)) notFound();
  const page = renderRoute(path);
  if (!page) notFound();
  return page;
}
