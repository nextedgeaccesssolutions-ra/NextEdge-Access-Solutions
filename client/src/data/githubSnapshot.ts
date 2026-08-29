export type GitHubRepositorySnapshot = {
  nameWithOwner: string;
  description: string;
  isPrivate: boolean;
  updatedAt: string;
  stargazerCount: number;
  isFork: boolean;
};

export const githubSnapshot = {
  source: "GitHub connector test via authenticated gh access",
  account: {
    login: "nextedgeaccesssolutions-ra",
    name: "NextEdge Access Solutions.",
    publicRepos: 1,
    followers: 0,
    following: 0,
  },
  repositories: [
    {
      nameWithOwner: "nextedgeaccesssolutions-ra/marketing-team-eve-template",
      description: "No description",
      isPrivate: true,
      updatedAt: "2026-08-29T16:50:20Z",
      stargazerCount: 0,
      isFork: false,
    },
    {
      nameWithOwner: "nextedgeaccesssolutions-ra/neas",
      description: "NEAS",
      isPrivate: false,
      updatedAt: "2026-08-29T13:49:29Z",
      stargazerCount: 0,
      isFork: false,
    },
  ] satisfies GitHubRepositorySnapshot[],
} as const;

export const githubCapabilities = [
  "Inspect authenticated account and organization context",
  "List repositories with visibility, descriptions, timestamps, forks, and stars",
  "Read issues, pull requests, branches, releases, and repository metadata",
  "Create and review code changes when explicitly authorized",
  "Support collaboration workflows through comments, labels, and project tracking",
] as const;

export function formatGitHubDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}
