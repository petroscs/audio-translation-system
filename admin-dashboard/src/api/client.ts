const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  if (url) return url.replace(/\/$/, '');
  return ''; // relative to same origin (Vite proxy in dev)
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let expiresAt: number | null = null;

export function setTokens(access: string, refresh: string, expiresAtMs: number): void {
  accessToken = access;
  refreshToken = refresh;
  expiresAt = expiresAtMs;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  expiresAt = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

type RefreshCallback = (success: boolean) => void;
const refreshCallbacks: RefreshCallback[] = [];

export function onRefreshComplete(cb: RefreshCallback): () => void {
  refreshCallbacks.push(cb);
  return () => {
    const i = refreshCallbacks.indexOf(cb);
    if (i >= 0) refreshCallbacks.splice(i, 1);
  };
}

async function doRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    refreshCallbacks.forEach((cb) => cb(false));
    return false;
  }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken, new Date(data.expiresAt).getTime());
  refreshCallbacks.forEach((cb) => cb(true));
  return true;
}

async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const opts = { ...init, headers: new Headers(init?.headers) };
  const token = getAccessToken();
  if (token) opts.headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(input, opts);
  if (res.status === 401 && refreshToken) {
    const refreshed = await doRefresh();
    if (refreshed) {
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
  const base = getBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
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
        if (typeof body === 'object' && body !== null) {
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
      }
      if (!error) error = res.statusText;
    } catch {
      error = res.statusText;
    }
    return { ok: false, status: res.status, error };
  }
  if (res.status === 204) return { data: undefined as T, ok: true };
  const data = await res.json();
  return { data, ok: true };
}

export async function apiDownload(path: string): Promise<Blob> {
  const base = getBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.blob();
}

export { getBaseUrl };
