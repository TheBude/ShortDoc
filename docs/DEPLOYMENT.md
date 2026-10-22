# ShortDoc — Production O‘rnatish va Joylashtirish Qo‘llanmasi (Deployment Guide)

Ushbu qo‘llanma **ShortDoc** elektron hujjat aylanishi tizimini ishlab chiqarish (production) serverida (Ubuntu/Debian yoki boshqa Linux distrolarida) xavfsiz va barqaror ishga tushirish qadamlarini tushuntiradi.

---

## 1. Tizim Talablari
- **Operatsion tizim:** Ubuntu 22.04 LTS / 24.04 LTS (yoki zamonaviy Linux)
- **Dasturlar:** Docker 24+ va Docker Compose v2
- **Dasturlash tili:** Node.js 20.x yoki 22.x LTS (lokal/to‘g‘ridan-to‘g‘ri ishga tushirish uchun)
- **Ma’lumotlar bazasi:** PostgreSQL 16+
- **Minimal apparat resurslari:** 2 CPU Cores, 4 GB RAM, 25 GB SSD

---

## 2. Xavfsiz Parollar va JWT Sirini Yaratish

Hech qachon zaxira yoki standart kalitlardan foydalanmang. Server terminalida quyidagi buyruq orqali 64 belgili (256-bit) kriptografik kuchli kalitlarni yarating:

```bash
# Kuchli JWT_SECRET generatsiyasi (kamida 32 belgi shart)
openssl rand -hex 32

# PostgreSQL paroli uchun
openssl rand -hex 24
```

---

## 3. Muhit O‘zgaruvchilarini Sozlash (`.env`)

Loyiha ildizida `.env.example` faylidan nusxa olib `.env` faylini yarating:

```bash
cp .env.example .env
nano .env
```

Quyidagi parametrlarni o‘zgartiring:
```env
# PostgreSQL Ma'lumotlar Bazasi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yuqorida_generatsiya_qilingan_kuchli_baza_paroli
POSTGRES_DB=shortdoc_db
DATABASE_URL=postgresql://postgres:yuqorida_generatsiya_qilingan_kuchli_baza_paroli@postgres:5432/shortdoc_db?schema=public

# Backend API Konfiguratsiyasi
NODE_ENV=production
PORT=5000
JWT_SECRET=yuqorida_openssl_bilan_yaratilgan_kamida_32_belgili_jwt_kaliti
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://doc.samdu.uz
APP_URL=https://doc.samdu.uz
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=25

# Seed Konfiguratsiyasi (ixtiyoriy)
SEED_ALLOW=true
SEED_ADMIN_PASSWORD=admin_uchun_kuchli_parol

# Frontend Konfiguratsiyasi
NEXT_PUBLIC_API_URL=
BACKEND_INTERNAL_URL=http://backend:5000
```

---

## 4. Docker Compose Orqali Ishga Tushirish

Docker Compose orqali butun tizim (PostgreSQL, Backend API, Frontend Next.js va Nginx) bitta buyruq bilan to‘liq ishga tushiriladi:

```bash
# 1. Konteynerlarni yig'ish va fonda ishga tushirish
docker compose up -d --build

# 2. Servislarning holatini tekshirish
docker compose ps

# 3. Backend jurnallarini (log) kuzatish
docker compose logs -f backend
```

> **Eslatma:** Backend konteyneri ishga tushishi bilan birinchi bo‘lib `npx prisma migrate deploy` buyrug‘ini avtomatik bajaradi va jadvallarni eng so‘nggi holatga keltiradi.

---

## 5. Dastlabki Ma'lumotlarni Kiritish (Seed)

Tizim yangi o‘rnatilganda universitet bo‘limlari va namunaviy foydalanuvchilarni bazaga kiritish uchun ishlab chiqarish seed skriptini ishlating:

```bash
# Docker orqali seed qilish
docker compose exec backend npm run seed:prod
```

Konsolda foydalanuvchilar va parollar faqat bir marta chiqariladi. Ularni xavfsiz joyga saqlang.

---

## 6. Nginx va SSL / TLS (HTTPS) Sertifikatini O‘rnatish

Productionda barcha so‘rovlar shifrlangan HTTPS orqali o‘tishi shart.

1. Domen nomini server IP siga yo‘naltiring (`doc.samdu.uz` -> Server IP).
2. **Certbot** orqali bepul Let's Encrypt SSL sertifikatini oling:
```bash
sudo apt update && sudo apt install -y certbot
sudo certbot certonly --standalone -d doc.samdu.uz
```
3. Olingan sertifikatlarni `./nginx/certs/` papkasiga nusxalang:
```bash
mkdir -p ./nginx/certs
sudo cp /etc/letsencrypt/live/doc.samdu.uz/fullchain.pem ./nginx/certs/
sudo cp /etc/letsencrypt/live/doc.samdu.uz/privkey.pem ./nginx/certs/
sudo chown -R $USER:$USER ./nginx/certs
```
4. `docker-compose.yml` va `nginx/nginx.conf` ichidagi 443 (SSL) qatorlarini izohdan chiqaring va Nginx konteynerini qayta ishga tushiring:
```bash
docker compose restart nginx
```

---

## 7. Ma'lumotlar Bazasini Zaxiralash (Backup) Strategiyasi

Har kuni tunda avtomatik zaxira nusxa yaratish uchun Linux `cron` vazifasini qo‘shing:

```bash
crontab -e
```

Quyidagi qatorni qo‘shing (har kuni soat 03:00 da zaxira oladi):
```bash
0 3 * * * docker compose -f /path/to/shortdoc/docker-compose.yml exec -T postgres pg_dump -U postgres shortdoc_db | gzip > /var/backups/shortdoc_db_$(date +\%F).sql.gz
```

---

## 8. Tizim Holati va Monitoring

- **API Healthcheck:** `https://doc.samdu.uz/health` yoki `curl http://localhost:5000/health`
  - Javob formati: `{"status":"ok","service":"ShortDoc University API", ...}`
- **OpenAPI / Swagger hujjatlari:** `https://doc.samdu.uz/api/docs`
