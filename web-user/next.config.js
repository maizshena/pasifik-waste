/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '*.railway.app',           pathname: '/uploads/**' },
    ],
  },
};

module.exports = nextConfig;