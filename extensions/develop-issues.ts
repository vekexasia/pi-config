import {
  registerWorkflowExtension,
  type JsonSchema,
  type JsonValue,
  type WorkflowExtension,
} from "../../../git/personale/pi-workflows/dist/src/index.js";

const reviewSchema: JsonSchema = {
  type: "object",
  properties: {
    pass: { type: "boolean" },
    findings: { type: "array", items: { type: "string" } },
  },
  required: ["pass", "findings"],
  additionalProperties: false,
};

const loopResultSchema: JsonSchema = {
  type: "object",
  properties: {
    pass: { type: "boolean" },
    iterations: { type: "integer" },
    devResult: {},
    review: reviewSchema,
  },
  required: ["pass", "iterations", "devResult", "review"],
  additionalProperties: false,
};

export const developIssuesExtension: WorkflowExtension = {
  version: "1.0.0",
  headline: "Parallel issue development",
  description:
    "Develops GitHub issues in isolated worktrees, merges approved results, and summarizes the work.",
  functions: {
    developIssuesUntilApproved: {
      description:
        "Develop issue numbers in parallel worktrees, merge them into main after review, then summarize the result",
      input: {
        type: "object",
        properties: {
          issues: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: { type: "integer", minimum: 1 },
          },
          maxIterations: { type: "integer", minimum: 1 },
        },
        required: ["issues"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          issues: { type: "array", items: { type: "integer" } },
          issueResults: {
            type: "object",
            additionalProperties: loopResultSchema,
          },
          merge: { anyOf: [loopResultSchema, { type: "null" }] },
          summary: {},
        },
        required: ["issues", "issueResults", "merge", "summary"],
        additionalProperties: false,
      },
      async run(input, context) {
        const issues = input.issues as number[];
        const maxIterations = (input.maxIterations as number | undefined) ?? 5;
        const tasks: Record<string, () => Promise<JsonValue>> = {};

        for (const issue of issues) {
          tasks[`issue-${String(issue)}`] = () =>
            context.withWorktree(`issue-${String(issue)}`, () =>
              context.invoke("developUntilApproved", {
                task: `Resolve issue #${String(issue)} in the current repository. Read the issue with appropriate cli (gh or glab), implement the root-cause fix, run the relevant tests, commit every change, and report the commit SHA.`,
                maxIterations,
              }),
            );
        }

        context.phase("issues");
        context.log(
          `Developing ${String(issues.length)} issue(s) in parallel worktrees`,
        );
        const issueResults = await context.parallel("issues", tasks);
        const entries = Object.entries(
          issueResults as Record<string, JsonValue>,
        );
        const approvedResults = Object.fromEntries(
          entries.filter(([, result]) => (result as { pass?: boolean }).pass),
        );
        const failedResults = Object.fromEntries(
          entries.filter(([, result]) => !(result as { pass?: boolean }).pass),
        );
        const failed = Object.keys(failedResults);
        if (failed.length > 0)
          context.log(
            `Skipping failed issue worktrees: ${failed.join(", ")}\n${JSON.stringify(failedResults)}`,
          );

        let merge: JsonValue = null;
        if (Object.keys(approvedResults).length > 0) {
          context.phase("merge");
          context.log("Merging approved issue worktrees into main");
          merge = await context.invoke("developUntilApproved", {
            task: context.prompt(
              "Merge only the approved issue worktrees into the current main working tree. Do not merge failed issue worktrees. Inspect git worktree list and the reported commits, merge the approved branches, resolve conflicts, run the full relevant test suite, commit the merge result, and leave the current working tree clean.\n\nApproved issue results:\n{approvedResults}\n\nFailed issue worktrees to skip:\n{failed}",
              { approvedResults, failed },
            ),
            maxIterations,
          });
          if (!(merge as { pass?: boolean }).pass)
            throw new Error("Merged result failed review");
        } else {
          context.log("No approved issue worktrees to merge");
        }

        context.phase("summary");
        const summary = await context.agent(
          context.prompt(
            "Summarize what succeeded, what failed review, what was tested, and what was merged. Do not change files.\n\nIssues:\n{issues}\n\nIssue results:\n{issueResults}\n\nFailed issues:\n{failed}\n\nMerge result:\n{merge}",
            { issues, issueResults, failed, merge },
          ),
          { role: "scout", label: "resumer" },
        );

        return { issues, issueResults, merge, summary };
      },
    },
  },
  workflows: {
    developIssues: {
      description:
        "Develop GitHub issues in parallel, merge approved work into main, and return a final summary",
      script: "return developIssuesUntilApproved(args);",
    },
  },
};

export default function (): void {
  registerWorkflowExtension(developIssuesExtension);
}
