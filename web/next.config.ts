import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The repo root has its own package-lock.json from the Phase 1 scraper;
  // pin Turbopack's root to this app so it doesn't get confused by that.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
