#!/usr/bin/env node
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs-extra";
import path from "path";
import pLimit from "p-limit";
import { loadConfig } from "./config.js";

(async () => {
  const cfg = loadConfig();

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.R2_ACCESS_KEY,
      secretAccessKey: cfg.R2_SECRET_KEY,
    },
  });

  const BUCKET = cfg.R2_BUCKET;
  let LOCAL_DIR = cfg.LOCAL_BACKUP;
  const CONCURRENCY = Number(cfg.CONCURRENCY_SPEED) || 10;
  const limit = pLimit(CONCURRENCY);

  // Parse CLI args
  const args = process.argv.slice(2);
  let remotePath = "";

  const remoteIndex = args.indexOf("--remote");
  if (remoteIndex !== -1 && args[remoteIndex + 1]) {
    remotePath = args[remoteIndex + 1].replace(/\/$/, ""); // Remove trailing slash
    console.log("📂 Downloading only remote folder:", remotePath);
  }

  const localIndex = args.indexOf("--local");
  if (localIndex !== -1 && args[localIndex + 1]) {
    LOCAL_DIR = args[localIndex + 1];
    console.log("📁 Overriding local backup directory:", LOCAL_DIR);
  }

  async function streamToFile(stream, filepath) {
    await fs.ensureDir(path.dirname(filepath));
    const writeStream = fs.createWriteStream(filepath);
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on("error", reject);
      writeStream.on("finish", resolve);
    });
  }

  async function listAllKeys() {
    let ContinuationToken = undefined;
    const keys = [];

    do {
      const list = await client.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: remotePath || undefined,
        ContinuationToken,
      }));

      (list.Contents || []).forEach(item => keys.push(item.Key));

      ContinuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (ContinuationToken);

    return keys;
  }

  async function downloadFile(key) {
    const filepath = path.join(LOCAL_DIR, key);
    console.log("⬇️ Downloading:", key);

    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    await streamToFile(res.Body, filepath);

    console.log(`✅ Downloaded: ${key}`);
  }

  async function downloadAll() {
    const keys = await listAllKeys();
    console.log(`🚀 Downloading ${keys.length} files with concurrency ${CONCURRENCY}...`);

    const tasks = keys.map(key => limit(() => downloadFile(key)));
    await Promise.all(tasks);

    console.log("🎉 All files downloaded to", LOCAL_DIR);
  }

  downloadAll().catch(err => {
    console.error("❌ Download failed:", err);
    process.exit(1);
  });
})();
