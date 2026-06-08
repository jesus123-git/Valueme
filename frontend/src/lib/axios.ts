/**
 * Instancia de Axios configurada para el backend de MaIA.
 * Compatibilidad con las páginas del módulo empresarial que usan `api.get/post/patch/delete`.
 *
 * Adjunta automáticamente el JWT almacenado en localStorage bajo la clave 'token'.
 * Redirige al login si el servidor responde 401.
 */

import axios from 'axios';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: inyectar JWT ────────────────────────────────────────
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response interceptor: manejar 401 ───────────────────────────────────────
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
