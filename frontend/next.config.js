/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  webpack: (config) => {
    // Stub out broken Coinbase SDK deep dependencies that are
    // pulled in transitively by @rainbow-me/rainbowkit -> wagmi -> @base-org/account
    // These x402 payment modules are not needed for wallet connection.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@x402/evm/upto/client': false,
      '@x402/evm/exact/client': false,
      '@x402/svm/exact/client': false,
      '@x402/svm/upto/client': false,
    };
    return config;
  },
};

module.exports = nextConfig;
