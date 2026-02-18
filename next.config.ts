import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler отключён - вызывает конфликты с HMR/Fast Refresh
  // reactCompiler: true,
};

export default nextConfig;
