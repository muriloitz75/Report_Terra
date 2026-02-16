import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Docker/Railway (Python backend serves files)
  // Static export removed for NextAuth support
  // output: 'export',

  // Enable compression
  compress: true,

  // Production optimizations
  poweredByHeader: false,

  // Image optimization
  images: {
    unoptimized: true, // Required for static export
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
