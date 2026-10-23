import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Not "standalone": the deploy runs `next start`. Standalone emits a server
  // that needs .next/static copied beside it by hand, which silently fails the
  // healthcheck if the start command is pointed at it.
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
