import type { NextConfig } from "next";

// Security headers sent with every response.
const securityHeaders = [
  // Other sites can't embed the app in a frame (clickjacking); only this site can.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Browsers must not guess content types (e.g. treat an upload as a script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone only for this site (voice answers); nothing else is needed.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" },
  // Browsers remember to use HTTPS for two years (ignored on http://localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Job-description files (up to 2 MB) are sent to a server action; the
    // default 1 MB request limit would reject them before our own check.
    serverActions: { bodySizeLimit: "3mb" },
    // Links and server actions wait and retry while offline instead of failing
    // (which made the browser show its own "no internet" page).
    useOffline: true,
    // Development only: run Next's render checks inside the dev server instead
    // of a separate worker process. On low-memory machines that worker kept
    // crashing ("Jest worker encountered 2 child process exceptions") and
    // took pages such as the resume step down with it. Builds are unaffected.
    devValidationWorker: false,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The offline service worker: always fetch the latest version.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
