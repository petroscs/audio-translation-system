export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json = atob(padded);
    const payload = JSON.parse(json) as unknown;
    if (payload && typeof payload === 'object') return payload as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export function isAdminToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const roleClaimUri = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
  const roleValue = (payload.role as unknown) ?? (payload[roleClaimUri] as unknown);
  if (typeof roleValue === 'string') return roleValue.toLowerCase() === 'admin';
  if (Array.isArray(roleValue)) return roleValue.some((r) => String(r).toLowerCase() === 'admin');
  return false;
}

