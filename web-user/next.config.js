/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname:  'localhost',
        port:      '4000',
        pathname:  '/uploads/**',
          typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },
      },
    ],
  },
};

module.exports = nextConfig;