#!/usr/bin/env node
import { spawn } from "child_process";
import path from "path";
import readline from "readline";

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
Usage:
  r2sync upload --remote <remote-folder> --local <local-folder>
  r2sync download --remote <remote-folder> --local <local-folder>

Options:
  --remote    Remote folder path inside R2 bucket
  --local     Local folder path to download to or upload from
  --help      Show this help message
`);
}

if (args.includes("--help") || args.length === 0) {
  showHelp();
  process.exit(0);
}

const command = args[0];
const scriptMap = {
  upload: "./upload-r2.js",
  download: "./download-r2.js"
};

if (!scriptMap[command]) {
  console.error(`❌ Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}

// Helper to check for argument
function getArgValue(flag) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

async function runCommand() {
  let remote = getArgValue("--remote");
  let local = getArgValue("--local");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise(resolve => rl.question(query, resolve));

  if (!remote) {
    remote = await question("📂 Enter remote folder path: ");
  }
  if (!local) {
    local = await question("📁 Enter local folder path: ");
  }

  rl.close();

  const scriptPath = path.resolve(new URL(import.meta.url).pathname, "..", scriptMap[command]);
  const child = spawn("node", [scriptPath, command, "--remote", remote, "--local", local], {
    stdio: "inherit"
  });

  child.on("exit", (code) => process.exit(code));
}

runCommand();
