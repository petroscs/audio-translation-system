import { apiRequest } from './client';
import type { Session } from './types';

export async function getSessions(params?: {
  eventId?: string;
  channelId?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  if (params?.eventId) search.set('eventId', params.eventId);
  if (params?.channelId) search.set('channelId', params.channelId);
  if (params?.status) search.set('status', params.status);
  const q = search.toString();
  return apiRequest<Session[]>(`/api/sessions${q ? `?${q}` : ''}`);
}

export async function getSession(id: string) {
  return apiRequest<Session>(`/api/sessions/${id}`);
}

export async function endSession(id: string) {
  return apiRequest<Session>(`/api/sessions/${id}/end`, { method: 'PUT' });
}
