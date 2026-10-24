# 🚀 SamDU ShortDoc — Ishlab chiqarishga (Production) Deploy qilish Qo‘llanmasi

Ushbu qo‘llanma **Samarqand Davlat Universiteti (SamDU) ShortDoc** elektron hujjat aylanishi tizimini real serverga (VPS/VDS yoki mahalliy serverga) xavfsiz va to‘g‘ri deploy qilish uchun mo‘ljallangan.

---

## 📋 Serverga qo‘yiladigan talablar

- **OS:** Ubuntu 22.04 LTS / 24.04 LTS yoki Debian 12
- **CPU:** Kamida 2 yadro (tavsiya: 4 yadro)
- **RAM:** Kamida 4 GB (tavsiya: 8 GB)
- **Disk:** Kamida 25 GB SSD/NVMe
- **Dasturlar:** Docker & Docker Compose (yoki Node.js 20+, PostgreSQL 16)

---

## 1-USUL: Docker orqali Deploy qilish (Tavsiya etiladi — Eng oson va xavfsiz)

Docker yordamida barcha servislar (PostgreSQL bazasi, Backend API va Frontend Next.js) avtomatik ravishda ajratilgan konteynerlarda bir buyruq bilan ishga tushadi.

### 1.1. Serverga Docker o‘rnatish:
```bash
# Paketlarni yangilash
sudo apt update && sudo apt upgrade -y

# Docker va Docker Compose plaginini o‘rnatish
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose-plugin
```

### 1.2. Loyihani yuklab olish:
```bash
git clone https://github.com/TheBude/ShortDoc.git
cd ShortDoc
```

### 1.3. Muhit o‘zgaruvchilarini (`.env`) sozlash:
```bash
cp .env.example .env
nano .env
```
Quyidagi qiymatlarni o‘zgartiring:
- `POSTGRES_PASSWORD`: Murakkab maxfiy parol kiriting.
- `JWT_SECRET`: 64 belgili tasodifiy xavfsiz kalit kiriting.
- `CORS_ORIGIN`: Serveringiz domeni yoki IP manzili (masalan: `https://doc.samdu.uz`).
- `APP_URL`: QR-kodlar uchun sayt manzili (masalan: `https://doc.samdu.uz`).

### 1.4. Tizimni ishga tushirish:
```bash
# Barcha konteynerlarni qurish va ishga tushirish
docker compose up -d --build

# Boshlang'ich universitet ma'lumotlarini (rektorat, kafedralar, foydalanuvchilar) bazaga kiritish (Seed):
docker compose exec backend npm run seed
```

### 1.5. Holatni tekshirish:
```bash
docker compose ps
docker compose logs -f
```

Endi sayt `http://server_ip:3000` manzilida, API esa `http://server_ip:5000` manzilida ishlaydi!

---

## 2-USUL: PM2 va Nginx orqali Deploy qilish (Standart usul)

Agar serverda Docker ishlatmasdan to‘g‘ridan-to‘g‘ri Node.js va PostgreSQL orqali ishlatmoqchi bo‘lsangiz:

### 2.1. Node.js va PM2 o‘rnatish:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2
```

### 2.2. PostgreSQL da baza va foydalanuvchi yaratish:
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE shortdoc_db;
CREATE USER shortdoc_user WITH ENCRYPTED PASSWORD 'MurakkabParol2026';
GRANT ALL PRIVILEGES ON DATABASE shortdoc_db TO shortdoc_user;
\q
```

### 2.3. Loyihani qurish (Build):
```bash
cd /var/www/ShortDoc

# Backend
cd backend
cp .env.example .env
# .env faylida DATABASE_URL ni sozlang:
# DATABASE_URL="postgresql://shortdoc_user:MurakkabParol2026@localhost:5432/shortdoc_db?schema=public"

npm ci
npx prisma generate
npx prisma db push
npm run seed
npm run build
cd ..

# Frontend
cd frontend
npm ci
npm run build
cd ..
```

### 2.4. PM2 orqali fon jarayonlarini boshqarish:
```bash
# Backendni ishga tushirish
pm2 start backend/dist/index.js --name "shortdoc-backend"

# Frontend Next.js ni ishga tushirish
pm2 start "npm run start --prefix frontend" --name "shortdoc-frontend"

# Server o‘chib yonganda avtomatik qayta yoqilishini sozlash
pm2 save
pm2 startup
```

---

## 3. Nginx va Bepul SSL (HTTPS) Sozlash

Saytingizga xavfsiz `https://` protokoli orqali kirish uchun Nginx sozlamalari:

### 3.1. Nginx konfiguratsiyasi:
`/etc/nginx/sites-available/shortdoc` faylini oching:
```nginx
server {
    listen 80;
    server_name doc.samdu.uz; # O'z domeningizni yozing

    client_max_body_size 35M;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Healthcheck
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
    }
}
```

Faollashtirish:
```bash
sudo ln -s /etc/nginx/sites-available/shortdoc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.2. Bepul Let's Encrypt SSL sertifikatini olish:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d doc.samdu.uz
```

---

## 4. Tizim Administratori Ma'lumotlari (Seed)

`npm run seed` quyidagi boshlang'ich foydalanuvchilarni yaratadi: `admin@shortdoc.uz`, `rektor@shortdoc.uz`,
`devonxona@shortdoc.uz`, `dekan@shortdoc.uz`, `xodim@shortdoc.uz` va boshqalar.

Parollar kodda yozilmagan:
- `SEED_ADMIN_PASSWORD`, `SEED_REKTOR_PASSWORD`, `SEED_DEVON_PASSWORD`, `SEED_DEKAN_PASSWORD`, `SEED_XODIM_PASSWORD`
  o'zgaruvchilari berilsa, shu qiymatlar ishlatiladi;
- berilmasa, tasodifiy parol yaratilib, seed jurnaliga **bir marta** chiqariladi.

Production'da seed faqat `SEED_ALLOW=true` bo'lganda ishlaydi. Production deploy skripti (`prisma:deploy`) asosiy
`admin@shortdoc.uz` hisobi yo'q bo'lsa uni yaratadi: `SEED_ADMIN_PASSWORD` berilmasa tasodifiy parol jurnalga bir marta
chiqariladi.

> ⚠️ **MUHIM:** Tizimni ommaviy ishga tushirishdan oldin administrator parolini darhol almashtiring!

---

## 5. Render (Backend + Baza) va Vercel (Frontend) orqali Deploy

### 5.1. Render — Backend
| O'zgaruvchi | Qiymat |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render PostgreSQL ning **Internal** ulanish manzili |
| `JWT_SECRET` | kamida 32 belgili tasodifiy kalit (`openssl rand -hex 32`) |
| `CORS_ORIGIN` | Vercel domeni, masalan `https://shortdoc.vercel.app` (vergul bilan bir nechta) |
| `APP_URL` | Vercel domeni (QR-kodlardagi tekshiruv havolasi uchun) |
| `SEED_ADMIN_PASSWORD` | (ixtiyoriy) administrator boshlang'ich paroli |

- Build: `npm ci && npx prisma generate && npm run build`, Start: `npm run prisma:deploy && npm start`.
- Health check yo'li: `/health`.
- Bazaga ulanish soni cheklangan bo'lsa `DATABASE_URL` oxiriga `&connection_limit=5` qo'shing.

### 5.2. Vercel — Frontend
- Root Directory: `frontend`.
- `NEXT_PUBLIC_API_URL` = `https://<render-backend>.onrender.com` (SSE real-time oqimi to'g'ridan-to'g'ri backendga ulanishi shart;
  Vercel rewrite orqali SSE ishlamaydi).

### 5.3. Cheklovlar
- **Yuklangan fayllar:** Render'ning bepul/standart xizmatlarida disk vaqtinchalik — har deploy yoki qayta ishga tushirishda
  `uploads/` papkasi tozalanadi. Doimiy saqlash uchun Render **Persistent Disk** ulang (`UPLOAD_DIR` ni disk yo'liga
  yo'naltiring) yoki S3-mos obyekt saqlash xizmatiga o'ting.
- **Bepul reja:** Backend 15 daqiqa harakatsizlikdan keyin uxlaydi, birinchi so'rov 30–60 soniya olishi mumkin; uxlab turgan
  paytda real-time (SSE) va soatlik cron (muddati o'tgan topshiriqlar) ishlamaydi.

---

## 6. Zaxira nusxa (Backup) olish

PostgreSQL bazasining zaxira nusxasini muntazam saqlab borish uchun:
```bash
# Zaxira nusxa olish (Dump)
docker compose exec postgres pg_dump -U postgres shortdoc_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Qayta tiklash (Restore)
cat backup_fayl.sql | docker compose exec -T postgres psql -U postgres shortdoc_db
```
