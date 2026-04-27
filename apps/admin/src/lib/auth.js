import api from '../api/client';

export async function register(name, email, password) {
  const data = await api.post('/auth/admin/register', { name, email, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify({ name: data.name, role: data.role }));
  return data;
}

export async function login(email, password) {
  const data = await api.post('/auth/admin/login', { email, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify({ name: data.name, role: data.role }));
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!localStorage.getItem('token');
}
