import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repoName = "HyperKanban";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : "",
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
