import axios from 'axios';

const API_URL = 'https://backend-production-f3f5.up.railway.app';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const publicApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    return api.post('/auth/login', formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },
  refresh: () => api.post('/auth/refresh'),
};

export const articlesAPI = {
  getAll: (params) => publicApi.get('/articles', { params }),
  getBySlug: (slug) => publicApi.get(`/articles/${slug}`),
  getByCategory: (slug) => publicApi.get(`/categories/${slug}`),
  create: (data) => api.post('/articles', data),
  createAnonymous: (data) => publicApi.post('/articles/anonymous', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
  search: (query) => publicApi.get('/articles/search', { params: { q: query } }),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  getById: (id) => api.get(`/users/${id}`),
};

export const commentsAPI = {
  getByArticle: (articleId) => publicApi.get(`/articles/${articleId}/comments`),
  create: (articleId, data) => api.post(`/articles/${articleId}/comments`, data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
  like: (id) => api.post(`/comments/${id}/like`),
};

export default api;
