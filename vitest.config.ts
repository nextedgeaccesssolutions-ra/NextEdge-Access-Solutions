import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);
const webRoot = path.resolve(templateRoot, "web");
const clientRoot = path.resolve(templateRoot, "client", "src");

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: [
      { find: "@shared", replacement: path.resolve(templateRoot, "shared") },
      { find: "@assets", replacement: path.resolve(templateRoot, "attached_assets") },
      // "@/..." means web/ for the Next.js app and client/src for the legacy client: pick by importer.
      {
        find: /^@\/(.*)$/,
        replacement: "$1",
        async customResolver(this: { resolve: (s: string, i?: string, o?: object) => Promise<unknown> }, id: string, importer?: string) {
          const fromWeb = !!importer && path.resolve(importer).startsWith(webRoot + path.sep);
          return this.resolve(path.join(fromWeb ? webRoot : clientRoot, id), importer, { skipSelf: true });
        },
      },
    ],
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "web/**/*.test.ts", "web/**/*.spec.ts"],
  },
});
