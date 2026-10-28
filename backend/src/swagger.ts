export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ShortDoc University Document Management API',
    version: '1.0.0',
    description: 'Sharof Rashidov nomidagi Samarqand davlat universiteti (SamDU) uchun elektron hujjat aylanishi va ijro intizomi tizimi REST API hujjatlari',
    contact: {
      name: 'SamDU Raqamli ta’lim texnologiyalari markazi',
      email: 'support@shortdoc.uz',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Lokal ishlab chiqish serveri',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT tokenni "Bearer <token>" shaklida yuboring',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    // ==========================================
    // 1. AUTENTIFIKATSIYA
    // ==========================================
    '/api/auth/login': {
      post: {
        summary: 'Tizimga kirish (Login)',
        tags: ['Autentifikatsiya'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@shortdoc.uz' },
                  password: { type: 'string', example: 'Admin123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Muvaffaqiyatli kirish va JWT token qaytishi' },
          401: { description: 'Email yoki parol noto‘g‘ri' },
          403: { description: 'Hisob faol emas yoki tasdiqlanmagan' },
          429: { description: 'Urinishlar soni oshib ketdi (Rate limit)' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'Yangi foydalanuvchi ro‘yxatdan o‘tishi',
        tags: ['Autentifikatsiya'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password', 'position'],
                properties: {
                  fullName: { type: 'string', example: 'Aliyev Vali G‘aniyevich' },
                  email: { type: 'string', example: 'vali.aliyev@shortdoc.uz' },
                  password: { type: 'string', example: 'StrongPass123!' },
                  departmentId: { type: 'string', format: 'uuid' },
                  position: { type: 'string', example: 'Kafedra dotsenti' },
                  phone: { type: 'string', example: '+998901234567' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Ariza qabul qilindi (Admin tasdig‘i kutilmoqda)' },
          400: { description: 'Noto‘g‘ri ma’lumotlar' },
          409: { description: 'Email band qilingan' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Joriy foydalanuvchi ma’lumotlari',
        tags: ['Autentifikatsiya'],
        responses: {
          200: { description: 'Foydalanuvchi profili, roli va bo‘limi' },
          401: { description: 'Avtorizatsiyadan o‘tilmagan' },
        },
      },
    },
    '/api/auth/check-email': {
      get: {
        summary: 'Email bandligini tekshirish (Real-time)',
        tags: ['Autentifikatsiya'],
        security: [],
        parameters: [
          { name: 'email', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: '{ available: boolean }' },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        summary: 'Parolni o‘zgartirish (Eski sessiyalarni bekor qilish bilan)',
        tags: ['Autentifikatsiya'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Parol yangilandi va yangi token berildi' },
          400: { description: 'Joriy parol noto‘g‘ri yoki yangi parol talabga javob bermaydi' },
        },
      },
    },
    '/api/auth/stream-ticket': {
      post: {
        summary: 'SSE xavfsiz bildirishnomalar oqimi uchun bir martalik chipta (Ticket)',
        tags: ['Autentifikatsiya'],
        responses: {
          200: { description: '30 soniyalik bir martalik ticket qaytariladi' },
        },
      },
    },

    // ==========================================
    // 2. HUJJATLAR (DOCUMENTS)
    // ==========================================
    '/api/documents': {
      get: {
        summary: 'Hujjatlar ro‘yxati (RBAC/IDOR himoyalangan, filtrlash va sahifalash bilan)',
        tags: ['Hujjatlar'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'documentType', in: 'query', schema: { type: 'string', enum: ['INCOMING', 'OUTGOING', 'INTERNAL'] } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 15 } },
        ],
        responses: {
          200: { description: 'Hujjatlar ro‘yxati va sahifalash metama’lumotlari' },
        },
      },
      post: {
        summary: 'Yangi hujjat ro‘yxatga olish / yaratish',
        tags: ['Hujjatlar'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'documentType'],
                properties: {
                  title: { type: 'string' },
                  documentType: { type: 'string', enum: ['INCOMING', 'OUTGOING', 'INTERNAL'] },
                  category: { type: 'string', example: 'BILDIRGI' },
                  sender: { type: 'string' },
                  receiver: { type: 'string' },
                  departmentId: { type: 'string', format: 'uuid' },
                  assigneeId: { type: 'string', format: 'uuid' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                  deadline: { type: 'string', format: 'date-time' },
                  summary: { type: 'string' },
                  reviewerIds: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Kelishuvchilar (ketma-ket)' },
                  signerId: { type: 'string', format: 'uuid', description: 'Imzolovchi: kelishuvchilar tasdiqlagach xabar oladi' },
                  approverIds: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Eski format: oxirgisi imzolovchi' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Hujjat yaratildi va atomik noyob ro‘yxat raqami berildi' },
        },
      },
    },
    '/api/documents/{id}': {
      get: {
        summary: 'Hujjat tafsilotlari (Ruxsat tekshiruvi bilan)',
        tags: ['Hujjatlar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Hujjat, vizalar, fayllar va topshiriqlar' },
          403: { description: 'Kirish huquqi yo‘q (IDOR)' },
          404: { description: 'Hujjat topilmadi' },
        },
      },
    },
    '/api/documents/{id}/status': {
      patch: {
        summary: 'Hujjat holatini o‘zgartirish (State Machine bilan)',
        tags: ['Hujjatlar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['NEW', 'REGISTERED', 'IN_REVIEW', 'IN_APPROVAL', 'IN_EXECUTION', 'COMPLETED', 'REJECTED', 'ARCHIVED'] },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Holat muvaffaqiyatli yangilandi' },
          409: { description: 'Ruxsat etilmagan holat o‘tishi (Conflict)' },
        },
      },
    },
    '/api/documents/{id}/docx': {
      get: {
        summary: 'Hujjatni rasmiy Word (.docx) formatida yuklab olish',
        tags: ['Hujjatlar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Word hujjati binary oqimi' },
        },
      },
    },
    '/api/documents/{id}/public-verify': {
      get: {
        summary: 'QR-kod orqali ommaviy haqiqiylikni tekshirish (Token talab etilmaydi)',
        tags: ['Hujjatlar'],
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Hujjat haqiqiyligi va ochiq viza ma’lumotlari' },
          404: { description: 'Hujjat topilmadi yoki haqiqiy emas' },
        },
      },
    },
    '/api/documents/{id}/approvals': {
      post: {
        summary: 'Viza (Kelishuv) berish (Qat’iy navbat va bir martalik imzo bilan)',
        tags: ['Hujjatlar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                  comments: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Viza qabul qilindi' },
          403: { description: 'Navbat yetib kelmagan yoki allaqachon imzolangan' },
        },
      },
    },
    '/api/documents/{id}/comments': {
      post: {
        summary: 'Hujjatga ichki xizmat izohi qo‘shish',
        tags: ['Hujjatlar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['comment'],
                properties: { comment: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Izoh muvaffaqiyatli saqlandi' },
        },
      },
    },

    // ==========================================
    // 3. TOPSHIRIQLAR (TASKS)
    // ==========================================
    '/api/tasks': {
      get: {
        summary: 'Topshiriqlar ro‘yxati (Sahifalash va filtrlash bilan)',
        tags: ['Topshiriqlar'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 15 } },
        ],
        responses: { 200: { description: 'Topshiriqlar ro‘yxati' } },
      },
      post: {
        summary: 'Hujjat asosida topshiriq biriktirish',
        tags: ['Topshiriqlar'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['documentId', 'title', 'assignedToId'],
                properties: {
                  documentId: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  assignedToId: { type: 'string', format: 'uuid' },
                  deadline: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Topshiriq yaratildi' } },
      },
    },
    '/api/tasks/{id}/status': {
      patch: {
        summary: 'Topshiriq holatini o‘zgartirish',
        tags: ['Topshiriqlar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Holat yangilandi' } },
      },
    },
    '/api/tasks/{id}/submit-result': {
      post: {
        summary: 'Mas’ul ijrochi tomonidan topshiriq natijasini topshirish',
        tags: ['Topshiriqlar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resultComment'],
                properties: {
                  resultComment: { type: 'string' },
                  resultFileUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Topshiriq muvaffaqiyatli yakunlandi' } },
      },
    },

    // ==========================================
    // 4. FAYLLAR (DOCUMENT FILES)
    // ==========================================
    '/api/document-files/upload': {
      post: {
        summary: 'Hujjatga fayl yuklash (Magic-bytes MIME tekshiruvi bilan)',
        tags: ['Fayllar'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['documentId', 'file'],
                properties: {
                  documentId: { type: 'string', format: 'uuid' },
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Fayl muvaffaqiyatli yuklandi' },
          400: { description: 'Fayl formati noto‘g‘ri yoki soxta MIME' },
          413: { description: 'Fayl hajmi 25MB dan katta' },
        },
      },
    },
    '/api/document-files/{id}/download': {
      get: {
        summary: 'Faylni xavfsiz yuklab olish (Ruxsat va RFC 5987 sarlavhasi bilan)',
        tags: ['Fayllar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Fayl binary oqimi' },
          403: { description: 'Hujjat fayliga kirish huquqi yo‘q' },
        },
      },
    },
    '/api/document-files/{id}': {
      delete: {
        summary: 'Faylni o‘chirish (Faqat fayl egasi yoki Admin)',
        tags: ['Fayllar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Fayl bazadan va diskdan o‘chirildi' },
          403: { description: 'O‘chirish huquqi yo‘q' },
        },
      },
    },

    // ==========================================
    // 5. FOYDALANUVCHILAR (USERS)
    // ==========================================
    '/api/users': {
      get: {
        summary: 'Foydalanuvchilar ro‘yxati (Sahifalash va maxfiylik filtri bilan)',
        tags: ['Foydalanuvchilar'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Foydalanuvchilar ro‘yxati' } },
      },
      post: {
        summary: 'Yangi xodim qo‘shish (SuperAdmin)',
        tags: ['Foydalanuvchilar'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password', 'role', 'position'],
                properties: {
                  fullName: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  role: { type: 'string', enum: ['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY', 'DEPARTMENT_HEAD', 'STAFF'] },
                  position: { type: 'string' },
                  departmentId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Foydalanuvchi yaratildi' } },
      },
    },
    '/api/users/{id}/approve': {
      patch: {
        summary: 'Ro‘yxatdan o‘tgan foydalanuvchini tasdiqlash / faollashtirish',
        tags: ['Foydalanuvchilar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Foydalanuvchi hisobi faollashtirildi' } },
      },
    },

    // ==========================================
    // 6. BO‘LIMLAR (DEPARTMENTS)
    // ==========================================
    '/api/departments': {
      get: {
        summary: 'Bo‘limlar va fakultetlar ro‘yxati',
        tags: ['Bo‘limlar'],
        responses: { 200: { description: 'Bo‘limlar ro‘yxati' } },
      },
      post: {
        summary: 'Yangi bo‘lim yoki fakultet qo‘shish',
        tags: ['Bo‘limlar'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'code'],
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string' },
                  type: { type: 'string', enum: ['RECTORATE', 'FACULTY', 'CHANCELLERY', 'DEPARTMENT', 'DIVISION', 'INSTITUTE', 'CHAIR', 'CENTER'] },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Bo‘lim yaratildi' } },
      },
    },

    // ==========================================
    // 7. HISOBOTLAR (REPORTS)
    // ==========================================
    '/api/reports/dashboard': {
      get: {
        summary: 'Dashboard ko‘rsatkichlari (RBAC bo‘yicha shaxsiy/umumiy statistika)',
        tags: ['Hisobotlar'],
        responses: { 200: { description: 'Bosh sahifa ko‘rsatkichlari' } },
      },
    },
    '/api/reports/export-excel': {
      get: {
        summary: 'Hujjatlar reyestrini chiroyli formatlangan Excel (.xlsx) sifatida yuklab olish',
        tags: ['Hisobotlar'],
        parameters: [
          { name: 'documentType', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Excel fayl oqimi' } },
      },
    },

    // ==========================================
    // 8. BILDIRISHNOMALAR (NOTIFICATIONS)
    // ==========================================
    '/api/notifications': {
      get: {
        summary: 'Foydalanuvchining bildirishnomalari ro‘yxati',
        tags: ['Bildirishnomalar'],
        responses: { 200: { description: 'Bildirishnomalar ro‘yxati' } },
      },
    },
    '/api/notifications/stream': {
      get: {
        summary: 'Real-time SSE bildirishnomalar oqimi (Chipta yoki Authorization sarlavhasi bilan)',
        tags: ['Bildirishnomalar'],
        parameters: [{ name: 'ticket', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'text/event-stream oqimi' } },
      },
    },
    '/api/notifications/{id}/read': {
      patch: {
        summary: 'Bildirishnomani o‘qilgan deb belgilash',
        tags: ['Bildirishnomalar'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Holat yangilandi' } },
      },
    },
    '/api/notifications/read-all': {
      patch: {
        summary: 'Barcha bildirishnomalarni o‘qilgan deb belgilash',
        tags: ['Bildirishnomalar'],
        responses: { 200: { description: 'Barcha bildirishnomalar o‘qildi' } },
      },
    },
  },
};
