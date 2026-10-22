// API endpoint resolution:
// 1. If NEXT_PUBLIC_API_URL is set, use it directly (e.g. https://api.shortdoc.samdu.uz)
// 2. Otherwise use relative /api (proxied to backend via Next.js rewrites or Nginx)
export const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return '/api';
};

// In-memory cache for fast UI transitions (e.g., users, departments)
const apiCache = new Map<string, { data: any; expiresAt: number }>();

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.startsWith(prefix)) apiCache.delete(key);
    }
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
  cacheTtlMs: number = 0
): Promise<{ success: boolean; data?: T; message?: string; errors?: any; meta?: any }> {
  const method = (options.method || 'GET').toUpperCase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Invalidate cache on mutations
  if (method !== 'GET') {
    if (cleanEndpoint.startsWith('/users')) clearApiCache('/users');
    if (cleanEndpoint.startsWith('/departments')) clearApiCache('/departments');
    if (cleanEndpoint.startsWith('/documents')) clearApiCache('/documents');
    if (cleanEndpoint.startsWith('/tasks')) clearApiCache('/tasks');
  } else if (cacheTtlMs > 0 && apiCache.has(cleanEndpoint)) {
    const entry = apiCache.get(cleanEndpoint)!;
    if (Date.now() < entry.expiresAt) {
      return entry.data;
    }
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Tokenni localStorage dan olish
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('shortdoc_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      keepalive: true,
    });

    const data = await res.json().catch(() => ({
      success: false,
      message: 'Server javobini o‘qib bo‘lmadi',
    }));

    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('shortdoc_token');
      localStorage.removeItem('shortdoc_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (method === 'GET' && cacheTtlMs > 0 && data.success) {
      apiCache.set(cleanEndpoint, {
        data,
        expiresAt: Date.now() + cacheTtlMs,
      });
    }

    return data;
  } catch (error: any) {
    // Xavfsizlik: Tarmoq xatosida /api proxy orqali qayta yuborish FAQAT GET so'rovlari uchun ruxsat etiladi
    // POST, PATCH, DELETE so'rovlarini qayta yuborish ikki marta bajarilish (duplicate mutation) xavfini keltirib chiqaradi
    if (method === 'GET' && typeof window !== 'undefined' && !url.startsWith('/api')) {
      try {
        const fallbackRes = await fetch(`/api${cleanEndpoint}`, {
          ...options,
          headers,
        });
        return await fallbackRes.json();
      } catch {}
    }

    console.error('Fetch API error:', error);
    return {
      success: false,
      message: error.message || 'Tarmoq xatoligi yoki server bilan aloqa yo‘q',
    };
  }
}
