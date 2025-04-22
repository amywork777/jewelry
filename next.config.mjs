/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@magicai": "./temp-magicai",
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' blob: data: https://*;
              media-src 'self' blob:;
              connect-src 'self' blob: https://* wss://*;
              font-src 'self';
              object-src 'none';
              frame-src 'self';
              worker-src 'self' blob:;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
}

export default nextConfig
