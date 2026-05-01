import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Produce a self-contained server bundle (.next/standalone) that ships
  // only the runtime files needed for `node server.js`. Required for the
  // small container image used by the Dockerfile + ECR deploy.
  output: "standalone",
};

export default nextConfig;
