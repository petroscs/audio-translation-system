import { getApiUrl } from './config';
import { clearTokens, getAccessToken, getRefreshToken, loadTokensFromStorage, setTokens } from './tokens';
import type { TokenResponse } from './types';

loadTokensFromStorage();

async function refresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(getApiUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return false;
  }

  const data = (await res.json()) as TokenResponse;
  setTokens(data);
  return true;
}

async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const opts = { ...init, headers: new Headers(init?.headers) };
  const token = getAccessToken();
  if (token) opts.headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(input, opts);
  if (res.status === 401 && getRefreshToken()) {
    const ok = await refresh();
    if (ok) {
      opts.headers.set('Authorization', `Bearer ${getAccessToken()}`);
      res = await fetch(input, opts);
    }
  }
  return res;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; ok: true } | { ok: false; status: number; error?: string }> {
  const url = getApiUrl(path);
  const res = await fetchWithAuth(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let error: string | undefined;
    try {
      const text = await res.text();
      if (text) {
        const body = JSON.parse(text) as Record<string, unknown>;
        error =
          (body.detail as string) ??
          (body.message as string) ??
          (body.title as string) ??
          (body.error as string);
        if (!error && body.errors && typeof body.errors === 'object') {
          const errArr = Object.values(body.errors).flat();
          error = errArr.filter((e): e is string => typeof e === 'string').join(' ');
        }
      }
    } catch {
      // ignore parse errors
    }
    if (!error) error = res.statusText;
    return { ok: false, status: res.status, error };
  }

  if (res.status === 204) return { data: undefined as T, ok: true };
  const data = (await res.json()) as T;
  return { data, ok: true };
}

