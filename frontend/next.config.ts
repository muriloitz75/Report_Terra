import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Unified Deployment
  output: 'export',

  // Enable compression
  compress: true,

  // Production optimizations
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
