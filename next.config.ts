import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // generate-video route can run for up to 5 minutes (lipsync + Manim rendering)
  serverExternalPackages: [],
  // Exclude the React Native / Expo mobile app from the Next.js build
  transpilePackages: [],
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui.aceternity.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
