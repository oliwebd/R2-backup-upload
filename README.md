
# 📦 R2-backup-upload

A Node.js tool for **fast downloading and uploading** files from/to a Cloudflare R2 bucket with concurrency control.

## 🚀 Features
- Download all files from an R2 bucket quickly with parallel processing
- Upload all files to an R2 bucket with cache-control headers
- Stream files to avoid excessive memory usage
- Controlled concurrency for optimal speed and stability

## ⚙️ Installation

1. Clone the repository:
```bash
git clone git@github.com:oliwebd/R2-backup-upload.git .

```
Or use:
```bash
git clone git@github.com:oliwebd/R2-backup-upload.git
cd R2-backup-upload

```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root:
```env
# Your Cloudflare R2 Access Key
R2_ACCESS_KEY=your_access_key

# Your Cloudflare R2 Secret Key
R2_SECRET_KEY=your_secret_key

# Your Cloudflare Account ID (found in dashboard)
R2_ACCOUNT_ID=cf_account_id

# The name of your R2 bucket
R2_BUCKET=olimiah

# Local directory to store backups/downloaded files
LOCAL_BACKUP=./r2-backup/olimiah

# Concurrency level for uploads/downloads (higher = faster but uses more resources)
CONCURRENCY_SPEED=100
```

## 📂 Project Structure
```
.
├── src/
│   ├── download-r2.js      # Script to download all files from R2 bucket
│   ├── upload-r2.js        # Script to upload all files to R2 bucket
├── .env                    # Environment variables
├── package.json           # Project configuration
└── README.md              # This file
```

## 🛠 Usage

### Download from R2
```bash
npm run download
```

### Upload to R2
```bash
npm run upload
```

## ⚡ Performance
- Uses [`p-limit`](https://www.npmjs.com/package/p-limit) to handle concurrency for faster uploads/downloads.
- Streams files for memory efficiency.
- Concurrency level is configurable in the script.

## 📦 Dependencies
- `@aws-sdk/client-s3` — AWS S3 API for R2.
- `dotenv` — Environment variable management.
- `fs-extra` — File system utilities.
- `mime` — MIME type detection.
- `p-limit` — Concurrency control.

## 📝 License
ISC License © Oli Miah
