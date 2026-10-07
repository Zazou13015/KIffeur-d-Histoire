import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/pedagogie/illustration/*": ["content/pedagogie/cartes-v1.csv", "content/illustrations/*.svg", "public/motifs.svg"],
  },
};

export default nextConfig;
