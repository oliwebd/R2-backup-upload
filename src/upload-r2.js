#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs-extra";
import mime from "mime";
import path from "path";
import pLimit from "p-limit";

(async () => {
  const cfg = loadConfig();

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.R2_ACCESS_KEY,
      secretAccessKey: cfg.R2_SECRET_KEY,
    },
  });

  const BUCKET = cfg.R2_BUCKET;
  let LOCAL_DIR = cfg.LOCAL_BACKUP; // Default local folder
  const CONCURRENCY = Number(cfg.CONCURRENCY_SPEED) || 10;
  const limit = pLimit(CONCURRENCY);

  // Parse CLI args
  const args = process.argv.slice(2);
  let remotePath = "";

  const remoteIndex = args.indexOf("--remote");
  if (remoteIndex !== -1 && args[remoteIndex + 1]) {
    remotePath = args[remoteIndex + 1].replace(/\/$/, "");
    console.log("📂 Uploading only remote folder:", remotePath);
  }

  const localIndex = args.indexOf("--local");
  if (localIndex !== -1 && args[localIndex + 1]) {
    LOCAL_DIR = args[localIndex + 1];
    console.log("📁 Overriding local backup directory:", LOCAL_DIR);
  }

  // If --remote is set, adjust LOCAL_DIR to that subfolder locally
  if (remotePath) {
    LOCAL_DIR = path.join(LOCAL_DIR, remotePath);
  }

  async function getAllFiles(dir) {
    const files = [];
    for (const file of await fs.readdir(dir)) {
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        files.push(...await getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  async function uploadFile(file) {
    let key = path.relative(cfg.LOCAL_BACKUP, file).replace(/\\/g, "/");

    // If remotePath is set, ensure key includes it
    if (remotePath) {
      const relativeKey = path.relative(path.join(cfg.LOCAL_BACKUP, remotePath), file).replace(/\\/g, "/");
      key = path.posix.join(remotePath, relativeKey);
    }

    const body = fs.createReadStream(file);
    const contentType = mime.getType(file) || "application/octet-stream";

    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    console.log(`✅ Uploaded: ${key} (${contentType})`);
  }

  async function reuploadAll() {
    const files = await getAllFiles(LOCAL_DIR);
    console.log(`🚀 Uploading ${files.length} files with concurrency: ${CONCURRENCY}...`);

    const tasks = files.map(file => limit(() => uploadFile(file)));
    await Promise.all(tasks);

    console.log("🎉 All files uploaded with cache headers!");
  }

  reuploadAll().catch(err => {
    console.error("❌ Upload failed:", err);
    process.exit(1);
  });
})();
