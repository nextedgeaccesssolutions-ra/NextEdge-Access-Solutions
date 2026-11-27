import fs from "node:fs";

const reportPath = process.argv[2] ?? "lighthouse-report.json";
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const categories = report.categories ?? {};
const required = ["performance", "accessibility", "best-practices", "seo"];
const missing = required.filter((name) => typeof categories[name]?.score !== "number");

if (missing.length) {
  throw new Error(`Lighthouse report is missing category scores: ${missing.join(", ")}`);
}

console.log("NEAS Lighthouse baseline:");
for (const name of required) {
  const score = Math.round(categories[name].score * 100);
  console.log(`- ${name}: ${score}/100`);
}
console.log("Baseline report validated. Scores are informational until NEAS approves release thresholds.");
