import { NextRequest, NextResponse } from "next/server";

/**
 * Under-construction gate.
 *
 * Controlled by the MAINTENANCE_MODE environment variable ("1" = on).
 * While on, every visitor is shown the /coming-soon page except:
 *  - /api/*           (integration + smoke testing stays possible)
 *  - /portal/*        (payment links already emailed to guests keep working)
 *  - /_next/* static assets, favicon, robots.txt, sitemap
 *  - visitors with the preview cookie (set via ?preview=1, 7 days)
 *
 * Remove MAINTENANCE_MODE (or set to "0") to return to normal operation.
 */
const PREVIEW_COOKIE = "lm_preview";

export function middleware(req: NextRequest) {
  const maintenance = process.env.MAINTENANCE_MODE === "1";
  if (!maintenance) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Paths that stay open during maintenance
  const openPrefixes = ["/api", "/portal", "/_next", "/favicon", "/coming-soon"];
  const openExact = ["/robots.txt", "/sitemap.xml"];
  if (
    openPrefixes.some((p) => pathname.startsWith(p)) ||
    openExact.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Internal preview bypass: /?preview=1 sets a 7-day cookie
  if (req.nextUrl.searchParams.get("preview") === "1") {
    const res = NextResponse.next();
    res.cookies.set(PREVIEW_COOKIE, "1", {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });
    return res;
  }
  if (req.cookies.get(PREVIEW_COOKIE)?.value === "1") {
    return NextResponse.next();
  }

  // Everyone else → coming-soon (rewrite keeps the URL they typed)
  const url = req.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.search = "";
  const res = NextResponse.rewrite(url);
  res.headers.set("X-Robots-Tag", "noindex");
  res.headers.set("Retry-After", "86400");
  return res;
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals and common static files
    "/((?!_next/static|_next/image|favicon.ico|images|placeholders|logo.png|logo-transparent.png).*)",
  ],
};
