const getBaseUrl = (): string => {
  // In the browser, use the same origin as the page so API and SignalR go to this host:port.
  // In Docker, nginx in web-listener proxies /api and /ws to the backend (no CORS).
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const url = import.meta.env.VITE_API_URL;
  if (url) return String(url).replace(/\/$/, '');
  return '';
};

export const getApiUrl = (path: string): string => {
  const base = getBaseUrl();
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const getSignalingUrl = (accessToken: string): string => {
  const base = getBaseUrl();
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/ws/signaling?access_token=${encodeURIComponent(accessToken)}`;
};
