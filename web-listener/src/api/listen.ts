import { getApiUrl } from './config';

export interface ActiveBroadcast {
  broadcastSessionId: string;
  eventName: string;
  channelName: string;
}

export type GetActiveBroadcastsResult =
  | { ok: true; broadcasts: ActiveBroadcast[] }
  | { ok: false; error: string };

export async function getActiveBroadcasts(): Promise<GetActiveBroadcastsResult> {
  const url = getApiUrl('/api/listen/broadcasts');
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `API ${res.status}: ${text || res.statusText}` };
    }
    const data = (await res.json()) as Array<{
      broadcastSessionId?: string;
      eventName?: string;
      channelName?: string;
    }>;
    const broadcasts = (Array.isArray(data) ? data : []).map((b) => ({
      broadcastSessionId: String(b?.broadcastSessionId ?? ''),
      eventName: String(b?.eventName ?? ''),
      channelName: String(b?.channelName ?? ''),
    }));
    return { ok: true, broadcasts };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export interface ListenJoinResponse {
  accessToken: string;
  listenerSessionId: string;
  producerId: string;
  eventId: string;
  channelId: string;
  eventName?: string;
  channelName?: string;
}

export async function joinListen(
  broadcastSessionId: string
): Promise<{ data: ListenJoinResponse; ok: true } | { ok: false; status: number; error?: string }> {
  const url = getApiUrl('/api/listen/join');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ broadcastSessionId }),
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
      if (!error) error = res.statusText;
    } catch {
      error = res.statusText;
    }
    return { ok: false, status: res.status, error };
  }

  const data = (await res.json()) as ListenJoinResponse;
  return { data, ok: true };
}

/** End the listener session (e.g. on page unload). Uses the same token from join. */
export async function endListenSession(
  listenerSessionId: string,
  accessToken: string
): Promise<void> {
  const url = getApiUrl(`/api/sessions/${listenerSessionId}/end`);
  await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
}
