const getConfiguredBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  if (url) return String(url).replace(/\/$/, '');
  return '';
};

export const getApiUrl = (path: string): string => {
  const base = getConfiguredBaseUrl();
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const getSignalingUrl = (accessToken: string): string => {
  const base = getConfiguredBaseUrl();
  const wsBase = (base || window.location.origin).replace(/^http/, 'ws');
  return `${wsBase}/ws/signaling?access_token=${encodeURIComponent(accessToken)}`;
};

export const getListenerBaseUrl = (): string => {
  const override = import.meta.env.VITE_LISTENER_BASE_URL as string | undefined;
  if (override) return String(override).replace(/\/$/, '');
  const host = window.location.hostname || 'localhost';
  // Listener is served on HTTP by default (port 3001).
  return `http://${host}:3001`;
};

