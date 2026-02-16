import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment with NextAuth support
  output: 'standalone',

  // Enable compression
  compress: true,

  // Production optimizations
  poweredByHeader: false,

  // Image optimization
  images: {
    unoptimized: true, // Required for standalone deployment
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Proxy para a API do backend
  async rewrites() {
    const apiUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/generate-report',
        destination: `${apiUrl}/api/generate-report`,
      },
      {
        source: '/api/feedback',
        destination: `${apiUrl}/api/feedback`,
      },
      {
        source: '/api/shutdown',
        destination: `${apiUrl}/api/shutdown`,
      },
      {
        source: '/token',
        destination: `${apiUrl}/token`,
      },
      {
        source: '/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
      {
        source: '/admin/:path*',
        destination: `${apiUrl}/admin/:path*`,
      },
      {
        source: '/stats',
        destination: `${apiUrl}/stats`,
      },
      {
        source: '/processes',
        destination: `${apiUrl}/processes`,
      },
      {
        source: '/upload/:path*',
        destination: `${apiUrl}/upload/:path*`,
      },
      {
        source: '/clear',
        destination: `${apiUrl}/clear`,
      },
      {
        source: '/export-excel',
        destination: `${apiUrl}/export-excel`,
      },
      {
        source: '/health',
        destination: `${apiUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
