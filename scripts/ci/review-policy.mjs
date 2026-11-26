import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function evaluate({
  author,
  issue,
  files,
  reviews,
  headSha,
  baseRef,
  headRef,
}) {
  const errors = [];
  const latest = new Map();
  for (const review of [...reviews].sort(
    (a, b) => Date.parse(a.submitted_at || 0) - Date.parse(b.submitted_at || 0),
  )) {
    if (["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state))
      latest.set(review.user?.login, review);
  }
  const approved = (login) =>
    latest.get(login)?.state === "APPROVED" &&
    (!headSha || latest.get(login)?.commit_id === headSha);
  if (baseRef && !["main", "staging"].includes(baseRef))
    errors.push("Unsupported target branch");
  if (
    baseRef === "main" &&
    headRef !== "staging" &&
    !headRef?.startsWith("keane-hotfix-")
  )
    errors.push(
      "Promote staging to main or use a reviewed keane-hotfix branch",
    );

  if (author === "dependabot[bot]") {
    for (const file of files) {
      if (
        !/^(?:package(?:-lock)?\.json|\.github\/workflows\/[^/]+\.ya?ml)$/.test(
          file,
        )
      )
        errors.push(`${file} is outside Dependabot's dependency files`);
    }
    if (!approved("keanesc")) errors.push("Approval from @keanesc is required");
    return errors;
  }

  if (author !== "keanesc" && !(process.env.GITHUB_REPOSITORY === "lumbinitechnologies/skillarc" && author !== "lumbinitechnologies" && issue?.assignees?.some(person => person.login === author)))
    errors.push("Only @keanesc or an explicitly assigned server contributor may author delivery PRs");
  if (!issue || issue.pull_request)
    errors.push("A linked GitHub issue is required (a PR is not an issue)");
  if (
    issue &&
    !(issue.assignees || []).some((person) => person.login === "keanesc")
  )
    errors.push("Linked GitHub issue must be assigned to @keanesc");
  if (!approved("lumbinitechnologies"))
    errors.push("Independent approval from @lumbinitechnologies is required");
  return errors;
}

async function request(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} on ${path}`);
  return response.json();
}

async function pages(path, token) {
  const items = [];
  for (let page = 1; ; page++) {
    const part = await request(
      `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      token,
    );
    items.push(...part);
    if (part.length < 100) return items;
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repository || !eventPath)
    throw new Error("Missing GitHub Actions context");
  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  const pr = event.pull_request;
  if (!pr) throw new Error("Review event has no pull request");
  const base = `/repos/${repository}`;
  let errors;
  try {
    const issueNumber = Number(
      pr.body?.match(/^\s*-?\s*GitHub issue:\s*#(\d+)/im)?.[1],
    );
    const issue = issueNumber
      ? await request(`${base}/issues/${issueNumber}`, token)
      : null;
    const [fileRecords, reviews] = await Promise.all([
      pages(`${base}/pulls/${pr.number}/files`, token),
      pages(`${base}/pulls/${pr.number}/reviews`, token),
    ]);
    errors = evaluate({
      author: pr.user.login,
      headSha: pr.head.sha,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      title: pr.title,
      issue,
      files: fileRecords.map((file) => file.filename),
      reviews,
    });
  } catch (error) {
    errors = [String(error)];
  }
  const state = errors.length ? "failure" : "success";
  const description = errors.length
    ? errors[0].slice(0, 130)
    : "Issue, Keane authorship, and owner review approved";
  const response = await fetch(
    `https://api.github.com${base}/statuses/${pr.head.sha}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        state,
        context: "governance/review-policy",
        description,
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      `Cannot publish review-policy status: ${response.status} ${await response.text()}`,
    );
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else console.log("Review policy passed");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
