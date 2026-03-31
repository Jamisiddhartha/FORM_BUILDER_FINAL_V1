
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['primereact'],
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },

  // We keep Apache as the reverse proxy for /api → Nest (no Next rewrites needed)
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
