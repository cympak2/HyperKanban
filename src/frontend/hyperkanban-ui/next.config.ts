import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.teams.microsoft.com https://*.teams.microsoft.us https://*.skype.com https://teams.microsoft.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
