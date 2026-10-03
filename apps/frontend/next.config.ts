import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  experimental: {
    // Rewrites to the backend time out after 30 s by default, which would cut
    // off a slow upload of a recording (up to 100 MB).
    proxyTimeout: 10 * 60 * 1000,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
