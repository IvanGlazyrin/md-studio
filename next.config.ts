import path from "node:path";
import type { NextConfig } from "next";

// Turbopack infers the workspace root from the nearest lockfile. Pinning it to
// this directory keeps the inference inside the repository, whatever sits next
// to it on the disk.
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
  // The desktop build runs this server as a child process, so it has to be a
  // self-contained bundle: `next build` writes it to `.next/standalone`.
  output: "standalone",
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  // The desktop build serves the app from 127.0.0.1 on a random port, and the
  // dev server blocks cross-origin requests to its own HMR resources.
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["lucide-react"],
  images: {
    // next/image may optimize vault images only; the route itself serves
    // nothing but images from the vault.
    localPatterns: [{ pathname: "/api/vault/image" }],
  },
};

export default nextConfig;
