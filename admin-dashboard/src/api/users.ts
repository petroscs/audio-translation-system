import { apiRequest } from './client';
import type { User, CreateUserRequest, UpdateUserRequest } from './types';

export async function getUsers() {
  return apiRequest<User[]>('/api/users');
}

export async function getUser(id: string) {
  return apiRequest<User>(`/api/users/${id}`);
}

export async function createUser(body: CreateUserRequest) {
  return apiRequest<User>('/api/users', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateUser(id: string, body: UpdateUserRequest) {
  return apiRequest<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteUser(id: string) {
  return apiRequest<unknown>(`/api/users/${id}`, { method: 'DELETE' });
}
