# ShortDoc — Tizim Arxitekturasi va Texnik Hujjat

## 1. Umumiy Ma'lumot
ShortDoc — Oliy ta'lim muassasalarida kiruvchi, chiquvchi va ichki hujjatlarni (xizmat xatlari, bildirgi, imzo yig'ish, buyruq loyihalari) boshqarish hamda topshiriqlar ijrosini nazorat qilish uchun mo'ljallangan markazlashgan tizim.

## 2. Loyiha Tuzilmasi
```text
D:\ShortDoc\
├── frontend\          # Next.js 15/16 + TypeScript + Tailwind CSS (Admin Panel & Client)
├── backend\           # REST API (Autentifikatsiya, Rollar, Hujjatlar, Ijro nazorati, Fayllar)
├── docs\              # Texnik hujjatlar va arxitektura diagrammalari
├── scripts\           # Baza va tizimni boshqarish skriptlari
├── .gitignore         # Git e'tiborsiz qoldiradigan fayllar
├── .env.example       # Konfiguratsiya namunasi
└── README.md          # Ishga tushirish yo'riqnomasi
```

## 3. Foydalanuvchi Rollari va Ruxsatlar Matritsasi
1. **Super Admin**: Foydalanuvchilar, rollar, bo'limlar, tizim jurnallari (Audit Logs).
2. **Rektorat (Universitet rahbariyati)**: Umumiy dashboard, statistika, ijro intizomi monitoringi, kechikayotgan topshiriqlar.
3. **Devonxona (Chancellery)**: Kiruvchi/chiquvchi hujjatlarni ro'yxatga olish, ro'yxat raqami berish, ijrochiga biriktirish.
4. **Bo'lim rahbari (Dekan / Kafedra mudiri)**: O'z bo'limi hujjatlarini ko'rish, xodimlarga yo'naltirish, imzo qo'yish (kelishish).
5. **Oddiy xodim (Professor-o'qituvchi / xodim)**: O'ziga biriktirilgan hujjatlarni ko'rish, ijro holatini yangilash, javob faylini yuklash.

## 4. Hujjat Holatlari (Lifecycle)
- `NEW` (Yangi)
- `REGISTERED` (Ro'yxatga olingan)
- `IN_REVIEW` (Ko'rib chiqilmoqda)
- `IN_APPROVAL` (Kelishuvda / Imzo yig'ilmoqda)
- `IN_EXECUTION` (Ijroda)
- `COMPLETED` (Bajarilgan)
- `REJECTED` (Rad etilgan)
- `ARCHIVED` (Arxivlangan)
