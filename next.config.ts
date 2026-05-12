import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './src/config/security';

const headersArray = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
  key,
  value,
}));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: headersArray,
      },
    ];
  },
};

export default nextConfig;
