/** @type {import('next').NextConfig} */

/** Content-Security-Policy, shipped in Report-Only first.
 *
 *  The public site loads Google Tag Manager, Google Fonts and YouTube embeds, and
 *  Next.js emits inline bootstrap scripts and styles. Enforcing a hand-written policy
 *  against that mix can silently break analytics or embeds in production, so this runs
 *  in Report-Only until real traffic shows no violations. Promote the header name to
 *  "Content-Security-Policy" only after the reports come back clean.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // 'unsafe-inline' is required by Next.js' inline bootstrap and by GTM's snippet.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://www.googletagmanager.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  outputFileTracingIncludes: { "/": ["./site/**/*"] },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      // Served over HTTPS on Vercel only. Deliberately WITHOUT includeSubDomains: webmail and
      // store subdomains were not verified as HTTPS-only, and HSTS is cached client-side for the
      // full max-age, so binding them is not quickly reversible. Add it only after checking each.
      { key: "Strict-Transport-Security", value: "max-age=63072000" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "Content-Security-Policy-Report-Only", value: csp },
    ] }];
  },
};
export default nextConfig;
