/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  compress: true,
  transpilePackages: ['@playverzus/core', '@playverzus/db', '@playverzus/ui'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.r2.dev' },
    ],
  },
  async redirects() {
    return [
      { source: '/wallet', destination: '/cashier', permanent: false },
      { source: '/arena', destination: '/matches/new', permanent: false },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        crypto: false,
        events: false,
        stream: false,
        path: false,
        os: false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp: false,
      };
    }
    return config;
  },
};

export default nextConfig;
