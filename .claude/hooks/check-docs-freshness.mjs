#!/usr/bin/env node
/**
 * Post-push doc freshness check for Drift.
 * Reads stdin (Claude Code hook JSON), checks if this was a git push,
 * then verifies CHANGELOG.md and CLAUDE.md are up to date.
 *
 * Returns JSON with systemMessage if docs are stale.
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// Read stdin
let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {}

let parsed;
try {
  parsed = JSON.parse(input);
} catch {
  process.exit(0);
}

// Only act on git push commands
const cmd = parsed?.tool_input?.command || "";
if (!cmd.match(/\bgit\s+push\b/)) {
  process.exit(0);
}

const warnings = [];

// Check 1: Test count in CLAUDE.md matches actual
try {
  const claudeMd = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8");
  const match = claudeMd.match(/(\d+)\s+test files?,\s*(\d+)\s+tests/);
  if (match) {
    const docFiles = parseInt(match[1]);
    const docTests = parseInt(match[2]);

    const vitestOutput = execSync("npx vitest run --reporter=json 2>/dev/null", {
      cwd: resolve(ROOT, "frontend"),
      encoding: "utf8",
      shell: true,
      timeout: 60000,
    });
    const result = JSON.parse(vitestOutput);
    const actualFiles = result.testResults?.length ?? result.numTotalTestSuites;
    const actualTests = result.numTotalTests;

    if (docFiles !== actualFiles || docTests !== actualTests) {
      warnings.push(
        `CLAUDE.md says "${docFiles} test files, ${docTests} tests" but actual is ${actualFiles} files, ${actualTests} tests`
      );
    }
  }
} catch (e) {
  // vitest failed or CLAUDE.md missing — skip this check
}

// Check 2: CHANGELOG.md has an entry with today's date or within last 7 days
try {
  const changelog = readFileSync(resolve(ROOT, "CHANGELOG.md"), "utf8");
  const datePattern = /## \[[\d.]+\] - (\d{4}-\d{2}-\d{2})/g;
  let latestDate = null;
  const m = datePattern.exec(changelog);
  if (m) {
    latestDate = m[1];
  }

  if (latestDate) {
    const latest = new Date(latestDate);
    const now = new Date();
    const daysDiff = Math.floor((now - latest) / (1000 * 60 * 60 * 24));

    // Check if there are commits since the last changelog entry
    try {
      const commitsSince = execSync(
        `git log --oneline --after="${latestDate}" --format="%s"`,
        { cwd: ROOT, encoding: "utf8", shell: true }
      ).trim();

      const featureCommits = commitsSince
        .split("\n")
        .filter((line) => line.match(/^(feat|fix|refactor)\(/));

      if (featureCommits.length > 0 && daysDiff > 0) {
        warnings.push(
          `CHANGELOG.md latest entry is ${latestDate} but there are ${featureCommits.length} feat/fix commits since then`
        );
      }
    } catch {}
  }
} catch {}

// Output result
if (warnings.length > 0) {
  const msg = `Doc freshness check:\n${warnings.map((w) => `  - ${w}`).join("\n")}\n\nConsider updating before pushing.`;
  console.log(JSON.stringify({ systemMessage: msg }));
} else {
  // Silent success
  process.exit(0);
}
