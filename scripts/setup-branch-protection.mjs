#!/usr/bin/env node
/**
 * Require green CI before anything lands on `main`.
 *
 * Branch protection is a repository setting, not a file, so it cannot be
 * applied by a commit. Run this once (and again whenever the CI job names
 * change) with a token that can administer the repo:
 *
 *   GITHUB_TOKEN=ghp_... node scripts/setup-branch-protection.mjs
 *
 * Flags:
 *   --dry-run      print the payload and current state, change nothing
 *   --require-pr   also require a pull request before merging (default: off,
 *                  so a solo owner can still push directly)
 *   --branch=NAME  branch to protect (default: main)
 *   --repo=OWNER/NAME  override the repo detected from `git remote`
 *
 * Token scopes: classic PAT with `repo`, or fine-grained PAT with
 * "Administration: read and write" + "Contents: read" on this repository.
 */

import { execFileSync } from "node:child_process";

const STATUS_CHECKS = [
  "Typecheck, lint, unit tests",
  "Production build",
  "E2E (demo mode)",
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const requirePr = args.includes("--require-pr");
const branch = args.find((arg) => arg.startsWith("--branch="))?.split("=")[1] ?? "main";
const repoArg = args.find((arg) => arg.startsWith("--repo="))?.split("=")[1];

function detectRepo() {
  if (repoArg) return repoArg;
  const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const match =
    remote.match(/^git@github\.com:(.+?)(?:\.git)?$/) ??
    remote.match(/^https:\/\/github\.com\/(.+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot parse GitHub repo from origin: ${remote}`);
  return match[1];
}

const repo = detectRepo();
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const api = `https://api.github.com/repos/${repo}`;

const payload = {
  required_status_checks: {
    strict: true,
    contexts: STATUS_CHECKS,
  },
  enforce_admins: true,
  // A PR is mandatory but 0 approvals are required, so a solo owner can merge.
  required_pull_request_reviews: requirePr
    ? { required_approving_review_count: 0, dismiss_stale_reviews: true }
    : null,
  restrictions: null,
  required_conversation_resolution: true,
  allow_force_pushes: false,
  allow_deletions: false,
};

async function request(path, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "nyamnyambox-pos-setup",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

async function main() {
  console.log(`Repo   : ${repo}`);
  console.log(`Branch : ${branch}`);
  console.log(`Checks : ${STATUS_CHECKS.join(" | ")}`);
  console.log(`PR     : ${requirePr ? "required" : "not required"}`);
  console.log(`Mode   : ${dryRun ? "dry run (no changes)" : "apply"}\n`);

  if (!token && !dryRun) {
    console.error(
      "Missing GITHUB_TOKEN (or GH_TOKEN). Create a token with admin rights on this repo,\n" +
        "then re-run:  GITHUB_TOKEN=... node scripts/setup-branch-protection.mjs",
    );
    process.exitCode = 1;
    return;
  }

  const current = await request(`/branches/${branch}/protection`);
  if (current.status === 200) {
    console.log("Current protection:");
    console.log(JSON.stringify(current.body, null, 2), "\n");
  } else if (current.status === 404) {
    console.log("Current protection: none\n");
  } else {
    console.log(`Current protection: cannot read (HTTP ${current.status})\n`);
  }

  if (dryRun) {
    console.log(`Payload that would be sent (PUT /branches/${branch}/protection):`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const result = await request(`/branches/${branch}/protection`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (result.status === 200) {
    console.log("✅ Branch protection enabled.");
    console.log(`   Pull requests into ${branch} now require: ${STATUS_CHECKS.join(", ")}.`);
    return;
  }

  console.error(`❌ GitHub responded with HTTP ${result.status}.`);
  console.error(JSON.stringify(result.body, null, 2));
  if (result.status === 403 || result.status === 404) {
    console.error(
      "\nThe token needs admin access to this repository. For a fine-grained PAT:\n" +
        '  Repository permissions → Administration: Read and write, Contents: Read.\n' +
        "Or configure it manually: Settings → Branches → Add branch protection rule.",
    );
  }
  process.exitCode = 1;
}

await main();
