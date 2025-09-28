import type { NextConfig } from "next";

// Derive basePath from environment for GitHub Pages deployments.
// When BASE_PATH is empty (account pages), keep it undefined for local/dev.
const rawBasePath = process.env.BASE_PATH || "";
const normalizedBasePath = rawBasePath === "" ? undefined : rawBasePath;
const assetPrefix = normalizedBasePath ? `${normalizedBasePath}/` : undefined;

const nextConfig: NextConfig = {
  // Enable static export for GitHub Pages
  output: 'export',
  // Dynamic basePath and assetPrefix; empty for username.github.io, "/<repo>" for project pages
  basePath: normalizedBasePath,
  assetPrefix,
  // Next/Image not supported in export mode
  images: { unoptimized: true },
  // Improve compatibility with GitHub Pages directory-style routing
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack configuration if needed
    return config;
  },
};

export default nextConfig;
