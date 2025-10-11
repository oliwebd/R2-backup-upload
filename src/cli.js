#!/usr/bin/env node
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs"; // <-- Added filesystem import
import { loadConfig } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '..', 'package.json'); // Path to package.json
const args = process.argv.slice(2);

function showHelp() {
  console.log(`
──────────────────────────────────────────────
🌀  R2SYNC CLI — Cloudflare R2 Upload/Download
──────────────────────────────────────────────

Usage:
  r2sync setup
  r2sync upload [--remote <remote-folder>] [--local <local-folder>]
  r2sync download [--remote <remote-folder>] [--local <local-folder>]

The default base local path is defined during 'r2sync setup' (default: ./r2-backup).

Examples:
  r2sync setup
  r2sync upload
  r2sync download
  r2sync upload --remote /images --local ./public
  r2sync download --remote /backup --local ./restored

Options:
  --remote     Remote folder path inside R2 bucket (default: /)
  --local      Local folder path (If provided, overrides the default path calculation.)
  -v, --version Show package version
  --help       Show this help message

──────────────────────────────────────────────
`);
}

/**
 * Reads and displays the package version, then exits.
 */
function showVersion() {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`r2sync version: ${packageJson.version}`);
    } catch (e) {
        console.error("❌ Could not read package version from package.json.");
    }
    process.exit(0);
}

function getArgValue(flag) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

/**
 * Generates the default dated local backup path using the configured base path.
 * Format: <basePath>/<BUCKET_NAME>_YYYYMMDD
 * @param {string} basePath The configured LOCAL_BACKUP path from .r2syncrc.
 * @param {string} bucketName The R2 BUCKET name.
 * @returns {string} The full default path.
 */
function getDefaultLocal(basePath, bucketName) {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  
  // Use the configured basePath (e.g., ./r2-backup) as the base
  return path.join(basePath, `${bucketName}_${yyyy}${mm}${dd}`);
}

async function runCommand() {
  // 1. Check for version flags
  if (args.includes("-v") || args.includes("--version")) {
    showVersion();
  }

  // 2. Check for help flag
  if (args.includes("--help") || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  const scriptMap = {
    setup: "./setup.js",
    upload: "./upload-r2.js",
    download: "./download-r2.js"
  };

  if (!scriptMap[command]) {
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }

  if (command === "setup") {
    // Setup runs interactively and doesn't require config to be loaded first.
    const scriptPath = path.resolve(__dirname, scriptMap[command]);
    const child = spawn("node", [scriptPath], { stdio: "inherit" });
    child.on("exit", (code) => process.exit(code));
    return;
  }

  // For upload/download commands, load config
  const cfg = loadConfig();
  const BUCKET = cfg.R2_BUCKET;
  const LOCAL_BACKUP_BASE = cfg.LOCAL_BACKUP || "./r2-backup"; // Use configured base path

  const remote = getArgValue("--remote") || "/";
  // If --local is NOT provided, use the configured base path to calculate the default dated path
  const local = getArgValue("--local") || getDefaultLocal(LOCAL_BACKUP_BASE, BUCKET);

  console.log(`⚙️ Running ${command} with:`);
  console.log(`   🌐 Remote: ${remote}`);
  console.log(`   💾 Local: ${local}`);

  const scriptPath = path.resolve(__dirname, scriptMap[command]);
  
  const child = spawn("node", [scriptPath, "--remote", remote, "--local", local], {
    stdio: "inherit"
  });

  child.on("exit", (code) => process.exit(code));
}

runCommand();

