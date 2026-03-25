
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['primereact'],
  devIndicators: false,

  // We keep Apache as the reverse proxy for /api → Nest (no Next rewrites needed)
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
