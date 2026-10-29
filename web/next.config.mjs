/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/home.html" }] };
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ] }];
  },
};
export default nextConfig;
