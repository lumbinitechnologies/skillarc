import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  env: {
    SKILLARC_BUILD_PRELAUNCH: process.env.SKILLARC_PRELAUNCH === "true" ? "true" : "false",
  },
  experimental: {
    // Optimise imports — ensures only the icons/exports actually used get bundled
    // instead of entire barrel files (lucide-react has 700+ icons).
    // Works with both Turbopack and webpack.
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
  },

  // Strip console.* calls in production (errors preserved).
  compiler: {
    ...(process.env.NODE_ENV === "production" && {
      removeConsole: { exclude: ["error"] },
    }),
  },

  // Image optimisation
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
}

export default nextConfig

