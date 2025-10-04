module.exports = {
  extends: ["@commitlint/config-conventional"],
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w+)(?:\([^)]*\)|\[[^\]]*\])?!?:\s(.+)$/,
      headerCorrespondence: ['type', 'subject']
    }
  },
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
        "translation",
        "security",
        "changeset",
        "init",
        "other",
      ],
    ],
    "type-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "scope-empty": [0],
    "subject-full-stop": [0, "never"],
    "subject-case": [0, "never"],
    "header-max-length": [0, "always", 72],
  },
  ignores: [
    (commit) => commit.startsWith("Merge"),
    (commit) => commit.includes("copilot-swe-agent[bot]"),
  ],
};
