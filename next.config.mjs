import { execSync } from 'child_process';

// Get git hash - prefer env var (for Docker builds), fallback to git command
let gitHash = process.env.GIT_HASH || 'unknown';
if (gitHash === 'unknown') {
  try {
    gitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    console.warn('Could not get git hash');
  }
}

// Build timestamp in CST (America/Chicago = UTC-6)
const now = new Date();
const cstOffset = -6 * 60; // minutes
const cstTime = new Date(now.getTime() + (cstOffset - now.getTimezoneOffset()) * 60000);
const pad = (n) => String(n).padStart(2, '0');

// Format: <hash>-E-YYYY.MM.DD.HHMM (CST)
const buildEnv = process.env.BUILD_ENV || 'S';
const buildVersion = gitHash + '-' + buildEnv + '-' + [
  cstTime.getFullYear(),
  pad(cstTime.getMonth() + 1),
  pad(cstTime.getDate()),
  pad(cstTime.getHours()) + pad(cstTime.getMinutes())
].join('.');

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
