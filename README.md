# ShortDoc — Universitet Hujjatlar Aylanishi Tizimi

ShortDoc — Oliy ta'lim muassasalarida ichki va tashqi hujjatlar harakatini raqamlashtirish, viza yig'ish jarayonini tezlashtirish va ijro intizomini to'liq nazorat qilish platformasi.

---

## 🚀 Texnologik Stek
- **Backend**: **C# (ASP.NET Core 8 Web API)**
- **ORM & Ma'lumotlar bazasi**: **Entity Framework Core (EF Core 8)** + **PostgreSQL 18**
- **Autentifikatsiya**: **JWT (JSON Web Tokens)**, Role-Based Access Control (RBAC), BCrypt
- **API Hujjatlashtirish**: **Swagger / OpenAPI** (`http://localhost:5000/api/docs`)
- **Frontend**: **Next.js 15 (React 19)**, TypeScript, Tailwind CSS, Lucide Icons
- **Fayllar xotirasi**: Xavfsiz mahalliy xotira (MIME type va hajm nazorati bilan)

---

## 🛠️ O'rnatish va Ishga Tushirish

### 1. Talablar
- .NET 8 SDK (Kompyuterda o‘rnatildi)
- Node.js >= 20 (Kompyuterda v24.21.0 o'rnatilgan)
- PostgreSQL 18 (`shortdoc_db` bazasi mavjud)

### 2. Backend (C#) sozlash va ishga tushirish
```bash
cd D:\ShortDoc\backend
dotnet run
```
API manzili: `http://localhost:5000`
Swagger Docs: `http://localhost:5000/api/docs`

### 3. Frontend sozlash va ishga tushirish
```bash
cd D:\ShortDoc\frontend
npm start   # Tezkor ishlab chiqarish (production) rejimi
# yoki: npm run dev  (Dasturlash / test rejimi)
```
Tizim brauzerda: `http://localhost:3000`

### 4. ⚡ Bir bosishda ishga tushirish (One-Click Launchers)
Loyiha ildizidagi `scripts/` papkasida tayyor skriptlar mavjud:
- **`scripts\run-all.bat`** — C# Backend va Next.js Frontendni avtomatik ravishda optimal rejimda ishga tushiradi.
- **`scripts\build-and-start.bat`** — Kodlarni qayta yig'ib (build qilib), yuqori tezlikdagi ishlab chiqarish rejimida ishga tushiradi.
- **`scripts\start-backend.bat`** — Faqat C# Web API ni ishga tushiradi.

---

## 🔐 Boshlang'ich Foydalanuvchilar (Seed Data)
| Rol | Email | Parol | Tavsif |
|---|---|---|---|
| **Super Admin** | `admin@shortdoc.uz` | `Admin123!` | Tizim ma'muri |
| **Rektorat** | `rektor@shortdoc.uz` | `Rektor123!` | Rahbariyat dashboardi |
| **Devonxona** | `devonxona@shortdoc.uz` | `Devon123!` | Ro'yxatga oluvchi |
| **Dekan** | `dekan@shortdoc.uz` | `Dekan123!` | Bo'lim rahbari (viza qo'yuvchi) |
| **Xodim** | `xodim@shortdoc.uz` | `Xodim123!` | Oddiy o'qituvchi/ijrochi |
