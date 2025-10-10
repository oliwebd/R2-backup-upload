#!/usr/bin/env node
import fs from "fs";
import path from "path";
import readline from "readline";
import crypto from "crypto";
import os from "os";

const CONFIG_FILE = path.resolve(process.cwd(), ".r2syncrc");
const MASTER_KEY_FILE = path.join(os.homedir(), ".r2sync-key");

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

(async function setup() {
  console.log("⚙️ R2sync Setup");

  const R2_ACCESS_KEY = await ask("Enter R2_ACCESS_KEY: ");
  const R2_SECRET_KEY = await ask("Enter R2_SECRET_KEY: ");
  const R2_ACCOUNT_ID = await ask("Enter R2_ACCOUNT_ID: ");
  const R2_BUCKET = await ask("Enter R2_BUCKET: ");
  const LOCAL_BACKUP = await ask("Enter LOCAL_BACKUP path (default: ./r2-backup): ") || "./r2-backup";
  const CONCURRENCY_SPEED = await ask("Enter CONCURRENCY_SPEED (default: 100): ") || "100";

  const configObj = {
    R2_ACCESS_KEY,
    R2_SECRET_KEY,
    R2_ACCOUNT_ID,
    R2_BUCKET,
    LOCAL_BACKUP,
    CONCURRENCY_SPEED
  };

  const configJSON = JSON.stringify(configObj, null, 2);

  let masterKey;
  if (fs.existsSync(MASTER_KEY_FILE)) {
    masterKey = fs.readFileSync(MASTER_KEY_FILE);
    console.log("🔑 Master key loaded from", MASTER_KEY_FILE);
  } else {
    masterKey = crypto.randomBytes(32); // AES-256
    fs.writeFileSync(MASTER_KEY_FILE, masterKey, { mode: 0o600 });
    console.log("🔑 Master key generated and stored securely at", MASTER_KEY_FILE);
  }

  const encrypted = encrypt(configJSON, masterKey);
  fs.writeFileSync(CONFIG_FILE, encrypted, { mode: 0o600 });

  console.log(`🔐 Encrypted config saved to ${CONFIG_FILE}`);
})();
