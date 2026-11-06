import type { NextConfig } from "next";

/**
 * Content-Security-Policy
 *
 * - 'unsafe-inline' styles: Tailwind injects <style> tags; React inline styles
 *   (the voice widget uses them heavily) — required.
 * - Fonts must be served same-origin (self) to keep the CSP tight. If a
 *   hosted font CDN is ever introduced, add its origin to style-src/font-src.
 * - frame-ancestors 'none' = X-Frame-Options: DENY equivalent.
 * - Third-party origins currently used by client code:
 *   api-m.paypal.com (checkout), api.hostaway.com (server proxy),
 *   images.unsplash.com + cloudfront (imagery), api.deepgram.com (voice,
 *   wss). Adjust before launch if any are removed.
 */
const isDev = process.env.NODE_ENV === "development";

const siteConfigUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://lamaisonhomes.com.au";
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.hostaway.com https://api-m.paypal.com https://api-m.sandbox.paypal.com wss://api.deepgram.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.paypal.com https://www.sandbox.paypal.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // X-Frame-Options kept as belt-and-braces for older browsers (CSP
  // frame-ancestors 'none' is the modern equivalent).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), geolocation=(), payment=(self), usb=(), accelerometer=(), gyroscope=()",
  },
  // HSTS — preload-ready (max-age ≥ 1 year, includeSubDomains, no warn).
  // Submit to hstspreload.org after relaunch once stable in production.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Overrides Vercel's domain-level `Access-Control-Allow-Origin: *` `Access-Control-Allow-Origin: *` on
  // HTML responses (LMH-008). Same-origin web pages ignore ACAO, so this is
  // inert for normal browsing but stops cross-site HTML reads. API routes
  // set their own CORS headers where needed, which take precedence.
  { key: "Access-Control-Allow-Origin", value: siteConfigUrl },
];

const nextConfig: NextConfig = {
  // 301s for old WordPress category slugs (pre-rebuild). Google still has
  // them indexed with lorem-ipsum snippets; redirecting passes ranking
  // signals to the closest new journal taxonomy pages and speeds up
  // de-indexing of the stale URLs.
  async redirects() {
    return [
      {
        source: "/category/life-style",
        destination: "/category/stay-inspiration",
        permanent: true,
      },
      {
        source: "/category/around-us",
        destination: "/category/melbourne-guides",
        permanent: true,
      },
      {
        source: "/category/uncategorized",
        destination: "/journal",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  transpilePackages: ["react-leaflet"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "a0.muscache.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.hostaway.com" },
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
    ],
  },
};

export default nextConfig;
