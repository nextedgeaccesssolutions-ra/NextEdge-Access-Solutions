// "@/x" mirrors tsconfig's paths so route tests can import real lib modules.
// Plain object: vitest is provided by the root workspace, so import nothing here.
export default {
  resolve: { alias: { "@": new URL(".", import.meta.url).pathname } },
};
