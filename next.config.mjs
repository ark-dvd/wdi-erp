import { execSync } from 'child_process';

// Get git commit hash
let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('Could not get git hash');
}

// Build timestamp
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');

const buildVersion = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
  pad(now.getHours()) + pad(now.getMinutes())
].join('.') + '-' + gitHash + '-' + (process.env.BUILD_ENV || 'S');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: buildVersion,
  },
}

export default nextConfig
