import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@matemagico/ui', '@matemagico/validation'],
};

export default nextConfig;
