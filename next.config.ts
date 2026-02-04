import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  output: isVercel ? undefined : "export",
  basePath: isVercel ? "" : "/InstaAssist",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
