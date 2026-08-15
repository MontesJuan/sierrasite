import { metadataFor, renderRoute } from "./site";

export const metadata = metadataFor("/");

export default function HomePage() {
  return renderRoute("/");
}
