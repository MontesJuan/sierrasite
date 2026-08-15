import { metadataFor, renderRoute } from "../site";

export const metadata = metadataFor("/prensa");

export default function PressPage() {
  return renderRoute("/prensa");
}
