import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ydiyyjktbscodiqilbat.supabase.co",
        pathname: "/storage/v1/object/public/product-photos/**",
      },
    ],
  },
};

export default nextConfig;
