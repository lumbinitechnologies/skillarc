import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // TypeScript 5.9 exposes the compiler API; use it instead of Next's
    // CLI subprocess path, which returns empty --showConfig output in the
    // current Node 26 sandbox.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
