# ShortDoc — Sharof Rashidov nomidagi SamDU Elektron Hujjatlar Aylanishi Tizimi

ShortDoc — Samarqand davlat universitetida (SamDU) ichki bildirgilar, rasmiy kiruvchi/chiquvchi xatlar, rektor buyruqlari, fuqarolar murojaatlari va topshiriqlar harakatini to‘liq raqamlashtirish, elektron imzo (kelishuv) zanjirini tezlashtirish va ijro intizomini nazorat qilish platformasi.

---

## 🚀 Texnologik Stek
- **Backend**: **TypeScript (Node.js + Express)**
- **ORM & Ma’lumotlar bazasi**: **Prisma ORM** + **PostgreSQL 18**
- **Autentifikatsiya**: **JWT (JSON Web Tokens)**, Role-Based Access Control (RBAC), BCrypt
- **API Hujjatlashtirish**: **Swagger / OpenAPI** (`http://localhost:5000/api/docs`)
- **Frontend**: **Next.js 15 (React 19)**, TypeScript, Tailwind CSS, Lucide Icons
- **Fayllar xotirasi**: Xavfsiz mahalliy xotira (MIME type va hajm nazorati bilan)

---

## 🛠️ O‘rnatish va Ishga Tushirish

### 1. Talablar
- Node.js >= 20 (Kompyuterda v24.21.0 o‘rnatilgan)
- PostgreSQL 18 (`shortdoc_db` bazasi)

### 2. Backend (TypeScript) sozlash va ishga tushirish
```bash
cd D:\ShortDoc\backend
npm run dev
```
- API manzili: `http://localhost:5000`
- Swagger Docs: `http://localhost:5000/api/docs`

### 3. Frontend (Next.js) sozlash va ishga tushirish
```bash
cd D:\ShortDoc\frontend
npm run dev
```
Tizim brauzerda: `http://localhost:3000`

### 4. ⚡ Bir bosishda ishga tushirish (One-Click Launchers)
Loyiha ildizidagi `scripts/` papkasida tayyor skriptlar mavjud:
- **`scripts\run-all.bat`** — TypeScript Backend va Next.js Frontendni avtomatik ravishda bir vaqtda ishga tushiradi.
- **`scripts\build-and-start.bat`** — Kodlarni qayta yig‘ib (build qilib), ishlab chiqarish (production) rejimida ishga tushiradi.
- **`scripts\start-backend.bat`** — Faqat TypeScript Backend API ni ishga tushiradi.
- **`scripts\seed-db.bat`** — Bazani SamDU ma’lumotlari bilan to‘ldiradi.

---

## 🔐 Boshlang‘ich Foydalanuvchilar (Seed Data)
Boshlang‘ich foydalanuvchilar faqat CLI orqali (`npm run seed`) xavfsiz generatsiya qilinadi. Parollar `SEED_*_PASSWORD` muhit o‘zgaruvchilaridan olinadi yoki tasodifiy generatsiya qilinib, konsolga bir marta chiqariladi.

| Rol | Email | Lavozim |
|---|---|---|
| **Super Admin** | `admin@shortdoc.uz` | Bosh tizim administratori |
| **SamDU Rektori** | `rektor@shortdoc.uz` | Universitet Rektori |
| **Devonxona** | `devonxona@shortdoc.uz` | Devonxona mudiri |
| **IT Fakulteti Dekani** | `dekan@shortdoc.uz` | IT Fakulteti Dekani |
| **Matematika Dekani** | `matematika_dekan@shortdoc.uz` | Matematika fakulteti dekani |
| **Xodim / O‘qituvchi** | `xodim@shortdoc.uz` | Dasturiy injiniring kafedrasi dotsenti |
| **Murojaatlar mutaxassisi** | `talaba_murojaat@shortdoc.uz` | Fuqarolar murojaatlari bo‘limi inspektori |
