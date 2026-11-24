import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Hide the Next.js dev-tools "N" badge during `npm run dev` (it never ships to production).
  devIndicators: false,
  images: { formats: ["image/avif", "image/webp"] },
  // Pin the project root so a stray package-lock.json in a parent folder
  // doesn't confuse Turbopack ("multiple lockfiles" warning).
  turbopack: { root: process.cwd() },
};

export default nextConfig;
