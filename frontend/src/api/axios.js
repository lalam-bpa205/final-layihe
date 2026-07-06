import axios from 'axios';

export const API_BASE_URL = 'http://localhost:5042/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Hər sorğuya access token əlavə olunur
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 gələndə refresh token ilə bir dəfə yeniləmə cəhdi
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const refreshToken = localStorage.getItem('refreshToken');

    if (
      error.response?.status === 401 &&
      refreshToken &&
      !original._retry &&
      !original.url.includes('/auth/')
    ) {
      original._retry = true;
      try {
        // Paralel 401-lər üçün tək refresh sorğusu
        refreshPromise ??= axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { data } = await refreshPromise;
        refreshPromise = null;

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        refreshPromise = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
