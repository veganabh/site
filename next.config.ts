import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pino o root do Turbopack no diretório do app. Sem isso, worktrees do Claude
// (.claude/worktrees/*) confundem a inferência de workspace root e o Turbopack
// para de resolver node_modules (ex: @hookform/resolvers) no dev.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
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
