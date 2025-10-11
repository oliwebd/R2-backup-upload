#!/usr/bin/env node
import fs from "fs";
import path from "path";
import readline from "readline";
import os from "os";

const CONFIG_FILE = path.resolve(process.cwd(), ".r2syncrc");
const REQUIRED_KEYS = [
  "R2_ACCESS_KEY", 
  "R2_SECRET_KEY", 
  "CF_ACCOUNT_ID", 
  "R2_BUCKET"
];

// ───────────────────────────────
// Helper: Ask user for input
// ───────────────────────────────
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

// ───────────────────────────────
// Helper: Load existing configuration (NEW FORMAT)
// ───────────────────────────────
function loadExistingConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = {};
      
      // Parse KEY=VALUE lines
      content.split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const parts = line.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, ''); 
            config[key] = value;
          }
        }
      });
      return config;
    } catch (error) {
      // If parsing fails, just return empty config
      return {};
    }
  }
  return {};
}

// ───────────────────────────────
// Helper: Get value from ENV, existing config, or prompt
// ───────────────────────────────
async function getConfigValue(key, promptMessage, existingConfig, defaultValue) {
  const existingValue = existingConfig[key];
  let finalDefault = existingValue || defaultValue;

  // Handle sensitive keys by masking existing/default values in the prompt
  const displayDefault = (key === "R2_ACCESS_KEY" || key === "R2_SECRET_KEY") && finalDefault 
    ? finalDefault.substring(0, 4) + '...' 
    : finalDefault;
  
  const prompt = `\n${promptMessage} (current/default: ${displayDefault || 'None'}): `;
    
  let value = (await ask(prompt)).trim();
  
  // Use the existing or default value if the user hits Enter
  return value || finalDefault || '';
}

// ───────────────────────────────
// Security Guidance for Config File
// ───────────────────────────────
function showSecurityGuidance() {
  console.log("\n🔒 SECURITY ALERT! 🔒");
  console.log("--------------------------------------------------------------------");
  console.log(`The file ${CONFIG_FILE} contains your R2 SECRET KEY.`);
  console.log("NEVER commit this file to version control (like Git/GitHub).");
  console.log("ACTION: Immediately add this line to your .gitignore file:");
  console.log(`\n  ${CONFIG_FILE}\n`);
  console.log("For production environments, consider using environment variables for better security.");
  console.log("--------------------------------------------------------------------");
}

// ───────────────────────────────
// Environment Variable Guidance
// ───────────────────────────────
function showEnvGuidance() {
  console.log("\n💡 Environment Variable Configuration Guide 💡");
  console.log("--------------------------------------------------------------------");
  console.log("r2sync will now look for configuration data in environment variables.");
  console.log("Please set the following variables in your shell profile or deployment pipeline:");
  console.log("\nexport R2SYNC_R2_ACCESS_KEY=\"...\"");
  console.log("export R2SYNC_R2_SECRET_KEY=\"...\"");
  console.log("export R2SYNC_CF_ACCOUNT_ID=\"...\"");
  console.log("export R2SYNC_R2_BUCKET=\"...\"");
  console.log("\nOptional variables:");
  console.log("export R2SYNC_LOCAL_BACKUP=\"./r2-backup\"");
  console.log("export R2SYNC_CONCURRENCY_SPEED=\"100\"");
  console.log("\nAfter setting them, re-run 'r2sync upload' or 'r2sync download'.");
  console.log("--------------------------------------------------------------------");
}

// ───────────────────────────────
// Main Setup Function
// ───────────────────────────────
(async function setup() {
  console.log("⚙️  R2sync Setup Wizard\n───────────────────────────────");
  
  const choice = await ask(
    "\n❓ Where would you like to store your configuration?\n" +
    "   (C)onfig file (.r2syncrc) - Easy local dev, NOT secure for git\n" +
    "   (E)nvironment variables - Secure for git, best for production\n" +
    "\nYour choice (C/E): "
  );

  if (choice.toLowerCase() === 'e') {
    showEnvGuidance();
    return;
  }
  
  if (choice.toLowerCase() !== 'c' && choice !== '') {
    console.log("🚫 Invalid choice. Setup aborted.");
    return;
  }

  // --- User chose Config file (.r2syncrc) ---
  console.log("\n⚠️ WARNING: Configuration will be saved UNENCRYPTED in .r2syncrc (KEY=VALUE format).");

  const existingConfig = loadExistingConfig();
  
  if (Object.keys(existingConfig).length > 0) {
    console.log(`\n📄 Existing config found at ${CONFIG_FILE}:`);
    const displayLines = Object.entries(existingConfig).map(([key, val]) => {
      const displayValue = (key === "R2_SECRET_KEY") ? '****************' : val;
      return `${key}=${displayValue}`;
    }).join('\n');
    console.log(displayLines);
    
    const useExisting = await ask("\n❓ Use this existing configuration (Y/n)? ");
    if (useExisting.toLowerCase() === 'y' || useExisting === '') {
      const allPresent = REQUIRED_KEYS.every(key => existingConfig[key]);
      if (allPresent) {
        console.log("✨ Existing configuration confirmed and valid. Setup complete.");
        showSecurityGuidance();
        return;
      }
      console.log("⚠️ Existing configuration is incomplete. Continuing setup to fill missing fields.");
    }
  }


  console.log("\n🛠️ Collecting Configuration Data (Prioritizing existing values):");

  // Collect configuration
  const R2_ACCESS_KEY = await getConfigValue("R2_ACCESS_KEY", "🔑 Enter R2_ACCESS_KEY", existingConfig);
  const R2_SECRET_KEY = await getConfigValue("R2_SECRET_KEY", "🔒 Enter R2_SECRET_KEY", existingConfig);
  const CF_ACCOUNT_ID = await getConfigValue("CF_ACCOUNT_ID", "🏢 Enter CF_ACCOUNT_ID", existingConfig);
  const R2_BUCKET = await getConfigValue("R2_BUCKET", "🪣 Enter R2_BUCKET", existingConfig);
  const LOCAL_BACKUP = await getConfigValue("LOCAL_BACKUP", "💾 Enter LOCAL_BACKUP path", existingConfig, "./r2-backup");
  
  let CONCURRENCY_SPEED_RAW = await getConfigValue("CONCURRENCY_SPEED", "⚡ Enter CONCURRENCY_SPEED", existingConfig, "100");
  const CONCURRENCY_SPEED = parseInt(CONCURRENCY_SPEED_RAW);

  const configObj = {
    R2_ACCESS_KEY,
    R2_SECRET_KEY,
    CF_ACCOUNT_ID,
    R2_BUCKET,
    LOCAL_BACKUP,
    CONCURRENCY_SPEED,
  };

  // Basic validation
  if (!R2_ACCESS_KEY || !R2_SECRET_KEY || !CF_ACCOUNT_ID || !R2_BUCKET) {
      console.error("\n❌ ERROR: R2_ACCESS_KEY, R2_SECRET_KEY, CF_ACCOUNT_ID, and R2_BUCKET are required.");
      process.exit(1);
  }

  // ───────────────────────────────
  // Format Output for Plaintext Save
  // ───────────────────────────────
  const configLines = [
    `# R2sync Configuration File (Generated on ${new Date().toISOString()})`,
    `R2_ACCESS_KEY=${configObj.R2_ACCESS_KEY}`,
    `R2_SECRET_KEY=${configObj.R2_SECRET_KEY}`,
    `CF_ACCOUNT_ID=${configObj.CF_ACCOUNT_ID}`,
    `R2_BUCKET=${configObj.R2_BUCKET}`,
    `LOCAL_BACKUP=${configObj.LOCAL_BACKUP}`,
    `CONCURRENCY_SPEED=${configObj.CONCURRENCY_SPEED}`,
  ].join('\n');
  
  // ───────────────────────────────
  // Confirmation and Save
  // ───────────────────────────────
  console.log("\n✅ Configuration ready to save:");
  console.log(configLines);
  
  const saveConfirmed = await ask("\n❓ Confirm and save this configuration to .r2syncrc (Y/n)? ");

  if (saveConfirmed.toLowerCase() === 'y' || saveConfirmed === '') {
    // Saving the plain text directly
    fs.writeFileSync(CONFIG_FILE, configLines + '\n', { mode: 0o600 });
    console.log(`\n📄 Plaintext config saved to: ${CONFIG_FILE}`);
    showSecurityGuidance();
    console.log(`\n✨ Setup complete! You can now run:\n   → r2sync upload\n   → r2sync download`);
  } else {
    console.log("\n🚫 Setup aborted. Configuration file not created or updated.");
  }
})();

