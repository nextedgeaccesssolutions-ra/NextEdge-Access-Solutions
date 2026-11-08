import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { rateLimit } from "express-rate-limit";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

async function startLimitedServer(limit: number) {
  const app = express();
  // Keep Express' default trust-proxy behavior: client identity comes from
  // the socket peer, not an arbitrary X-Forwarded-For request header.
  app.set("trust proxy", false);
  app.post(
    "/api/scheduled/publish-page",
    rateLimit({
      windowMs: 60_000,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    (_req, res) => res.status(204).end(),
  );

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${address.port}/api/scheduled/publish-page` };
}

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) =>
    new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  ));
});

describe("scheduled publish Express rate limiter", () => {
  it("allows requests up to the configured limit and then returns HTTP 429", async () => {
    const { server, url } = await startLimitedServer(2);
    servers.push(server);

    expect((await fetch(url, { method: "POST" })).status).toBe(204);
    expect((await fetch(url, { method: "POST" })).status).toBe(204);

    const blocked = await fetch(url, { method: "POST" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).not.toBeNull();
    expect(blocked.headers.get("ratelimit")).not.toBeNull();
  });

  it("does not let clients bypass the limit by spoofing X-Forwarded-For", async () => {
    const { server, url } = await startLimitedServer(1);
    servers.push(server);

    expect((await fetch(url, {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.10" },
    })).status).toBe(204);

    const blocked = await fetch(url, {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.11" },
    });
    expect(blocked.status).toBe(429);
  });

  it("limits only the scheduled publishing route in this test harness", async () => {
    const { server, url } = await startLimitedServer(1);
    servers.push(server);

    expect((await fetch(url, { method: "POST" })).status).toBe(204);
    expect((await fetch(url, { method: "POST" })).status).toBe(429);
  });
});
