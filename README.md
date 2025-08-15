# Media Backend (Node.js + MySQL)

A lightweight Node.js + Express backend for managing media assets with JWT auth, local file uploads, and **10‑minute signed streaming links**.

> **Assignment constraints (important):**
> - **Database must be created in MySQL Workbench** (only the *database*).  
> - **Do NOT create tables in Workbench** — the app auto-creates all tables on startup.  
> - **Testing is via Postman** using the provided collection & environment.  
> - Everything else (schema creation, routes, logic) lives in the **code files**.

---

## 🚀 What’s included
- JWT auth: `POST /auth/signup`, `POST /auth/login`
- Media: create/list/get/delete
- File upload to local `uploads/`
- Short‑lived stream URLs → `/media/:id/stream-url` ➜ `/stream/:id?token=...`
- View logging (`MediaViewLog`)
- Tables auto-created by code (`src/db.js` → `initSchema()`)

---

## ✅ Prerequisites
- Node.js 18+ (works on 22.x)
- MySQL 8.x + MySQL Workbench (Windows)
- VS Code (recommended)

---

## 🗄️ Create the database in **Workbench** (only the DB)
Open MySQL Workbench and run:
```sql
CREATE DATABASE IF NOT EXISTS media_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
> Don’t create any tables. The app will do it automatically on first run.

---

## ⚙️ Setup
1) Clone & install:
```bash
git clone <your-repo-url>
cd media-backend
npm install
```
2) Create `.env` (example):
```ini
PORT=3000
BASE_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=media_db

JWT_SECRET=supersecret_change_me
```
3) Run the API:
```bash
npm run dev
```
You should see:
```
✅ DB schema ready
API running at http://localhost:3000
```

---

## 🧪 Testing (Postman **only** for this assignment)
Use the ready-to-import **Postman collection** and **environment** (kept in the repo under `postman/`):
- `postman/Media_Backend_Local.postman_collection.json`
- `postman/Media_API_Local.postman_environment.json`

> If you don’t have them locally, download the copies from GitHub or import the files provided with this project hand‑in.

### Steps in Postman
1. **Import** both JSON files.  
2. Select the environment **“Media API Local”** (sets `{{base_url}} = http://localhost:3000`).  
3. **Signup (sets token)** → click **Send**. A test script stores `{{token}}` automatically.  
   - If the email already exists, use **Login (sets token)** instead.  
4. **Upload file (returns fileUrl)** → Body **form-data**, key `file` (type **File**) → choose any small MP4 (or any file). **Send**.  
   - The response includes `fileUrl`; a test script saves `{{fileUrl}}`.  
5. **Create media (uses fileUrl)** → **Send**. Saves `{{media_id}}`.  
6. **Get 10‑min stream URL** → **Send**, then open `streamUrl` in your browser.

> All requests use **Bearer {{token}}** auth from the environment.

---

## 🔌 API Endpoints (overview)
- `POST /auth/signup` → `{ token }`
- `POST /auth/login` → `{ token }`
- `POST /media` *(auth)* → create `{ title, type, fileUrl }`
- `POST /media/upload` *(auth)* → form‑data `file`
- `GET /media` → list
- `GET /media/:id` → one item
- `DELETE /media/:id` *(auth)* → delete
- `GET /media/:id/stream-url` → returns `{ streamUrl, expiresInSeconds }`
- `GET /stream/:id?token=...` → serves/redirects the file (token valid ~10 min)

---

## 🧱 How tables are created (code, not Workbench)
`src/db.js` runs `initSchema()` at boot to create:
- `AdminUser`
- `MediaAsset` (+ index on `type`)
- `MediaViewLog` (FK → `MediaAsset`, cascade delete)

No manual table creation in Workbench is required.

---

## 🩺 Troubleshooting
- **Can’t connect to DB**: ensure MySQL service is running; `.env` credentials & `DB_PORT` (usually `3306`).
- **401 Unauthorized**: token expired → run **Login** again.
- **Upload works but stream 404**: the saved `fileUrl` doesn’t point to a real file; confirm it exists under `uploads/` (the upload route saves there automatically).

---

## 📦 Scripts
- `npm run dev` — start with nodemon

---

## 📄 License
Add your preferred license (MIT recommended).
