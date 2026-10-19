export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ShortDoc University Document Management API',
    version: '1.0.0',
    description: 'Universitetda hujjatlar aylanishi va ijro nazoratini avtomatlashtirish tizimi REST API hujjatlari',
    contact: {
      name: 'ShortDoc IT Team',
      email: 'support@shortdoc.uz',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Mahalliy ishlab chiqish serveri',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
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
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Joriy foydalanuvchi ma’lumotlari',
        tags: ['Autentifikatsiya'],
        responses: {
          200: { description: 'Foydalanuvchi profili va ruxsatlari' },
        },
      },
    },
    '/api/documents': {
      get: {
        summary: 'Hujjatlar ro‘yxati (filtrlash va qidiruv)',
        tags: ['Hujjatlar'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'documentType', in: 'query', schema: { type: 'string', enum: ['INCOMING', 'OUTGOING', 'INTERNAL'] } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Hujjatlar ro‘yxati' },
        },
      },
      post: {
        summary: 'Yangi hujjat ro‘yxatga olish / yaratish',
        tags: ['Hujjatlar'],
        responses: {
          201: { description: 'Hujjat yaratildi va noyob raqam berildi' },
        },
      },
    },
    '/api/tasks': {
      get: {
        summary: 'Topshiriqlar ro‘yxati',
        tags: ['Topshiriqlar'],
        responses: { 200: { description: 'Topshiriqlar ro‘yxati' } },
      },
      post: {
        summary: 'Hujjat asosida topshiriq yaratish',
        tags: ['Topshiriqlar'],
        responses: { 201: { description: 'Topshiriq yaratildi' } },
      },
    },
    '/api/reports/dashboard': {
      get: {
        summary: 'Dashboard umumiy statistikasi',
        tags: ['Hisobotlar'],
        responses: { 200: { description: 'Baza statistikasi va ko‘rsatkichlar' } },
      },
    },
  },
};
