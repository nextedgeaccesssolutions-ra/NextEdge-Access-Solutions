import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function editorContext(): TrpcContext {
  return {
    user: {
      id: 11,
      openId: "editor-user",
      name: "NEAS Editor",
      email: "editor@example.com",
      loginMethod: "manus",
      role: "editor",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("cms input validation", () => {
  it("rejects unsafe page slugs before reaching persistence", async () => {
    const caller = appRouter.createCaller(editorContext());
    await expect(caller.cms.saveDraft({
      title: "Unsafe page",
      slug: "Unsafe Page!",
      layout: [],
      seo: { title: "Unsafe page", description: "Description", slug: "unsafe-page", noIndex: false },
      summary: "Validation test",
    })).rejects.toThrow();
  });

  it("rejects project records without a title", async () => {
    const caller = appRouter.createCaller(editorContext());
    await expect(caller.cms.saveProject({
      title: "",
      location: "Philippines",
      service: "Rope Access",
      summary: "Verified project summary",
      displayOrder: 0,
    })).rejects.toThrow();
  });

  it("rejects unsupported media types", async () => {
    const caller = appRouter.createCaller(editorContext());
    await expect(caller.cms.uploadMedia({
      filename: "unsafe.exe",
      mimeType: "application/x-msdownload" as "application/pdf",
      base64: "ZmFrZQ==",
    })).rejects.toThrow();
  });
});
