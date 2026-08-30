import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const MAX_FAILURE_OUTPUT_BYTES = 24 * 1024;

const CHECKS = {
  diff: {
    label: "Git whitespace check",
    command: "git",
    args: ["diff", "--check", "HEAD", "--"],
  },
  typecheck: {
    label: "TypeScript",
    command: "pnpm",
    args: ["typecheck"],
  },
  lint: {
    label: "ESLint",
    command: "pnpm",
    args: ["lint"],
  },
  runtime: {
    label: "Runtime module contracts",
    command: "pnpm",
    args: ["runtime-modules:check"],
  },
  antd: {
    label: "Ant Design doctor",
    command: "pnpm",
    args: ["exec", "antd", "doctor"],
  },
  package: {
    label: "Distribution package",
    command: "pnpm",
    args: ["build"],
  },
};

const EXPLICIT_PROFILES = {
  docs: ["diff"],
  code: ["diff", "typecheck", "lint"],
  runtime: ["diff", "typecheck", "lint", "runtime"],
  antd: ["diff", "typecheck", "lint", "antd"],
  package: ["diff", "lint", "package"],
  all: ["diff", "lint", "runtime", "antd", "package"],
};

const requestedProfile = process.argv[2] ?? "changed";

if (requestedProfile === "--help" || requestedProfile === "help") {
  console.log(`Usage: pnpm verify [profile]

Profiles:
  changed  Select the smallest relevant check set from Git changes (default)
  docs     Whitespace check only
  code     TypeScript and ESLint
  runtime  Code checks plus Runtime module contract validation
  antd     Code checks plus Ant Design doctor
  package  ESLint plus compiled distribution validation
  all      All checks

Successful verification stays silent. A failing tool prints only the captured output tail.`);
  process.exit(0);
}

let checkKeys;
if (requestedProfile === "changed") {
  checkKeys = await resolveChangedChecks();
} else {
  checkKeys = EXPLICIT_PROFILES[requestedProfile];
  if (!checkKeys) {
    console.error(
      `Unknown verification profile "${requestedProfile}". Run "pnpm verify help" for available profiles.`,
    );
    process.exit(2);
  }
}

for (const checkKey of checkKeys) {
  const check = CHECKS[checkKey];
  const result = await runCaptured(check.command, check.args);
  if (result.exitCode !== 0) {
    console.error(`Verification failed: ${check.label}`);
    console.error(`$ ${formatCommand(check.command, check.args)}`);
    if (result.output.trim()) {
      console.error(result.output.trimEnd());
    }
    process.exit(result.exitCode || 1);
  }
}

async function resolveChangedChecks() {
  const changedFiles = await readChangedFiles();
  const selectedChecks = new Set(["diff"]);

  if (changedFiles.length === 0) {
    return [...selectedChecks];
  }

  const hasCodeChange = changedFiles.some(isCodeRelevant);
  const hasPackageChange = changedFiles.some(isPackageRelevant);
  const hasRuntimeChange = changedFiles.some(isRuntimeRelevant);
  const hasAntdChange = await containsAntdRelevantChange(changedFiles);

  if (hasCodeChange) {
    selectedChecks.add("lint");
    selectedChecks.add(hasPackageChange ? "package" : "typecheck");
  }
  if (hasRuntimeChange) {
    selectedChecks.add("runtime");
  }
  if (hasAntdChange) {
    selectedChecks.add("antd");
  }

  return [...selectedChecks];
}

async function readChangedFiles() {
  const tracked = await runCaptured("git", [
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    "HEAD",
    "--",
  ]);
  assertDiscoverySucceeded("tracked Git changes", tracked);

  const untracked = await runCaptured("git", [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  assertDiscoverySucceeded("untracked Git changes", untracked);

  return [...new Set([
    ...tracked.output.split("\n"),
    ...untracked.output.split("\n"),
  ].map((entry) => entry.trim()).filter(Boolean))];
}

function assertDiscoverySucceeded(label, result) {
  if (result.exitCode === 0) {
    return;
  }
  console.error(`Unable to inspect ${label}.`);
  if (result.output.trim()) {
    console.error(result.output.trimEnd());
  }
  process.exit(result.exitCode || 1);
}

function isCodeRelevant(file) {
  return (
    /\.(?:[cm]?[jt]sx?)$/u.test(file) ||
    file === "package.json" ||
    file.startsWith("tsconfig") ||
    file.startsWith("eslint.config.")
  );
}

function isPackageRelevant(file) {
  return (
    file === "package.json" ||
    file === "tsconfig.build.json" ||
    file === "index.js" ||
    file === "index.d.ts" ||
    /^scripts\/(?:clean|prepare|validate)-package-dist\.mjs$/u.test(file)
  );
}

function isRuntimeRelevant(file) {
  return (
    file.startsWith("plugins/runtime-modules/") ||
    file.startsWith("components/runtime/") ||
    file.startsWith("components/widgets/config/") ||
    file.startsWith("components/layouts/") ||
    file.startsWith("types/") ||
    file === "constants/cms-widget-types.ts"
  );
}

async function containsAntdRelevantChange(files) {
  if (
    files.some((file) =>
      file === "package.json" ||
      file.startsWith("theme/") ||
      file.startsWith("components/root/"))
  ) {
    return true;
  }

  const sourceFiles = files.filter((file) => /\.(?:[cm]?[jt]sx?)$/u.test(file));
  const contents = await Promise.all(sourceFiles.map(async (file) => {
    try {
      return await readFile(path.join(repositoryRoot, file), "utf8");
    } catch {
      return "";
    }
  }));
  return contents.some((content) =>
    /(?:from\s+|import\s*\()["'](?:antd|@ant-design\/)/u.test(content));
}

function runCaptured(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output = [];
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => output.push(chunk));
    child.on("error", reject);
    child.on("close", (exitCode) => {
      const captured = Buffer.concat(output);
      const truncated = captured.length > MAX_FAILURE_OUTPUT_BYTES;
      const visible = truncated
        ? captured.subarray(captured.length - MAX_FAILURE_OUTPUT_BYTES)
        : captured;
      resolve({
        exitCode: exitCode ?? 1,
        output: `${truncated ? "[Earlier verification output omitted.]\n" : ""}${visible.toString("utf8")}`,
      });
    });
  });
}

function formatCommand(command, args) {
  return [command, ...args].map((part) =>
    /^[A-Za-z0-9_./:@=-]+$/u.test(part)
      ? part
      : JSON.stringify(part)).join(" ");
}
