import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Stop `next dev` from appending its own block to AGENTS.md (that file is hand-maintained).
  agentRules: false,
};

export default nextConfig;
