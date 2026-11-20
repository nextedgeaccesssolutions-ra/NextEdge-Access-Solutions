# NEAS dependency security remediation

## Policy

- pnpm is the package manager of record. Use package.json's packageManager field and pnpm-lock.yaml.
- Keep Dependabot security alerts enabled. Do not suppress alerts to make CI green.
- Do not use an automated `pnpm update --latest` operation against the whole dependency tree.
- Do not merge routine dependency updates without frozen-lockfile installation, audit, type checks, tests, and build.
- Preserve existing dependency PRs and review them before opening overlapping changes.

## Remediation procedure

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm audit --prod` and save the complete advisory output.
3. For each advisory, identify the direct parent package and affected transitive path using `pnpm why <package>`.
4. Prefer updating the direct parent within its currently declared semver range.
5. If an affected transitive package can be safely patched without a major API break, use a narrowly scoped pnpm override and regenerate the lockfile with the repository's pinned pnpm version.
6. If the secure release requires a major upgrade, handle it in a separate PR with targeted compatibility tests. Do not force a major override across all consumers.
7. Re-run audit, type check, unit tests and build. Review the diff and lockfile before merge.

## Notes

The security updater's historical resolver output is not sufficient evidence to choose all replacement versions. Verify current advisories and compatibility at the time of each change. A successful workflow does not mean all vulnerabilities are resolved unless the audit output is clean.
