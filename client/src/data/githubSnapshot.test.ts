import { describe, expect, it } from "vitest";
import { formatGitHubDate, githubCapabilities, githubSnapshot } from "./githubSnapshot";

describe("github connector snapshot", () => {
  it("contains the authenticated account and fetched repositories", () => {
    expect(githubSnapshot.account.login).toBe("nextedgeaccesssolutions-ra");
    expect(githubSnapshot.repositories).toHaveLength(2);
    expect(githubSnapshot.repositories.map((repository) => repository.nameWithOwner)).toContain(
      "nextedgeaccesssolutions-ra/neas",
    );
  });

  it("exposes connector capabilities and formats UTC timestamps", () => {
    expect(githubCapabilities.length).toBeGreaterThanOrEqual(5);
    expect(formatGitHubDate("2026-08-29T16:50:20Z")).toBe("Aug 29, 2026");
  });
});
