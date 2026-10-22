# ShortDoc — Sharof Rashidov nomidagi SamDU Elektron Hujjatlar Aylanishi Tizimi

**ShortDoc** — Samarqand davlat universitetida (SamDU) ichki bildirishnomalar, xizmat xatlari, rektor buyruqlari, arizalar, imzo (viza) zanjirini raqamlashtirish hamda topshiriqlar ijrosini nazorat qilish uchun mo‘ljallangan korporativ elektron hujjat aylanishi tizimi (EDMS).

---

## 🚀 Texnologik Stek

- **Backend:** Node.js (v20+ LTS), Express, TypeScript, Zod, JWT
- **ORM & Ma’lumotlar bazasi:** Prisma 5, PostgreSQL 16
- **Frontend:** Next.js 15 (App Router, React 19), Tailwind CSS, Lucide Icons
- **Real-time Bildirishnomalar:** Server-Sent Events (SSE) + 30s bir martalik Stream Ticket
- **Xavfsizlik:** Helmet CSP, CORS Whitelist, Express-Rate-Limit, Magic-Bytes MIME tekshiruvi, RFC 5987
- **Testlar:** Vitest, Supertest
- **Infratuzilma:** Docker, Docker Compose, Nginx Reverse Proxy, GitHub Actions CI

---

## 📋 Tizim Talablari

- **Node.js:** `>= 20.x` (LTS)
- **PostgreSQL:** `>= 16.x`
- **Docker & Docker Compose:** v2 (konteynerlar orqali ishga tushirish uchun)

---

## 🛠️ Lokal O‘rnatish va Ishga Tushirish

### 1. Repozitoriyni klonlash
```bash
git clone https://github.com/TheBude/ShortDoc.git
cd ShortDoc
```

### 2. Muhit o‘zgaruvchilarini sozlash
Loyiha ildizidagi `.env.example` dan `.env` faylini yarating:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```
> **Diqqat:** `JWT_SECRET` maydoniga kamida 32 belgidan iborat kuchli kalit yozing:
> `openssl rand -hex 32`

### 3. Backendni sozlash
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```
- Backend API manzili: `http://localhost:5000`
- Swagger / OpenAPI hujjatlari: `http://localhost:5000/api/docs`
- Tizim holati (Healthcheck): `http://localhost:5000/health`

### 4. Frontendni sozlash
Yangi terminalda:
```bash
cd frontend
npm install
npm run dev
```
- Frontend ilovasi: `http://localhost:3000`

---

## 🐳 Docker Compose Orqali Ishga Tushirish (Production)

To‘liq tizimni (PostgreSQL, Backend API, Frontend Next.js va Nginx) bitta buyruq bilan ishga tushirish:

```bash
# 1. Konteynerlarni yig'ish va ishga tushirish
docker compose up -d --build

# 2. Boshlang'ich SamDU ma'lumotlarini kiritish (Seed)
docker compose exec backend npm run seed:prod

# 3. Jurnallarni kuzatish
docker compose logs -f
```

---

## 🧪 Avtomatlashtirilgan Testlarni Ishga Tushirish

Backend xavfsizlik va integratsion testlari (Vitest + Supertest):
```bash
npm test --prefix backend
```

Barcha 31 ta majburiy integratsion testlar quyidagi sohalarni qamrab oladi:
- Autentifikatsiya (email case-insensitivity, faol bo'lmagan hisoblar, tokenVersion bekor qilinishi);
- RBAC va IDOR xavfsizlik matritsasi;
- Viza navbat zanjiri va State Machine ziddiyatlari (409 Conflict);
- Ro'yxat raqami parallel poygasidan himoya (`DocumentCounter`);
- Magic-bytes orqali soxta MIME fayllarini aniqlash va bloklash;
- Ommaviy tekshirishda (Public verify) maxfiy ma'lumotlar sizib chiqmasligi;
- Ochiq seed endpointi mavjud emasligi (404).

---

## 👥 Standart Rollar

| Rol | Izoh |
|---|---|
| **SUPER_ADMIN** | Barcha foydalanuvchilar, tizim parametrlari va audit jurnallari |
| **LEADERSHIP** | SamDU Rektorati, universitet miqyosidagi hujjatlar va tahliliy hisobotlar |
| **CHANCELLERY** | Devonxona va murojaatlar bo‘limi, ro‘yxat raqamlari berish va arxiv |
| **DEPARTMENT_HEAD**| Fakultet dekanlari, bo‘lim va kafedra mudirlari (o‘z bo‘limi nazorati) |
| **STAFF** | Professor-o‘qituvchilar va xodimlar (shaxsiy ijro topshiriqlari va bildirgilar) |

---

## 📚 Qo‘shimcha Hujjatlar
- [Tizim Arxitekturasi va Ruxsatlar Matritsasi](docs/ARCHITECTURE.md)
- [Production Joylashtirish Qo‘llanmasi](docs/DEPLOYMENT.md)
- [OpenAPI / Swagger Spetsifikatsiyasi](backend/src/swagger.ts)
