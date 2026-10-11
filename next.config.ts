import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the console's bottom-left corner.
  devIndicators: false,
  // Pin the workspace root so Turbopack ignores lockfiles further up the tree.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
