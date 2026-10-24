import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is fully dynamic (auth + live order data), so we opt out of
  // Cache Components and use the classic dynamic rendering model.
  cacheComponents: false,
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
