import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { publishScheduledPage } from "../scheduled";
import { allowStoreRequestPreflight, receiveStoreRequest } from "../storeRequests";
import { rateLimit } from "express-rate-limit";

// Standard Express middleware is recognized by static security analysis.
// Vercel's edge overwrites X-Forwarded-For; app trust is scoped to one hop.
// Apply a shared Vercel WAF quota as the distributed production control.
const scheduledPublishRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const publicContactRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const storeRequestRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

/**
 * Build the shared API application.
 * The same Express app is used by the local Node server and Vercel's
 * serverless function entrypoints so authentication, uploads, OAuth and
 * tRPC routes behave consistently in both environments.
 */
export function createApp() {
  const app = express();

  // Vercel overwrites X-Forwarded-For with the public client IP. Trust the
  // single Vercel proxy hop only in Vercel deployments; trust no proxy locally.
  app.set("trust proxy", process.env.VERCEL === "1" ? 1 : false);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.use("/api/trpc/publicSite.submitContact", publicContactRateLimit);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  app.post("/api/scheduled/publish-page", scheduledPublishRateLimit, publishScheduledPage);

  app.options("/api/public/store-request", allowStoreRequestPreflight);
  app.post("/api/public/store-request", storeRequestRateLimit, receiveStoreRequest);

  return app;
}
