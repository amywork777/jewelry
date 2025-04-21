/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.tripo3d.ai'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.tripo3d.ai',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.tripo3d.ai',
        pathname: '**',
      },
      {
        protocol: 'https', 
        hostname: 'dl.polyhaven.org',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig; 