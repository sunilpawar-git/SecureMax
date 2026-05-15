import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './src/config/security';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {},
  async headers() {
    // Re-evaluate SECURITY_HEADERS at request time to ensure NODE_ENV is correct
    // This ensures 'unsafe-eval' is included in dev mode for React debugging
    const isDev = process.env.NODE_ENV !== 'production';
    const cspValue = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.razorpay.com",
      'frame-src https://api.razorpay.com',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

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
