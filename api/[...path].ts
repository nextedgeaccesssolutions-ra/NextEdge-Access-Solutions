import { createApp } from "../server/_core/app";

// Vercel routes /api/* through this function. Keep the original request URL
// so Express receives /api/trpc, /api/oauth/callback, and other API paths.
const app = createApp();

export default function handler(req: Parameters<typeof app>[0], res: Parameters<typeof app>[1]) {
  return app(req, res);
}
