/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour l'upload de fichiers
  experimental: {
    serverComponentsExternalPackages: ["xlsx"],
  },

  // Configuration pour la production
  // output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Optimisation des images
  images: {
    unoptimized: true,
  },

  // Webpack configuration to handle potential build issues
  webpack: (config, { isServer }) => {
    // Handle WebAssembly files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Optimize for build performance
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },

  // Headers pour CORS et sécurité
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
