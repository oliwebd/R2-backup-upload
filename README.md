# 📦 R2Sync

A CLI tool for **backup and upload** files from/to a Cloudflare R2 bucket with concurrency, streaming, and low memory usage.

## 🚀 Features
- Download or backup all files from an R2 bucket quickly with parallel processing
- Upload all files to an R2 bucket with cache-control headers
- Stream files to avoid excessive memory usage
- Controlled concurrency for optimal speed and stability

## ⚙️ Installation
If you want to use the r2sync command directly from your terminal in any project directory (which is typical for a CLI utility), use the global install flag:
1. Installation:
```bash
npm install -g r2sync
```

3. Run setup to configure:
```bash
r2sync setup
```

## 📂 Project Structure
```
.
├── src/
│   ├── cli.js             # CLI command handler
│   ├── setup.js           # Setup wizard
│   ├── config.js          # Config loader
│   ├── download-r2.js     # Script to download from R2
│   ├── upload-r2.js       # Script to upload to R2
├── package.json
└── README.md
```

## 🛠 Usage

### General Usage [Examples]
```bash
r2sync download --local ./r2/to-backup-folder
r2sync upload --local ./r2/from-upload-folder
```

### Commands:
- **upload** — Upload files from local to R2
- **download** — Download files from R2 to local

### Examples:
```bash
r2sync upload
r2sync upload --local ./static/storage
r2sync upload --remote r2-folder --local ./my-local-folder
npx r2sync download
npx r2sync download --local ./static/storage
npx r2sync download --remote r2-folder --local ./my-local-folder
```

### 📂 Default Local Storage

If `--local` is not provided, defaults to:
```
r2-backup/BUCKET_NAME_YYYY-MM-DD
```

## ⚡ Performance
- Uses [`p-limit`](https://www.npmjs.com/package/p-limit) for controlled concurrency
- Streams files for low memory usage
- Configurable concurrency speed

## 📦 Dependencies
- `@aws-sdk/client-s3`
- `fs-extra`
- `mime`
- `p-limit`

## 📝 License
ISC License
