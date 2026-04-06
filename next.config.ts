import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-leaflet"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "a0.muscache.com" },
      { protocol: "https", hostname: "**.hostaway.com" },
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
    ],
  },
};

export default nextConfig;
