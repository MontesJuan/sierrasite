import { NextResponse, type NextRequest } from "next/server";
// Retired uncurated exports must not bypass the curated press room.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/press-zip")
    return NextResponse.redirect(new URL("/prensa", req.url));
  return new NextResponse("Not found", { status: 404 });
}
export const config = {
  matcher: [
    "/kb/:path*",
    "/sierra_prensa.zip",
    "/assets/:path*",
    "/api/press-zip",
  ],
};
