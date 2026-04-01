import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Playwright / dev tools hitting the app via 127.0.0.1 */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
