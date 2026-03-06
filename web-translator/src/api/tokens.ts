import type { TokenResponse } from './types';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const EXPIRES_AT_KEY = 'expiresAt';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function loadTokensFromStorage(): void {
  accessToken = localStorage.getItem(ACCESS_KEY);
  refreshToken = localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: TokenResponse): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(EXPIRES_AT_KEY, tokens.expiresAt);
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

export function getAccessToken(): string | null {
  return accessToken ?? localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return refreshToken ?? localStorage.getItem(REFRESH_KEY);
}

export function getExpiresAt(): string | null {
  return localStorage.getItem(EXPIRES_AT_KEY);
}

