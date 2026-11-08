import { createApp } from "../../server/_core/app";

const app = createApp();

export default function handler(req: Parameters<typeof app>[0], res: Parameters<typeof app>[1]) {
  // The public storage URL is /manus-storage/*, while Vercel function files
  // must live under /api. Restore the Express route before dispatch.
  if (req.url) {
    req.url = req.url.replace(/^\/api\/manus-storage(?=\/|\?|$)/, "/manus-storage");
  }
  return app(req, res);
}
