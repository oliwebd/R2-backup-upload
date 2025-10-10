import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

const CONFIG_FILE = path.resolve(process.cwd(), ".r2syncrc");
const MASTER_KEY_FILE = path.join(os.homedir(), ".r2sync-key");

function decrypt(data, key) {
  const [ivBase64, encryptedData] = data.split(":");
  const iv = Buffer.from(ivBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error(".r2syncrc not found — run: npm run setup");
    process.exit(1);
  }

  if (!fs.existsSync(MASTER_KEY_FILE)) {
    console.error("Master key file missing — run: npm run setup");
    process.exit(1);
  }

  const masterKey = fs.readFileSync(MASTER_KEY_FILE);
  const encryptedData = fs.readFileSync(CONFIG_FILE, "utf-8");

  try {
    const decryptedJSON = decrypt(encryptedData, masterKey);
    return JSON.parse(decryptedJSON);
  } catch (err) {
    console.error("❌ Failed to decrypt config", err);
    process.exit(1);
  }
}

