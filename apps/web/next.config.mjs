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
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/wallet', destination: '/cashier', permanent: false },
      { source: '/arena', destination: '/matches/new', permanent: false },
    ];
  },
  async rewrites() {
    const v2Routes = [
      '/',
      '/login',
      '/signup',
      '/dashboard',
      '/challenges',
      '/games',
      '/games/:path*',
      '/tournaments',
      '/tournaments/:path*',
      '/matches/:path*',
      '/cashier',
      '/leaderboards',
      '/leaderboards/:path*',
      '/ratings',
      '/settlement-preview',
      '/profile',
      '/profile/:path*',
      '/friends',
      '/settings',
      '/support',
      '/community/polls',
      '/download',
      '/privacy',
      '/terms',
      '/responsible-gaming',
      '/developer',
      '/developer/:path*',
      '/admin',
      '/admin/:path*',
    ];
    return {
      beforeFiles: v2Routes.map((source) => ({
        source,
        destination: '/v2_index.html',
      })),
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: 'https://playverzus-api.onrender.com/api/:path*',
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
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
