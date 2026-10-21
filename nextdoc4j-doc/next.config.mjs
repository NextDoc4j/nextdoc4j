import { createMDX } from 'fumadocs-mdx/next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';
import { syncChangelog, watchChangelog } from './scripts/changelog/sync-changelog.mjs';

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default function nextConfig(phase) {
  // Generate the page before Fumadocs discovers and compiles the MDX collection.
  syncChangelog();
  if (phase === PHASE_DEVELOPMENT_SERVER) watchChangelog();
  return createMDX()(config);
}
