import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

// Get git hash - priority: 1) env var, 2) git command, 3) .git-hash file
let gitHash = process.env.GIT_HASH || 'unknown';
if (gitHash === 'unknown') {
  try {
    // Try git command first (local dev)
    gitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    // Try reading from file (Docker build where .git-hash was created before submit)
    try {
      if (existsSync('.git-hash')) {
        gitHash = readFileSync('.git-hash', 'utf8').trim();
      }
    } catch (e2) {
      console.warn('Could not get git hash from git or .git-hash file');
    }
  }
}

// Build timestamp in CST (America/Chicago = UTC-6)
const now = new Date();
const cstOffset = -6 * 60; // minutes
const cstTime = new Date(now.getTime() + (cstOffset - now.getTimezoneOffset()) * 60000);
const pad = (n) => String(n).padStart(2, '0');

// Format: <hash>-E-YYYY.MM.DD.HHMM (CST)
// BUILD_ENV: 'S' for staging, 'P' for production
const envValue = process.env.BUILD_ENV || 'staging';
const buildEnv = envValue === 'production' || envValue === 'P' ? 'P' : 'S';
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
