import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate } from "./review-policy.mjs";

const base = {
  author: "keanesc",
  title: "Define mobile v1 and GitHub delivery",
  issue: {
    title: "Define mobile v1 and GitHub delivery",
    assignees: [{ login: "keanesc" }],
  },
  files: [".github/workflows/ci.yml"],
  reviews: [{ user: { login: "lumbinitechnologies" }, state: "APPROVED" }],
};

test("allows Keane's linked PR after independent review", () =>
  assert.deepEqual(evaluate(base), []));
test("rejects other human authors even when the owner approved", () =>
  assert.match(
    evaluate({ ...base, author: "intern" }).join(" "),
    /Only @keanesc/,
  ));
test("accepts legacy SCRUM titles without requiring matching keys", () => {
  assert.deepEqual(
    evaluate({
      ...base,
      title: "[SCRUM-44] Governance",
      issue: { ...base.issue, title: "[SCRUM-99] Legacy issue" },
    }),
    [],
  );
});
test("requires a linked issue and rejects a linked PR", () => {
  assert.match(
    evaluate({ ...base, issue: null }).join(" "),
    /linked GitHub issue/,
  );
  assert.match(
    evaluate({ ...base, issue: { ...base.issue, pull_request: {} } }).join(" "),
    /a PR is not an issue/,
  );
});
test("requires Keane to own the linked issue", () =>
  assert.match(
    evaluate({ ...base, issue: { ...base.issue, assignees: [] } }).join(" "),
    /assigned to @keanesc/,
  ));
test("requires independent approval and honors a dismissed review", () => {
  assert.match(
    evaluate({ ...base, reviews: [] }).join(" "),
    /lumbinitechnologies/,
  );
  assert.match(
    evaluate({
      ...base,
      reviews: [
        ...base.reviews,
        { user: { login: "lumbinitechnologies" }, state: "DISMISSED" },
      ],
    }).join(" "),
    /lumbinitechnologies/,
  );
});
test("allows Dependabot dependency changes only after Keane review", () => {
  const bot = {
    ...base,
    author: "dependabot[bot]",
    title: "Bump dependency",
    issue: null,
    files: ["package-lock.json"],
    reviews: [],
  };
  assert.match(evaluate(bot).join(" "), /keanesc/);
  assert.deepEqual(
    evaluate({
      ...bot,
      reviews: [{ user: { login: "keanesc" }, state: "APPROVED" }],
    }),
    [],
  );
  assert.match(
    evaluate({ ...bot, files: ["src/app/index.tsx"] }).join(" "),
    /outside Dependabot/,
  );
});

test("staging features and main promotions need review of the current head", () => {
  const candidate = {
    ...base,
    headSha: "current",
    headRef: "keane-55-environment-delivery",
    baseRef: "staging",
    reviews: [
      {
        user: { login: "lumbinitechnologies" },
        state: "APPROVED",
        commit_id: "current",
      },
    ],
  };
  assert.deepEqual(evaluate(candidate), []);
  assert.deepEqual(
    evaluate({ ...candidate, baseRef: "main", headRef: "staging" }),
    [],
  );
  assert.notDeepEqual(evaluate({ ...candidate, baseRef: "main" }), []);
  assert.notDeepEqual(evaluate({ ...candidate, headSha: "new" }), []);
  assert.deepEqual(
    evaluate({
      ...candidate,
      reviews: [
        ...candidate.reviews,
        { user: { login: "lumbinitechnologies" }, state: "COMMENTED" },
      ],
    }),
    [],
  );
});
