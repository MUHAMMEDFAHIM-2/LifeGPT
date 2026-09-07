import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev server from other devices on the home network
  // (phone at http://192.168.1.199:3000). Without this, Next 16 blocks
  // dev-mode asset/RSC requests from non-localhost origins and the page
  // never hydrates.
  allowedDevOrigins: ["192.168.1.199"],
};

export default nextConfig;
