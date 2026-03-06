import { apiRequest } from './client';
import type { TokenResponse } from './types';

export async function login(usernameOrEmail: string, password: string) {
  return apiRequest<TokenResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail, password }),
  });
}

export async function logout(refreshToken: string) {
  return apiRequest<unknown>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

