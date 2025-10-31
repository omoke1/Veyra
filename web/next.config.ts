import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Ensure proper routing
  trailingSlash: false,
};

export default nextConfig;
