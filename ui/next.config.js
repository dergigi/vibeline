/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  // Allow importing TypeScript files from outside the src directory
  experimental: {
    externalDir: true,
  },
}

module.exports = nextConfig; 
