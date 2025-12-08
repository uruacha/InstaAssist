import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/InstaAssist",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
