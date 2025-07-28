
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // See https://webpack.js.org/configuration/resolve/#resolveextensions
    config.resolve.extensions.push(".ts", ".tsx");
    // See https://webpack.js.org/configuration/module/#modulerules
    config.module.rules.push({
      test: /\.proto$/,
      use: "raw-loader",
    });
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
