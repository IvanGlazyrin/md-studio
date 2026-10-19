import path from "node:path";
import type { NextConfig } from "next";

// Turbopack infers the workspace root from the nearest lockfile. `C:\projects`
// holds an unrelated package-lock.json one level above this git repository, so
// the inference lands outside the repo and Next warns about it. Pin the root to
// this directory instead.
//
// `import.meta.dirname` (not `__dirname`) is correct here: Next 16 loads
// next.config.ts through Node's native TypeScript loader, so the config runs as
// a real ES module.
const nextConfig: NextConfig = {
  // Next 16.3's compression middleware redirects res 'drain' listeners onto
  // its internal Gzip stream, where Next's own piping exceeds Node's default
  // max of 10 and logs MaxListenersExceededWarning. Cosmetic upstream bug
  // (vercel/next.js#97757); disable compression only in dev to silence it.
  compress: process.env.NODE_ENV !== "development",
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  transpilePackages: ["lucide-react"],
  images: {
    // next/image may optimize GDD images only; the route itself serves nothing
    // but images from the vault.
    localPatterns: [{ pathname: "/api/vault/image" }],
  },
};

export default nextConfig;
