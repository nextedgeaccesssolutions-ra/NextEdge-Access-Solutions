import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import https from "node:https";
import ipaddr from "ipaddr.js";

export const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".test", ".invalid", ".example", ".home.arpa", ".onion", ".arpa"];

type PublicTarget = { url: URL; address: string; family: number };

export async function validatePublicFeedUrl(raw: string): Promise<PublicTarget> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid feed URL.");
  }

  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Feeds must use a public HTTPS URL on the standard port.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host || isIP(host) || host === "localhost" || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new Error("Private, local and IP-literal feed addresses are not allowed.");
  }

  const records = await dnsLookup(host, { all: true, verbatim: true });
  if (!records.length) throw new Error("The feed hostname has no public DNS address.");

  for (const record of records) {
    try {
      if (ipaddr.process(record.address).range() !== "unicast") {
        throw new Error("The feed hostname resolves to a private or reserved address.");
      }
    } catch {
      throw new Error("The feed hostname resolves to a private or reserved address.");
    }
  }

  return { url, address: records[0].address, family: records[0].family };
}

async function requestFeed(target: PublicTarget): Promise<{ status: number; location?: string; body: string }> {
  return new Promise((resolve, reject) => {
    const pinnedLookup = ((_hostname: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
      callback(null, target.address, target.family);
    }) as never;

    const request = https.request(target.url, {
      method: "GET",
      lookup: pinnedLookup,
      headers: {
        "user-agent": "NEAS-FeedReader/1.0",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain",
        "accept-encoding": "identity",
      },
    }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if (status >= 300 && status < 400 && location) {
        response.resume();
        resolve({ status, location, body: "" });
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error("The feed server returned an unsuccessful response."));
        return;
      }

      const contentLength = Number(response.headers["content-length"] ?? 0);
      if (Number.isFinite(contentLength) && contentLength > MAX_FEED_BYTES) {
        response.destroy(new Error("Feed is larger than 2 MB."));
        reject(new Error("Feed is larger than 2 MB."));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      response.on("data", (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += bytes.length;
        if (total > MAX_FEED_BYTES) {
          response.destroy(new Error("Feed is larger than 2 MB."));
          return;
        }
        chunks.push(bytes);
      });
      response.on("end", () => resolve({ status, body: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", reject);
    });

    request.setTimeout(8_000, () => request.destroy(new Error("Feed request timed out.")));
    request.on("error", reject);
    request.end();
  });
}

export async function fetchPublicFeed(raw: string): Promise<string> {
  let target = await validatePublicFeedUrl(raw);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const result = await requestFeed(target);
    if (result.location) {
      if (redirect === MAX_REDIRECTS) throw new Error("The feed redirected too many times.");
      target = await validatePublicFeedUrl(new URL(result.location, target.url).toString());
      continue;
    }
    return result.body;
  }
  throw new Error("The feed could not be fetched.");
}
