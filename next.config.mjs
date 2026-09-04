/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep Prisma's query engine out of the bundle so it is loaded from
  // node_modules at runtime (required for the Vercel serverless target).
  serverExternalPackages: ["@prisma/client", ".prisma/client", "bcryptjs"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // The local dev MongoDB writes to disk constantly; make sure its data dir can
  // never trigger a dev recompile loop.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.mongo-data/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
