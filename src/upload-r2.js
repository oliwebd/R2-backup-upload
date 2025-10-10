#!/usr/bin/env node
import { loadConfig } from "./config.js";

(async () => {
  const config = loadConfig();

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import fs from "fs-extra";
import mime from "mime";
import path from "path";
import pLimit from "p-limit";

config();

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;
const LOCAL_DIR = process.env.LOCAL_BACKUP;
const CONCURRENCY = Number(process.env.CONCURRENCY_SPEED) || 10;
const limit = pLimit(CONCURRENCY);

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
  const key = path.relative(LOCAL_DIR, file).replace(/\\/g, "/");
  const body = fs.createReadStream(file); // streaming for big files
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
  console.log(`🚀 Reuploading ${files.length} files with concurrency: ${CONCURRENCY}...`);

  const tasks = files.map(file => limit(() => uploadFile(file)));
  await Promise.all(tasks);

  console.log("🎉 All files reuploaded with cache headers!");
}

reuploadAll().catch(console.error);

