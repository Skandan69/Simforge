import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@simforge/shared"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
