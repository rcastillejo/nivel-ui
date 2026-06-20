import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  // Security headers are enforced via public/_headers (Cloudflare Pages)
  // since the headers() function is not supported with output: 'export'.
};

export default nextConfig;
