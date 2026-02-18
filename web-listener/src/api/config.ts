const getBaseUrl = (): string => {
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
