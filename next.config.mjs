import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const config = {
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  async rewrites() {
    return {
      beforeFiles: [{ source: "/jugar", destination: "/jugar/index.html" }],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
