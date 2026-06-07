import type { NextConfig } from 'next';
import { SECURITY_HEADERS, buildContentSecurityPolicy } from './src/config/security';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    // Re-evaluate the CSP at request time so NODE_ENV is correct
    // (this keeps 'unsafe-eval' out of production while allowing it in dev).
    const cspValue = buildContentSecurityPolicy(process.env.NODE_ENV === 'production');

    const headersArray = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
      key,
      value: key === 'Content-Security-Policy' ? cspValue : value,
    }));

    return [
      {
        source: '/(.*)',
        headers: headersArray,
      },
    ];
  },
};

export default nextConfig;
