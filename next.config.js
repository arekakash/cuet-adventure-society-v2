/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Static Export (Cloudflare Pages-এর জন্য) ───
  output: "export",

  // ─── Cloudflare Pages-এর সাথে compatible routing ───
  // প্রতিটা route-এ trailing slash যোগ করে (folder/index.html আকারে serve হয়)
  trailingSlash: true,

  // ─── Images ───
  images: {
    // Static export-এ Next.js-এর image optimizer চলে না
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" }, // imgbb uploads
      { protocol: "https", hostname: "*.supabase.co" }, // Supabase storage
      { protocol: "https", hostname: "ui-avatars.com" }, // avatar fallback
    ],
  },

  // ─── React ───
  reactStrictMode: true,

  // ─── Production Optimizations ───
  compiler: {
    // Production build-এ console.log মুছে দেয় (error/warn থাকবে)
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // ─── Lint ───
  eslint: {
    // Build-এর সময় lint error হলেও build fail করবে না
    // (আলাদা `npm run lint` দিয়ে চেক করবেন)
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
