import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { publishScheduledPage } from "../scheduled";
import { allowStoreRequestPreflight, receiveStoreRequest } from "../storeRequests";

/**
 * Build the shared API application.
 *
 * The same Express app is used by the local Node server and Vercel's
 * serverless function entrypoints so authentication, uploads, OAuth and
 * tRPC routes behave consistently in both environments.
 */
export function createApp() {
  const app = express();

  // Configure body parser with larger size limit for file uploads.
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  app.post("/api/scheduled/publish-page", publishScheduledPage);
  app.options("/api/public/store-request", allowStoreRequestPreflight);
  app.post("/api/public/store-request", receiveStoreRequest);

  return app;
}
