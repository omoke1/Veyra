import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  output: "standalone", // Enable for Docker builds
};

export default nextConfig;
