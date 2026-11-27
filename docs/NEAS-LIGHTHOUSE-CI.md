# NEAS Website Lighthouse CI

The `NEAS Lighthouse Audit` workflow builds the Next.js website in CI without running database migrations, starts a local production server, and audits the homepage with Lighthouse.

Audited categories:
- Performance
- Accessibility
- Best Practices
- SEO

The first rollout records a baseline and uploads the JSON report as a 14-day GitHub Actions artifact. It intentionally does not fail a pull request based on arbitrary score thresholds. NEAS should review several reports and approve realistic thresholds before making scores blocking.

The workflow runs for pull requests that change `web/**` or its own workflow file, and can be started manually. It uses Lighthouse CLI 12.8.2 (Apache-2.0) and Chrome installed on the GitHub-hosted runner. It does not crawl or mutate the live production website, publish pages, or require a PageSpeed Insights API key.
