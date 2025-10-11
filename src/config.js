import fs from "fs";
import path from "path";

// The config file path, prioritizing the environment variable R2SYNC_CONFIG 
// over the default path in the current working directory.
const CONFIG_FILE = process.env.R2SYNC_CONFIG || path.resolve(process.cwd(), ".r2syncrc");

// Define the core configuration keys and their corresponding ENV variable names
const CONFIG_KEYS = {
    R2_ACCESS_KEY: 'R2SYNC_R2_ACCESS_KEY',
    R2_SECRET_KEY: 'R2SYNC_R2_SECRET_KEY',
    CF_ACCOUNT_ID: 'R2SYNC_CF_ACCOUNT_ID',
    R2_BUCKET: 'R2SYNC_R2_BUCKET',
    LOCAL_BACKUP: 'R2SYNC_LOCAL_BACKUP',
    CONCURRENCY_SPEED: 'R2SYNC_CONCURRENCY_SPEED'
};

const REQUIRED_KEYS = [
    "R2_ACCESS_KEY", 
    "R2_SECRET_KEY", 
    "CF_ACCOUNT_ID", 
    "R2_BUCKET"
];

/**
 * Parses the content of a plaintext file (KEY=VALUE format) into an object.
 * @param {string} rawConfigData - The raw file content.
 * @returns {object} The parsed configuration object.
 */
function parsePlaintext(rawConfigData) {
    const config = {};
    rawConfigData.split('\n').forEach(line => {
        const trimmedLine = line.trim();

        // Ignore comments and empty lines
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            return;
        }

        // Split at the first '=' to handle values that may contain '='
        const parts = trimmedLine.split(/=(.*)/s);
        if (parts.length >= 2) {
            const key = parts[0].trim();
            // Remove surrounding quotes if present
            let value = parts[1].trim().replace(/^['"]|['"]$/g, ''); 
            
            // Assign value
            config[key] = value;
        }
    });
    return config;
}

/**
 * Loads configuration data, prioritizing the .r2syncrc file, and falling back
 * to environment variables with the R2SYNC_ prefix.
 * @returns {object} The complete configuration object.
 */
export function loadConfig() {
    let config = {};
    let source = "Environment Variables";
    
    // 1. Attempt to load from file
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const rawConfigData = fs.readFileSync(CONFIG_FILE, "utf-8");
            config = parsePlaintext(rawConfigData);
            source = `File: ${CONFIG_FILE}`;
        } catch (err) {
            console.error(`❌ Failed to read or parse config file ${CONFIG_FILE}.`);
            console.error("Error details:", err.message);
            process.exit(1);
        }
    } else {
        // 2. Fallback to Environment Variables
        console.log(`⚠️ ${CONFIG_FILE} not found. Loading configuration from R2SYNC_ prefixed environment variables.`);
        
        for (const [configKey, envKey] of Object.entries(CONFIG_KEYS)) {
            if (process.env[envKey]) {
                config[configKey] = process.env[envKey];
            }
        }
    }

    // 3. Apply type conversions and defaults
    
    // Ensure CONCURRENCY_SPEED is a number, default to 100 if missing
    config.CONCURRENCY_SPEED = parseInt(config.CONCURRENCY_SPEED || 100, 10);
    
    // Ensure LOCAL_BACKUP has a default if not set
    config.LOCAL_BACKUP = config.LOCAL_BACKUP || "./r2-backup";


    // 4. Validation
    for (const key of REQUIRED_KEYS) {
        if (!config[key]) {
            console.error(`\n❌ Configuration error: Missing required field "${key}".`);
            console.error(`Source: ${source}`);
            console.error("If using file, ensure .r2syncrc is present. If using ENV, ensure R2SYNC_" + key + " is set.");
            process.exit(1);
        }
    }
    
    // console.log(`Configuration loaded successfully from: ${source}`);
    return config;
}

