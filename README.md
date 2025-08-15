# Media Backend (Node.js + MySQL)

Node.js + Express backend for managing media assets with JWT auth, local file uploads, **10‑minute signed streaming links**, and basic **analytics**.

> **Assignment constraints (important):**
> - **Create only the database in MySQL Workbench** (no tables).  
> - **Do NOT create tables in Workbench** — the app auto‑creates all tables on startup.  
> - **Testing must be done via Postman** using the provided collection & environment.  
> - Everything else (schema creation, routes, logic) lives in the **code files**.

---

## ✨ Features
- JWT auth: `POST /auth/signup`, `POST /auth/login`
- Media: create/list/get/delete
- File upload to local `uploads/`
- Short‑lived stream URLs → `/media/:id/stream-url` ➜ `/stream/:id?token=...`
- **Analytics**:
  - `POST /media/:id/view` → log a view (IP + timestamp)
  - `GET /media/:id/analytics` → `{ total_views, unique_ips, views_per_day }`
- View logging table: `MediaViewLog`
- Tables auto-created on boot (`src/db.js` → `initSchema()`)

---

## 🧰 Tech Stack
- **Node.js** + **Express**
- **MySQL** (`mysql2/promise`)
- **JWT** (`jsonwebtoken`), **bcryptjs**
- **multer** for file uploads
- **dotenv**, **cors**, **nodemon**

---

## 🗄️ Database (Workbench only)
Create the database **once** in MySQL Workbench:
```sql
CREATE DATABASE IF NOT EXISTS media_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
> Do **not** create any tables. The app creates/updates them automatically at startup.

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

## 🔐 Route Protection (JWT)
All `/media` routes are protected with JWT via `router.use(authRequired)` in `src/media.js`.  
Use `Authorization: Bearer <token>` for every request (Postman collection handles this automatically).

> If you later want some routes public (e.g., listing or stream-url), move those handlers **above** `router.use(authRequired)`.

---

## 🔌 API Reference

### Auth
#### `POST /auth/signup`
Body:
```json
{ "email": "admin@example.com", "password": "Passw0rd!" }
```
Response:
```json
{ "token": "..." }
```
#### `POST /auth/login` → `{ "token": "..." }`

---

### Uploads
#### `POST /media/upload` *(auth)*  
Form‑data: `file` (File).  
Response:
```json
{ "fileUrl": "uploads/yourfile_1712345678.mp4", "size": 12345, "originalName": "sample.mp4" }
```

---

### Media
#### `POST /media` *(auth)*
```json
{ "title": "My Clip", "type": "video", "fileUrl": "uploads/yourfile_1712345678.mp4" }
```
Returns created row.

#### `GET /media` *(auth)*  
List media (supports `?limit` & `?offset`).

#### `GET /media/:id` *(auth)*  
Fetch one item.

#### `DELETE /media/:id` *(auth)*  
Deletes the DB row (and removes the local file if it lives under `uploads/`).

---

### Streaming
#### `GET /media/:id/stream-url` *(auth)*  
Returns a short‑lived link:
```json
{
  "streamUrl": "http://localhost:3000/stream/1?token=...",
  "expiresInSeconds": 600,
  "type": "video"
}
```
#### `GET /stream/:id?token=...` *(no auth header; the token is in the URL)*  
- If `fileUrl` is local → serves the file.  
- If `fileUrl` is `http(s)` → redirects.

> Views are **not** logged here to avoid double counting. Use the dedicated `/view` endpoint below.

---

### Analytics
#### `POST /media/:id/view` *(auth)*  
Logs a view (captures client IP + timestamp).

#### `GET /media/:id/analytics` *(auth)*  
Example response:
```json
{
  "total_views": 4,
  "unique_ips": 2,
  "views_per_day": {
    "2025-08-15": 3,
    "2025-08-16": 1
  }
}
```

---

## 🧪 Testing in Postman (required for the assignment)
Import the **v2** Postman assets found in the repo under `/postman`:
- `postman/Media_Backend_Local_v2.postman_collection.json`
- `postman/Media_API_Local.postman_environment.json`

Steps:
1. Import both files into Postman.  
2. Select the environment **“Media API Local”** (sets `{{base_url}} = http://localhost:3000`).  
3. **Signup (sets token)** or **Login (sets token)** — token is saved to `{{token}}`.  
4. **Upload file (returns fileUrl)** — form‑data `file`. Saves `{{fileUrl}}`.  
5. **Create media (uses fileUrl)** — saves `{{media_id}}`.  
6. (Analytics) Send **Log view** a few times → `POST /media/{{media_id}}/view`.  
7. Get **Analytics** → `GET /media/{{media_id}}/analytics`.  
8. (Streaming) **Get 10‑min stream URL** and open in browser.

---

## 📁 Project Structure
```
media-backend/
  .env
  src/
    server.js
    db.js           # pool + initSchema() that creates tables on boot
    auth.js         # /auth/signup, /auth/login
    authRequired.js # JWT middleware
    media.js        # /media routes + /media/upload + /view + /analytics + stream handler
  uploads/          # created at runtime for local files
  postman/
    Media_Backend_Local_v2.postman_collection.json
    Media_API_Local.postman_environment.json
```

---

## 🧱 Tables (auto‑created in code)
- `AdminUser`
- `MediaAsset` (+ index on `type`)
- `MediaViewLog` (FK → `MediaAsset`, cascade delete; analytics indexes created automatically if missing)

---

## 🩺 Troubleshooting
- **DB connection errors**: ensure MySQL service is running; check `.env` and default `DB_PORT=3306`.
- **401 Unauthorized**: token expired/missing → login again.
- **Upload ok but stream 404**: saved `fileUrl` doesn’t exist relative to project root; verify path under `uploads/` or use a valid `http(s)` URL.
- **PowerShell uploads**: use `curl.exe` (not the PowerShell alias) for `-F` multipart.

---

## 📦 Scripts
- `npm run dev` — start with nodemon

---

