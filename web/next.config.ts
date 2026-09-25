import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La imatge de Docker només porta el paquet autònom (.next/standalone),
  // no node_modules sencer.
  output: "standalone",
};

export default nextConfig;
