import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Group tabs are dynamic (cookies + loading.tsx), so the client cache
    // defaults to 0s and every Termini ↔ Ljestvica switch hits the server.
    // 30s reuses the last RSC payload; server actions still bust via
    // revalidatePath / updateTag.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
