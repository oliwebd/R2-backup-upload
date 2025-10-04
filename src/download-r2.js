import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import fs from "fs-extra";
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

downloadAll().catch(console.error);

